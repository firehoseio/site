---
title: Firehose | Real-time streaming for Rails on PostgreSQL
hero: home
---

Firehose 2.0 is **real-time streaming for Rails** over a dedicated PostgreSQL
`LISTEN`/`NOTIFY` connection. It ships **WebSocket and Server-Sent Events**
behind one API, and it **persists every message in Postgres**, so a client that
reconnects replays exactly what it missed — no ActionCable, no Redis, no polling.

# Why Firehose 2.0?

ActionCable and Redis pub/sub are **fire-and-forget**: reconnect, and the
messages you missed are gone. Firehose stores every message as a row in Postgres
with a per-stream sequence and a global id, so on reconnect the client replays
what it missed (via `last_event_id`) instead of dropping it — on infrastructure
you already run.

- **Dual transports, one API** — WebSocket and SSE, selectable per controller.
- **Database-backed persistence & replay** — every message is a row; reconnecting clients replay everything with `id > last_event_id`, in order.
- **Dedicated PG LISTEN/NOTIFY connection** — fan-out runs on its own connection, outside the ActiveRecord pool.
- **No Redis** — persistence, ordering, and fan-out all run on PostgreSQL alone.
- **Automatic browser client** — a drop-in `<firehose-stream-source>` custom element subscribes, tracks the cursor, and reconnects with exponential backoff.

# Publish from anywhere

Publishing is a single call from anywhere in your app — a model callback, a job,
a controller:

```ruby
Firehose.channel("dashboard").publish("refresh")
Firehose.channel("dashboard").publish({ action: "update", id: 42 }.to_json)
```

Data is stored as text — pass a `String` and JSON-encode structured payloads
yourself.

# Consume in the browser

Drop the custom element on the page. It opens the socket, tracks
`last_event_id`, and reconnects and replays automatically:

```html
<firehose-stream-source path="/firehose" streams="dashboard,user:42"></firehose-stream-source>
```

Publish `"refresh"` as the data and the client runs a Turbo refresh (or
`location.reload()`) — updating the page without any custom JavaScript.

# Getting Started

Add the gem and run the installer:

```ruby
# Gemfile
gem "firehose"
```

```bash
bundle install
bin/rails generate firehose:install
```

The generator creates a `FirehoseController`, adds the WebSocket and SSE routes,
pins the JavaScript client, and runs the migration.

**Requirements:** Ruby ≥ 3.2, Rails 8.1+, and PostgreSQL (LISTEN/NOTIFY is
mandatory — there is no other backend).

Read the full [Firehose 2.0 documentation &rarr;](/v2/) for the controller
callbacks, configuration, SSE, and how replay works.

# Upgrading from Firehose 1.x

Firehose 2.0 is a **complete rewrite and is not compatible with Firehose 1.x** —
different storage (Postgres, not Redis), different transport, and a different
API. There is no shared upgrade path. If you're running the old release, the
[**v1 (legacy) documentation**](/v1/) is still here, and the
[migration notes](/v2/#migrating-from-firehose-1-x) explain what changed.

# Who's using Firehose

In production at:

<div class="not-prose my-6">
  <a href="https://opengraphplus.com" class="group inline-flex max-w-md items-center gap-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-lg">
    <span class="whitespace-nowrap text-2xl font-extrabold tracking-tight text-ink">OpenGraph+</span>
    <span class="text-sm leading-relaxed text-ink-mute">Automatic Open&nbsp;Graph preview images for every page &mdash; built on Falcon, Firehose &amp; Postgres, no Redis.</span>
  </a>
</div>

# Talks

* [SF Ruby 2026 "Building OpenGraph+ with Rails on Falcon"](https://beautifulruby.com/presentations/falcon) — building a SaaS on Falcon, Firehose, and GoodJob, all on Postgres without Redis.
* [RailsConf 2012 "Streaming REST" slides](/pdfs/firehose.pdf)

# Contributors

These fine folks at [Poll Everywhere](https://www.polleverywhere.com/) worked tirelessly to bring you Firehose.io.

* [Brad Gessler](https://twitter.com/bradgessler)
* [Steel Fu](https://twitter.com/steelfu)
* Paul Cortens
* [Zach Zolton](https://twitter.com/zdzolton)
* [Christopher Bertels](https://twitter.com/bakkdoor)

# Source Code

Fork it on [Github](https://github.com/firehoseio/firehose)

# Mailing List

Discuss all things Firehose at on the [mailing list](https://groups.google.com/d/forum/firehoseio)
