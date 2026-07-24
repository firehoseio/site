# Firehose.io Website

This is the public website at http://firehose.io/

It is built with [Sitepress](https://sitepress.cc), a Ruby/Rails static-site
generator. Content lives in `pages/`, the layout in `layouts/`, and
images/stylesheets/scripts in `assets/`.

## Getting started

Install dependencies:

```sh
$ bundle
```

Start the preview server:

```sh
$ bundle exec sitepress server -a 0.0.0.0 -p 8080
```

Then open http://localhost:8080/.

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
