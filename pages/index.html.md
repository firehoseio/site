---
title: Firehose | Real-time streaming for Rails on PostgreSQL
hero: home
---

Firehose 2.0 is **real-time streaming for Rails** over a dedicated PostgreSQL
`LISTEN`/`NOTIFY` connection. It ships **WebSocket and Server-Sent Events**
behind one API, and it **persists every message in Postgres** so a client that
reconnects replays exactly what it missed. No ActionCable, no Redis, no polling,
no extra processes.

# Why Firehose 2.0?

ActionCable and Redis pub/sub are **fire-and-forget**: reconnect and you've lost
whatever flew by while you were gone. Firehose persists every message as a real
row in Postgres with a per-stream monotonic sequence and a global
auto-incrementing id — so on reconnect the client replays the gap (via
`last_event_id`) instead of silently dropping events. It uses infrastructure you
already run.

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

A message whose data is the magic value `"refresh"` triggers a Turbo refresh (or
`location.reload()`) — the zero-JavaScript "just re-render the page" path.

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

# Talks

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
