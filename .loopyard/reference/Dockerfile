# Dev/serve image for the Firehose.io Sitepress static site.
#
# This is REFERENCE config. It is not the active runtime — see README.md in
# this directory for how to activate it. The site currently runs directly in
# the Loopyard work container via the Procfile `web:` process.
FROM ruby:3.1-slim

# System deps:
#  - build-essential + lib*-dev : native extensions (sassc, nokogiri fallback)
#  - curl + bash                : used by bin/tailwindcss to fetch the
#                                 standalone Tailwind CLI
#  - git                        : Sitepress/asset tooling may shell out to it
RUN apt-get update -qq \
    && apt-get install -y --no-install-recommends \
       build-essential \
       libyaml-dev \
       zlib1g-dev \
       libxml2-dev \
       libxslt1-dev \
       curl \
       bash \
       git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install gems first so this layer is cached until the Gemfile changes.
COPY Gemfile Gemfile.lock ./
RUN bundle install --jobs 4 --retry 3

# App source.
COPY . .

# Pre-compile the Tailwind stylesheet so the served CSS is fresh in the image.
# (At runtime the committed assets/stylesheets/tailwind.css is served, so this
# is belt-and-suspenders.)
RUN bundle exec rake tailwind:build

EXPOSE 8080
ENV PORT=8080

# Bind 0.0.0.0 so Loopyard's port forwarder can reach the container interface.
CMD ["bundle", "exec", "sitepress", "server", "-a", "0.0.0.0", "-p", "8080"]
