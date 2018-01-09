---
title: Firehose | Build realtime web applications
---

Firehose is a __minimally invasive way of building realtime web apps__ without complex protocols or rewriting your app from scratch. Its a dirt simple pub/sub server that __keeps client-side Javascript models in synch with the server__ code via WebSockets or HTTP long polling. It fully __embraces RESTful design patterns__, which means you'll end up with a nice API after you build your app.

# Why Firehose?

__Work with grain of the web.__ Firehose embraces [RESTful](http://en.wikipedia.org/wiki/Representational_state_transfer) design principles and consequently works great with any library that speaks HTTP. That means you can build simple realtime APIs, similar to Twitter's Site Stream API, that can be consumed without parsing complex protocols.

__Integrates with [Backbone.js](http://documentcloud.github.com/backbone/) and [Ember.js](http://emberjs.com/).__ Setting up a model in a web browser to listen for updates from the server is simple and straight-forward.

```javascript
// Backbone.js and Firehose.io
var nutty = new Squirrel({
  id: 7,
  scale: 1.0,
  wisdom: 'A nut a day keeps the doctor away.'
});
new Firehose.Consumer({
  uri: '//firehose.io/squirrels/' + nutty.id,
  message: function(json){
    nutty.set(json);
  }
}).connect();
```

# Hook it into an ORM, like ActiveRecord

Great, it works from curl. So what? The last trick is to hook this into whatever ORM you're using to update all of the clients that something changed.

```ruby
require 'net/http'

class Squirrel
  after_commit do
    req = Net::HTTP::Put.new("/squirrels/#{id}/firehose.json")
    req.body = to_json
    Net::HTTP.start('127.0.0.1', 7474).request(req)
  end
end
```

Then when the model is saved, it will drop a JSON representation of the model onto a path that's similar to the RESTful path conventions already in place. Subscribing to this feed is as simple as:

    $ curl http://127.0.0.1/squirrels/:id/firehose.json

Pretty cool huh?

# Getting Started

Install and run Redis.

    $ apt-get install redis-server  # Install on Ubuntu
    $ brew install redis            # Install on Mac Homebrew

Install the firehose gem.

    $ gem install firehose

Fire up the server.

    $ firehose server

Now try it out.

    $ curl "http://127.0.0.1:7474/hi?cid=2039" &
    $ curl -X PUT -d "Howdy friend" "http://127.0.0.1:7474/hi"

If everything is working correctly, "Howdy friend" should have been displayed in your terminal.

# Talks

* [RailsConf 2012 "Streaming REST" slides](/pdfs/firehose.pdf)

# Contributors

These fine folks at [Poll Everywhere](http://www.polleverywhere.com/) worked tirelessly to bring you Firehose.io.

* [Brad Gessler](http://twitter.com/bradgessler)
* [Steel Fu](http://twitter.com/steelfu)
* Paul Cortens
* [Zach Zolton](http://twitter.com/zdzolton)
* [Christopher Bertels](http://twitter.com/bakkdoor)

# Source Code

Fork it on [Github](https://github.com/firehoseio/firehose)

# Mailing List

Discuss all things Firehose at on the [mailing list](https://groups.google.com/d/forum/firehoseio)
