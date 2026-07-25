---
title: Firehose 2.0 | Documentation
doc_title: Firehose 2.0 documentation
doc_badge: v2.0.0
doc_status: current
doc_subtitle: WebSocket and SSE streaming for Rails, with database-backed replay.
---

Firehose 2.0 is real-time streaming for Rails over a **dedicated PostgreSQL
`LISTEN`/`NOTIFY` connection** — no ActionCable, no Redis, no polling, no extra
processes. Every message is persisted in Postgres with a per-stream monotonic
sequence and a global auto-incrementing id, so a client that reconnects replays
exactly what it missed (via `last_event_id`) instead of silently losing events.
Two transports — **WebSocket** and **Server-Sent Events** — share one API, and a
drop-in `<firehose-stream-source>` custom element handles subscribe, reconnect,
and replay in the browser automatically.

# Key features

- **Dual transports, one API** — WebSocket and Server-Sent Events, selectable per controller (`include Firehose::Stream`, or just `Firehose::WebSocket` / `Firehose::SSE`).
- **Database-backed persistence & replay** — every message is a real row in Postgres; on reconnect the client replays all messages with `id > last_event_id`, in order.
- **Dedicated PG LISTEN/NOTIFY connection** — real-time fan-out runs on its own connection outside the ActiveRecord pool, so it adds no pool pressure and works with a direct, PgBouncer-safe connection.
- **No Redis** — persistence, ordering, and fan-out all run on PostgreSQL alone.
- **Automatic browser client** — the custom element opens the socket, tracks `last_event_id`, and reconnects with exponential backoff.
- **Gap detection** — per-stream monotonic sequences plus a `replay_gap` error event when a client's cursor is older than the retained window, so your app can decide how to recover.
- **Inline delivery with DB fallback** — payloads within the NOTIFY size limit ship inline (no DB round-trip); oversized payloads drop the body on the wire and the client re-fetches the row by id.
- **Auto-cleanup, metrics, and self-healing** — a configurable per-stream retention threshold, an optional `Firehose.on_metrics` hook, and a watchdog that force-reconnects a stalled consumer.

# Requirements

- **Ruby ≥ 3.2.0**
- **Rails 8.1+.** The gemspec declares `rails >= 7.0`, but the shipped migration is declared `ActiveRecord::Migration[8.1]` and requires Rails 8.1 or newer to run. Treat **Rails 8.1+** as the supported floor.
- **PostgreSQL.** The whole system is built on PG `LISTEN`/`NOTIFY` — it is mandatory, and there is no Redis or alternative backend.

Runtime gem dependencies: `rails`, `pg`, `async-websocket`. Firehose is built for
async Ruby and is compatible with **Falcon** / `async-websocket`.

# Installation

Add the gem:

```ruby
# Gemfile
gem "firehose"
```

Install and run the generator:

```bash
bundle install
bin/rails generate firehose:install
```

The `firehose:install` generator:

- creates `app/controllers/firehose_controller.rb`,
- adds the WebSocket and SSE routes,
- appends `import "firehose"` to `app/javascript/application.js` (and pins the client via importmap),
- runs `db:migrate` — the engine auto-registers the migration that creates the `firehose_channels` and `firehose_messages` tables.

<!-- TODO(repo-url): the 2.0.0 gemspec `homepage` points at github.com/opengraphplus/firehose,
     which differs from the firehoseio/next origin this build was cloned from. The canonical
     public repo/URL for 2.0 needs to be confirmed with the maintainer before linking it here. -->

> **Note on the gem name.** The gem is named `firehose` and reports version
> `2.0.0` (`Firehose::VERSION`). This name is shared with the unrelated legacy
> 1.x gem — 2.0 is a full rewrite under the same top-level `Firehose` module and
> is **not** compatible with it. See [Migrating from Firehose 1.x](#migrating-from-firehose-1-x).

# Publishing messages

Publish from anywhere in your app — a model callback, a background job, a
controller:

```ruby
Firehose.channel("dashboard").publish("refresh")
Firehose.channel("dashboard").publish({ action: "update", id: 42 }.to_json)
```

Message data is coerced with `.to_s` and stored as **text**. Pass a `String`;
JSON-encode structured payloads yourself.

# Consuming in the browser

## WebSocket — the `<firehose-stream-source>` element

The declarative path. Drop the custom element on the page, point it at your
Firehose endpoint, and list the streams to subscribe to:

```html
<firehose-stream-source path="/firehose" streams="dashboard,user:42"></firehose-stream-source>
```

The element opens the WebSocket, tracks `last_event_id`, and reconnects with
exponential backoff — replaying anything it missed while disconnected. Each
message also dispatches a DOM `CustomEvent` named `firehose:message` on
`document`, so you can react in JavaScript:

```js
document.addEventListener("firehose:message", (e) => {
  const { id, channel_id, sequence, stream, data, path } = e.detail
  console.log(stream, data)
})
```

A message whose `data` is the magic value `"refresh"` triggers a Turbo refresh
(or `location.reload()` when Turbo isn't present) — the zero-JavaScript "just
re-render the page" path.

## Server-Sent Events

The same streams are available over SSE for one-way delivery, using the browser's
native `EventSource`:

```js
const source = new EventSource("/firehose/sse?streams=dashboard,user:42")
source.addEventListener("dashboard", (e) => {
  const { data, channel_id, sequence } = JSON.parse(e.data)
  console.log(data)
})
```

The **event name is the stream name**, and each SSE data frame is JSON:
`{ data, channel_id, sequence }`. `EventSource` sends the `Last-Event-ID` header
on reconnect, and Firehose replays the gap just like the WebSocket transport.

# The Firehose controller

The generator writes a controller that exposes both endpoints. Include
`Firehose::Stream` for both transports, or `Firehose::WebSocket` /
`Firehose::SSE` for just one:

```ruby
class FirehoseController < ApplicationController
  include Firehose::Stream            # or: include Firehose::WebSocket / Firehose::SSE

  before_action :authenticate_user!    # optional — standard Rails auth applies

  # Optional — filter which streams a connection may subscribe to.
  def authorize_streams(streams)
    streams.select { |s| current_user.can_access?(s) }
  end

  # Optional — transform an outgoing event, or return nil to skip it.
  # event is a hash: { id:, channel_id:, sequence:, stream:, data: }
  def build_event(event)
    event
  end
end
```

The generator adds these routes:

```ruby
match "firehose",     to: "firehose#websocket", via: [:get, :connect]
get   "firehose/sse", to: "firehose#sse"
```

# Configuration

Server configuration is applied through `Firehose.configure`, or loaded from a
file or hash with `Firehose.configure_from_yaml` / `Firehose.configure_from_hash`.
Configurable behavior includes:

- **Per-stream retention threshold** — how many messages are retained per stream before older rows are cleaned up (this window is what bounds replay; a cursor older than it triggers `replay_gap`).
- **Metrics** — set `Firehose.on_metrics` to receive runtime metrics.
- **Self-healing watchdog** — force-reconnects a consumer whose stream has stalled.

<!-- TODO(config-keys): the digest names configure / configure_from_yaml /
     configure_from_hash, the retention threshold, Firehose.on_metrics, and the
     watchdog, but does NOT give exact option keys, default values, the
     on_metrics block signature, or a sample YAML. Fill these in from the 2.0.0
     source/README before publishing rather than guessing. -->

> **TODO:** exact configuration keys, defaults, the `on_metrics` block signature,
> and a sample YAML are not covered by the current source digest and need to be
> filled in from the 2.0.0 codebase before this section is complete.

# How it works

A few internals worth knowing:

- **Storage.** Messages are rows in `firehose_messages`, grouped by channel in `firehose_channels`. Each message has a per-stream monotonic `sequence` and a global auto-incrementing `id`; replay is "everything with `id > last_event_id`."
- **Fan-out.** Real-time delivery uses PostgreSQL `LISTEN`/`NOTIFY` on a dedicated connection, separate from the ActiveRecord pool. Streams are namespaced on the wire — the NOTIFY channel is `"firehose:#{stream}"`, and long names are hashed to fit PostgreSQL's identifier limit (so the raw channel isn't simply the bare stream name).
- **Payload size.** The NOTIFY payload limit is **7999 bytes** (`NOTIFY_MAX_BYTES`). Messages within it are delivered inline with no extra database round-trip; larger messages are sent without their `data`, and the client re-fetches the row by id.
- **Gap recovery.** If a reconnecting client's cursor is older than the retained window, Firehose emits a `replay_gap` error event instead of pretending nothing was lost, letting the app choose how to recover.

# Optional: Phlex helper

If [Phlex](https://www.phlex.fun/) is present, `Firehose::Helper` provides
`firehose_stream_from` for rendering the stream source from a Phlex view. It only
loads when Phlex is defined, so it isn't available in a plain ERB-only app.

<a id="migrating-from-firehose-1-x"></a>

# Migrating from Firehose 1.x

Firehose 2.0 is a **complete rewrite and is not compatible with Firehose 1.x.**
There is no shared API and no in-place upgrade path — any v1 code, config, or
Redis assumptions must be rewritten. What changed:

- **Storage:** messages now persist in **PostgreSQL** (`firehose_channels` / `firehose_messages`) instead of Redis.
- **Transport / fan-out:** a **dedicated PG LISTEN/NOTIFY connection** replaces ActionCable / Redis pub-sub. Redis is no longer a dependency.
- **Model:** no channel-class abstractions — just **named streams and string data**, published with `Firehose.channel(name).publish(data)`.
- **Replay is new:** clients track `last_event_id` (WebSocket) / `Last-Event-ID` (SSE) and replay missed messages on reconnect. v1 had no replay.
- **Runtime:** built for async Ruby — Falcon / `async-websocket` compatible.

The old release's documentation remains available, clearly marked, at
[**v1 (legacy)**](/v1/).

# API reference

The public surface in 2.0.0:

- `Firehose` — top-level entry point; `Firehose.channel(name)`, `Firehose.configure`, `Firehose.on_metrics`.
- `Firehose::Channel` — a named stream; `#publish(data)`.
- `Firehose::Stream` — controller mixin enabling **both** transports.
- `Firehose::WebSocket` / `Firehose::SSE` — controller mixins for a single transport.
- `Firehose::Streamable` — shared streaming behavior.
- `Firehose::Queue` — ephemeral push/pop queue (not persisted like channels).
- `Firehose::Server` — the streaming server.
- `Firehose::Models::Channel` / `Firehose::Models::Message` — the ActiveRecord models behind `firehose_channels` / `firehose_messages`.
- `Firehose::Helper` — optional Phlex view helper (`firehose_stream_from`).

Controller callbacks: `authorize_streams(streams)`, `build_event(event)`.
