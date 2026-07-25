# Firehose.io Website

This is the public website at http://firehose.io/

It is built with [Sitepress](https://sitepress.cc), a Ruby/Rails static-site
generator. Content lives in `pages/`, the layout in `layouts/`, and
images/stylesheets/scripts in `assets/`.

Styling uses [Tailwind CSS](https://tailwindcss.com) (with the Typography
plugin for the Markdown content). The Tailwind input lives in
`assets/tailwind/application.css`, the config in `tailwind.config.js`, and the
compiled stylesheet is written to `assets/stylesheets/tailwind.css` (committed,
so the site serves without a build step). `bin/tailwindcss` downloads the
standalone Tailwind CLI on demand — no Node/npm install required.

## Getting started

Install dependencies:

```sh
$ bundle
```

Start the preview server (and, in another shell, the Tailwind watcher):

```sh
$ bundle exec sitepress server -a 0.0.0.0 -p 8080
$ bundle exec rake tailwind:watch
```

Or run both at once with a Procfile runner such as [foreman](https://github.com/ddollar/foreman):

```sh
$ foreman start
```

Then open http://localhost:8080/. To build the stylesheet once (without
watching), run `bundle exec rake tailwind:build`.

## Documentation layout

- `pages/` — the homepage and shared content
- `pages/v1/` — the current (v1) Firehose documentation
- `pages/next/` — documentation for the upcoming "next" release

## Publishing

Compile the static site into `build/`:

```sh
$ bundle exec sitepress compile
```

`bundle exec rake` cleans, compiles, and (with AWS credentials) publishes the
`build/` output to the `firehose.io` S3 bucket.
