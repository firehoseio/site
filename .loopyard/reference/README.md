# Loopyard dev-environment reference

These files describe how to run the Firehose.io site as a Docker Compose
service. They live in `reference/` (not the active `workspace/` path) on
purpose — see "Why this isn't active" below.

## Stack

- **Ruby 3.1** + [Sitepress](https://sitepress.cc) static-site generator
- **Tailwind CSS** via the standalone CLI (`bin/tailwindcss`, no Node needed)
- **No database, no Redis** — it's a static marketing site
- Serves on **:8080** (`sitepress server -a 0.0.0.0`)

## How it runs today

The site runs **directly in the Loopyard work container** via the Procfile
`web:` process. `http://localhost:8080/` inside the container returns 200, and
Loopyard forwards its public port to it. Nothing else is required to develop.

## Activating the compose stack

Do this from a session where the `loopyard-container` MCP tools are available
(this reference was written in a session where they were offline):

```sh
cp .loopyard/reference/Dockerfile        .loopyard/workspace/Dockerfile
cp .loopyard/reference/docker-compose.yml .loopyard/workspace/docker-compose.yml
```

Then bring it up with the **`docker_compose`** MCP tool (never `docker compose`
via `exec`) and confirm with **`probe_http`** / `service_containers`.

## Why this isn't active

A `web` compose service was previously placed in `.loopyard/workspace/` and it
**broke the public port forwarding** (`:no_docker_port`): Loopyard reconciled
the compose file and forwarded the public port to a service that was never
brought up, so the port pointed at a dead target. Removing it restored the
working in-container server.

Because a compose file in `.loopyard/workspace/` that has **not** been brought
up re-creates that failure, these files stay in `reference/` until someone can
actually run `docker_compose up` (host daemon, via the MCP tool) in the same
step. Activating and bringing up must happen together.
