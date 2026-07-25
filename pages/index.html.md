---
title: Firehose | Real-time streaming for Rails on PostgreSQL
hero: home
---

Firehose 2.0 is **real-time streaming for Rails** over a dedicated PostgreSQL
`LISTEN`/`NOTIFY` connection. It ships **WebSocket and Server-Sent Events**
behind one API, and it **persists every message in Postgres**, so a client that
reconnects replays exactly what it missed. No ActionCable, no Redis, no polling.

# Why Firehose 2.0?

Action Cable is fire-and-forget. When a client's connection drops, and on mobile
it drops constantly, every message you broadcast while it was gone is lost. The
user comes back to a stale dashboard, a notification that never arrived, a chat
with a hole in it. Action Cable keeps no record of what it sent, so it can't
catch the client back up.

Firehose fixes that. It stores every message in Postgres with a per-stream
sequence and a global id. When a client reconnects it sends the id of the last
message it saw, and Firehose replays everything after it, in order. Nothing is
lost across a reconnect.

The usual alternatives keep the fire-and-forget model and add infrastructure
instead. AnyCable makes Action Cable much faster, but it's another service to
run and deploy next to Rails, or a managed cloud service if you'd rather not
operate it. Solid Cable drops the Redis dependency by storing messages in your
database, but it polls that database on a fixed interval to find them, which
trades latency for query load, and because it's still Action Cable it never
replays what a client missed.

Firehose takes the other path. It runs on the Postgres you already operate, over
a dedicated LISTEN/NOTIFY connection, so delivery is push instead of polling and
there's nothing new to deploy. Messages are persisted and replayable, not just
relayed. It's the streaming half of a Postgres-native stack, the same idea as
GoodJob, which leans on Postgres LISTEN/NOTIFY to run background jobs without a
separate queue service.

- **Dual transports, one API.** WebSocket and SSE, selectable per controller.
- **Database-backed persistence and replay.** Every message is a row; reconnecting clients replay everything with `id > last_event_id`, in order.
- **Dedicated PG LISTEN/NOTIFY connection.** Fan-out runs on its own connection, outside the ActiveRecord pool.
- **No Redis.** Persistence, ordering, and fan-out all run on PostgreSQL alone.
- **Automatic browser client.** A drop-in `<firehose-stream-source>` custom element subscribes, tracks the cursor, and reconnects with exponential backoff.

# Publish from anywhere

Publishing is one call, made from a model callback, a background job, or a
controller:

```ruby
Firehose.channel("dashboard").publish("refresh")
Firehose.channel("dashboard").publish({ action: "update", id: 42 }.to_json)
```

Data is stored as text, so pass a `String` and JSON-encode structured payloads
yourself.

# Consume in the browser

Drop the custom element on the page. It opens the socket, tracks
`last_event_id`, and reconnects and replays automatically:

```html
<firehose-stream-source path="/firehose" streams="dashboard,user:42"></firehose-stream-source>
```

Publish `"refresh"` as the data and the client runs a Turbo refresh (or
`location.reload()`), updating the page without any custom JavaScript.

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
mandatory, and there is no other backend).

Read the full [Firehose 2.0 documentation &rarr;](/v2/) for the controller
callbacks, configuration, SSE, and how replay works.

# Upgrading from Firehose 1.x

Firehose 2.0 is a **complete rewrite, and it is not compatible with Firehose
1.x**. The storage is different (Postgres, not Redis), so is the transport, and
so is the API. There is no shared upgrade path. If you're running the old release, the
[**v1 (legacy) documentation**](/v1/) is still here, and the
[migration notes](/v2/#migrating-from-firehose-1-x) explain what changed.

# Who's using Firehose

<div class="not-prose mt-8 grid max-w-xl grid-cols-2 divide-x divide-stone-200 rounded-2xl border border-stone-200">
  <a href="https://www.polleverywhere.com" class="flex flex-col items-center justify-center gap-5 px-6 py-10 no-underline transition-colors hover:bg-stone-50">
    <img src="/images/poll-everywhere.svg" alt="Poll Everywhere" class="h-8 w-auto grayscale opacity-75">
    <span class="text-xs font-semibold uppercase tracking-widest text-ink-mute">Created at</span>
  </a>
  <a href="https://opengraphplus.com" class="flex flex-col items-center justify-center gap-5 px-6 py-10 no-underline transition-colors hover:bg-stone-50">
    <span class="text-[1.4rem] font-bold leading-none tracking-tight text-ink-mute">OpenGraph+</span>
    <span class="text-xs font-semibold uppercase tracking-widest text-ink-mute">In production</span>
  </a>
</div>

# Talks

* [SF Ruby 2026 "Building OpenGraph+ with Rails on Falcon"](https://beautifulruby.com/presentations/falcon). Building a SaaS on Falcon, Firehose, and GoodJob, all on Postgres without Redis.
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
