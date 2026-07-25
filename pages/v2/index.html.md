---
title: Firehose 2.0 | Documentation
doc_title: Firehose 2.0 documentation
doc_badge: v2.0.0
doc_status: current
doc_subtitle: WebSocket and SSE streaming for Rails, with database-backed replay.
---

Firehose 2.0 is real-time streaming for Rails over a **dedicated PostgreSQL
`LISTEN`/`NOTIFY` connection**, no ActionCable, no Redis, no polling, no extra
processes. Every message is persisted in Postgres with a per-stream monotonic
sequence and a global auto-incrementing id, so a client that reconnects replays
exactly what it missed (via `last_event_id`) instead of silently losing events.
Two transports, **WebSocket** and **Server-Sent Events**, share one API, and a
drop-in `<firehose-stream-source>` custom element handles subscribe, reconnect,
and replay in the browser automatically.

# Key features

- **Dual transports, one API**: WebSocket and Server-Sent Events, selectable per controller (`include Firehose::Stream`, or just `Firehose::WebSocket` / `Firehose::SSE`).
- **Database-backed persistence & replay**: every message is a real row in Postgres; on reconnect the client replays all messages with `id > last_event_id`, in order.
- **Dedicated PG LISTEN/NOTIFY connection**: real-time fan-out runs on its own connection outside the ActiveRecord pool, so it adds no pool pressure and works with a direct, PgBouncer-safe connection.
- **No Redis**: persistence, ordering, and fan-out all run on PostgreSQL alone.
- **Automatic browser client**: the custom element opens the socket, tracks `last_event_id`, and reconnects with exponential backoff.
- **Gap detection**: per-stream monotonic sequences plus a `replay_gap` error event when a client's cursor is older than the retained window, so your app can decide how to recover.
- **Inline delivery with DB fallback**: payloads within the NOTIFY size limit ship inline (no DB round-trip); oversized payloads drop the body on the wire and the client re-fetches the row by id.
- **Auto-cleanup, metrics, and self-healing**: a configurable per-stream retention threshold, an optional `Firehose.on_metrics` hook, and a watchdog that force-reconnects a stalled consumer.

# Requirements

- **Ruby ≥ 3.2.0**
- **Rails 8.1+.** The gemspec declares `rails >= 7.0`, but the shipped migration is declared `ActiveRecord::Migration[8.1]` and requires Rails 8.1 or newer to run. Treat **Rails 8.1+** as the supported floor.
- **PostgreSQL.** The whole system is built on PG `LISTEN`/`NOTIFY`, it is mandatory, and there is no Redis or alternative backend.

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
- runs `db:migrate`, the engine auto-registers the migration that creates the `firehose_channels` and `firehose_messages` tables.

Using an AI coding agent? Point it at [firehose.io/install.txt](https://firehose.io/install.txt) (or drop that file into your repo) and it will run these steps for you.

> **Note on the gem name.** The gem is named `firehose` and reports version
> `2.0.0` (`Firehose::VERSION`). This name is shared with the unrelated legacy
> 1.x gem. 2.0 is a full rewrite under the same top-level `Firehose` module and
> is **not** compatible with it. See [Migrating from Firehose 1.x](#migrating-from-firehose-1-x).

# Publishing messages

Publish from anywhere in your app, a model callback, a background job, a
controller:

```ruby
Firehose.channel("dashboard").publish("refresh")
Firehose.channel("dashboard").publish({ action: "update", id: 42 }.to_json)
```

Message data is coerced with `.to_s` and stored as **text**. Pass a `String`;
JSON-encode structured payloads yourself.

# Consuming in the browser

## WebSocket: the `<firehose-stream-source>` element

The declarative path. Drop the custom element on the page, point it at your
Firehose endpoint, and list the streams to subscribe to:

```html
<firehose-stream-source path="/firehose" streams="dashboard,user:42"></firehose-stream-source>
```

The element opens the WebSocket, tracks `last_event_id`, and reconnects with
exponential backoff, replaying anything it missed while disconnected. Each
message also dispatches a DOM `CustomEvent` named `firehose:message` on
`document`, so you can react in JavaScript:

```js
document.addEventListener("firehose:message", (e) => {
  const { id, channel_id, sequence, stream, data, path } = e.detail
  console.log(stream, data)
})
```

Publish `"refresh"` as the data and the client runs a Turbo refresh (or
`location.reload()` when Turbo isn't present), updating the page without any
custom JavaScript.

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

  before_action :authenticate_user!    # optional, standard Rails auth applies

  # Optional, filter which streams a connection may subscribe to.
  def authorize_streams(streams)
    streams.select { |s| current_user.can_access?(s) }
  end

  # Optional, transform an outgoing event, or return nil to skip it.
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

Configuration lives on the **server instance**, reachable as `Firehose.server`,
there is no module-level `Firehose.configure`. The server exposes three methods:

```ruby
# Block form: yields the server instance
Firehose.server.configure do |config|
  config.cleanup_threshold = 500
  config.notify_pool_size  = 8
end

# From a hash: sets each accessor by name (an unknown key raises NoMethodError)
Firehose.server.configure_from_hash(cleanup_threshold: 500, replay_on_reconnect: false)

# From YAML: loads the section for the current Rails env, then applies it
Firehose.server.configure_from_yaml(Rails.root.join("config/firehose.yml"))
```

At boot the engine loads **`config/firehose.rb`** if it exists (arbitrary Ruby,
put your `Firehose.server.configure { ... }` there), otherwise it applies
**`config/firehose.yml`** via `configure_from_yaml`, then starts the server. If
both files exist, only the `.rb` runs. `configure_from_yaml` reads the section
for the current `Rails.env` (a missing section is not an error) and supports YAML
anchors/aliases.

Every key below is an `attr_accessor` on `Firehose::Server`; defaults are from
`Server#initialize`.

## Connection

- **`database_url`** (default `nil`): Postgres URL for the dedicated LISTEN/NOTIFY connection. When `nil`, Firehose connects using the app's own ActiveRecord config, the **same database**, on a separate connection outside the AR pool. When set, `PG.connect` uses this URL (with TCP keepalive params appended).
- **`tcp_keepalives_idle`** (default `30`): seconds of idle before the OS sends the first TCP keepalive probe.
- **`tcp_keepalives_interval`** (default `10`): seconds between keepalive probes.
- **`tcp_keepalives_count`** (default `3`): failed probes before the socket is considered dead. Keepalives are always on; these three tune how fast a half-open connection surfaces as an error (~60s with the defaults).

## Reconnection

Tunes recovery when the dedicated PG connection is lost.

- **`reconnect_attempts`** (default `nil`, unlimited): max reconnect attempts before giving up; `nil` retries forever, otherwise the supervisor raises after exceeding it.
- **`reconnect_delay`** (default `1`): base backoff in seconds. The delay grows exponentially: `reconnect_delay * 2 ** (reconnects - 1)`.
- **`reconnect_max_delay`** (default `30`): upper cap in seconds on the exponential backoff.
- **`replay_on_reconnect`** (default `true`): after a **PG reconnect**, whether the server replays messages missed during the outage to in-process subscribers (per channel, `id >` the last-seen cursor, capped at 1000). This is server-side PG-outage replay only; it's independent of the browser client's own reconnect replay via `last_event_id` / `Last-Event-ID`, which always happens regardless.

## Persistence, retention & replay window

- **`cleanup_threshold`** (default `100`): the retention bound. Firehose keeps roughly the **newest N messages per stream**. After a broadcast, if a channel's `messages_count` exceeds this, a `CleanupJob` deletes everything older than the Nth-newest message (and destroys the channel if it empties). This directly bounds the replay window; a client whose cursor is older than the oldest retained message gets a `replay_gap` error instead of replay.
- **`notify_max_bytes`** (default `7999`, the `NOTIFY_MAX_BYTES` constant): byte ceiling for inline delivery. In `broadcast`, an event larger than this is sent without its `data` field and the client re-fetches the row by `id`; a direct `notify(channel, payload)` call above the limit raises `Firehose::Server::PayloadTooLarge`. (7999 is PostgreSQL's payload maximum minus the null terminator, the "8 KB" you may see quoted is approximate.)

## NOTIFY dispatch & backpressure

- **`notify_pool_size`** (default `4`): number of NOTIFY worker threads (each with its own PG connection) that dispatch NOTIFYs off the listener connection. **`0` runs NOTIFYs inline** on the consumer thread (no pool). Ordering across the pool is not preserved; consumers rely on `id` / `sequence`.
- **`max_command_queue_depth`** (default `nil`, unbounded): backpressure cap on the internal command queue. When the queue is at or over the cap, new `:notify` commands are **dropped** (counted as `commands_dropped`); `:listen` / `:unlisten` / `:shutdown` are never dropped. Dropped messages are already persisted, so clients recover them via replay.

## Self-healing watchdog

A supervised thread that force-reconnects the PG connection if the consumer thread stops heart-beating.

- **`watchdog_enabled`** (default `true`): whether the watchdog thread runs at all.
- **`watchdog_deadline`** (default `60`): seconds without a heartbeat before the watchdog triggers a force-reconnect.
- **`watchdog_interval`** (default `10`): seconds between watchdog checks.

## Metrics and the `on_metrics` hook

- **`metrics_interval`** (default `15`): seconds between periodic `Firehose.on_metrics` emissions. Only matters when `Firehose.on_metrics` is set.

`Firehose.on_metrics` is set on the **`Firehose` module** (not the server), via
`Firehose.on_metrics=`, and is `nil` by default (emission disabled). It's called
once every `metrics_interval` seconds with **one argument, a flat metrics hash**
(the return value of `Server#metrics_snapshot`):

```ruby
Firehose.on_metrics = ->(metrics) do
  metrics.each { |key, value| StatsD.gauge("firehose.#{key}", value) }
end
```

Exceptions raised by the block are logged at `warn` and swallowed, so a throwing
reporter never crashes the emitter. The snapshot hash contains:

- **Gauges:** `command_queue_depth`, `subscribed_channels`, `seconds_since_heartbeat`, `thread_alive` (`1`/`0`), `watchdog_alive` (`1`/`0`), `reconnects_current`.
- **Counters:** `broadcasts_total`, `notifies_received`, `notify_failures`, `reconnects_total`, `watchdog_kicks`, `commands_dropped`, `replay_messages_delivered`.

## Sample `config/firehose.yml`

Keyed by Rails environment; keys match the accessor names above, and YAML
anchors/aliases are supported.

```yaml
default: &default
  cleanup_threshold: 100      # keep ~100 messages/stream (bounds replay window)
  notify_pool_size: 4         # NOTIFY worker threads (0 = inline)
  replay_on_reconnect: true
  watchdog_enabled: true
  watchdog_deadline: 60
  reconnect_max_delay: 30

development:
  <<: *default

production:
  <<: *default
  cleanup_threshold: 1000     # keep more history for replay
  notify_pool_size: 8
  max_command_queue_depth: 50000
  # database_url: "postgres://user:pass@db-host:5432/app_production"
```

The equivalent `config/firehose.rb` (which takes precedence over the YAML):

```ruby
Firehose.server.configure do |config|
  config.cleanup_threshold       = 1000
  config.notify_pool_size        = 8
  config.max_command_queue_depth = 50_000
end
```

# How it works

A few internals worth knowing:

- **Storage.** Messages are rows in `firehose_messages`, grouped by channel in `firehose_channels`. Each message has a per-stream monotonic `sequence` and a global auto-incrementing `id`; replay is "everything with `id > last_event_id`."
- **Fan-out.** Real-time delivery uses PostgreSQL `LISTEN`/`NOTIFY` on a dedicated connection, separate from the ActiveRecord pool. Streams are namespaced on the wire, the NOTIFY channel is `"firehose:#{stream}"`, and long names are hashed to fit PostgreSQL's identifier limit (so the raw channel isn't simply the bare stream name).
- **Payload size.** The NOTIFY payload limit is **7999 bytes** (`NOTIFY_MAX_BYTES`). Messages within it are delivered inline with no extra database round-trip; larger messages are sent without their `data`, and the client re-fetches the row by id.
- **Gap recovery.** If a reconnecting client's cursor is older than the retained window, Firehose emits a `replay_gap` error event instead of pretending nothing was lost, letting the app choose how to recover.

# Optional: Phlex helper

If [Phlex](https://www.phlex.fun/) is present, `Firehose::Helper` provides
`firehose_stream_from` for rendering the stream source from a Phlex view. It only
loads when Phlex is defined, so it isn't available in a plain ERB-only app.

<a id="migrating-from-firehose-1-x"></a>

# Migrating from Firehose 1.x

Firehose 2.0 is a **complete rewrite and is not compatible with Firehose 1.x.**
There is no shared API and no in-place upgrade path, any v1 code, config, or
Redis assumptions must be rewritten. What changed:

- **Storage:** messages now persist in **PostgreSQL** (`firehose_channels` / `firehose_messages`) instead of Redis.
- **Transport / fan-out:** a **dedicated PG LISTEN/NOTIFY connection** replaces ActionCable / Redis pub-sub. Redis is no longer a dependency.
- **Model:** no channel-class abstractions, just **named streams and string data**, published with `Firehose.channel(name).publish(data)`.
- **Replay is new:** clients track `last_event_id` (WebSocket) / `Last-Event-ID` (SSE) and replay missed messages on reconnect. v1 had no replay.
- **Runtime:** built for async Ruby, Falcon / `async-websocket` compatible.

The old release's documentation remains available, clearly marked, at
[**v1 (legacy)**](/v1/).

# API reference

The public surface in 2.0.0:

- `Firehose`: top-level entry point; `Firehose.channel(name)`, `Firehose.server`, `Firehose.on_metrics=`.
- `Firehose::Channel`: a named stream; `#publish(data)`.
- `Firehose::Stream`: controller mixin enabling **both** transports.
- `Firehose::WebSocket` / `Firehose::SSE`: controller mixins for a single transport.
- `Firehose::Streamable`: shared streaming behavior.
- `Firehose::Queue`: ephemeral push/pop queue (not persisted like channels).
- `Firehose::Server`: the streaming server; holds all configuration (`Firehose.server.configure`).
- `Firehose::Models::Channel` / `Firehose::Models::Message`: the ActiveRecord models behind `firehose_channels` / `firehose_messages`.
- `Firehose::Helper`: optional Phlex view helper (`firehose_stream_from`).

Controller callbacks: `authorize_streams(streams)`, `build_event(event)`.
