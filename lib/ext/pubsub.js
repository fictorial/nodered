var 
  sys = require("sys"),
  flow = require("../vendor/flow"),
  redis = require("../vendor/redis-client");

function log(what) {
  sys.log("[ext:pubsub] " + what);
};

exports.init_extension = function (options, context) {
  log("initializing.");

  var redis_client = context.redis.client;
  var pubsub_client = redis.createClient(context.redis.port, context.redis.host);

  pubsub_client.select(options.db || context.redis.db, function (err) {
    if (err) throw new Error(err);
  });

  var subscriptions = {};  // { chan: { client.id: Client, .. }, .. }

  context.pubsub = { 
    subscriptions: subscriptions, 
    client: pubsub_client 
  };

  // unsubscribe the client from all subscriptions.

  context.emitter.addListener("disconnected", function (client) {
    if (client.subscriptions === undefined)
      return;

    var subs = Object.keys(client.subscriptions);
    for (var i=0, n=subs.length; i<n; ++i) 
      redis_client.zrem('pubsub:ch:' + subs[i], client.id, function (err, reply) {
        if (err) throw new Error(err);
      });

      if (subscriptions[subs[i]] !== undefined) {
        delete subscriptions[subs[i]][client.id];

        if (Object.keys(subscriptions[subs[i]]).length == 0) {
          delete subscriptions[subs[i]];
          pubsub_client.unsubscribeFrom(subs[i]);
        }
      }
  });

  function forward_to_local_clients(channel, pattern, msg) {
    try {
      var msg_obj = JSON.parse(msg);
    } catch (e) {
      log("invalid message! expecting proper JSON");
      return;
    }

    msg_obj.channel = channel;
    if (pattern) msg_obj.pattern = pattern;

    var 
      notice = JSON.stringify({ notice: { message: msg_obj } }) + "\r\n",
      subscribers = subscriptions[pattern || channel],
      client_ids = Object.keys(subscribers);

    for (var i=0, n=client_ids.length; i<n; ++i) 
      subscribers[client_ids[i]].notify(notice, true);    // true => prerendered
  }

  var handler = { 
    on_SUBSCRIBE: function (client, request, callback) {
      var chan = (request.body[0] || '').trim();

      if (!chan || typeof chan != "string") {
        client.kill("subscribe requires channel or pattern");
        callback();
        return;
      }

      // Create local subscription as needed.
      // On receipt of published messages, forward to local subscribers (clients).

      if (subscriptions[chan] === undefined) {
        log("subscribing to " + chan);
        subscriptions[chan] = {};
        pubsub_client.subscribeTo(chan, function (channel, message, pattern) {
          forward_to_local_clients(channel.toString(), pattern ? pattern.toString() : null, message.toString());
        });
      }

      // Subscribe the client to the channel locally.

      if (subscriptions[chan][client.id] === undefined) {
        subscriptions[chan][client.id] = client;
        if (client.subscriptions === undefined) 
          client.subscriptions = {};
        client.subscriptions[chan] = 1;

        // Note in Redis that this client is subscribed.
        // Value: client ID; Score: NodeRed instance ID.

        redis_client.zadd('pubsub:ch:' + chan, context.node_id, client.id, 
          function (err, reply) {
            if (err) {
              client.kill("internal error");
              callback();
              throw new Error(err);
            }
            client.respond(true);
            callback();
            context.emitter.emit('subscribed', chan, client);
          });
      }
    },

    on_UNSUBSCRIBE: function (client, request, callback) {
      var chan = (request.body[0] || '').trim();

      if (!chan || typeof chan != "string") {
        client.kill("unsubscribe requires channel or pattern");
        callback();
        return;
      }

      // Unsubscribe the client locally.

      if (client.subscriptions !== undefined)
        delete client.subscriptions[chan];

      // Unsubscribe in Redis if the client was the last remaining subscriber.

      if (subscriptions[chan] !== undefined) {
        delete subscriptions[chan][client.id];
        if (Object.keys(subscriptions[chan]).length == 0) {
          delete subscriptions[chan];
          pubsub_client.unsubscribeFrom(chan);
        }
      }

      // Note in Redis that this client is no longer subscribed.

      redis_client.zrem('pubsub:ch:' + chan, client.id, 
        function (err, reply) {
          if (err) {
            client.kill("internal error");
            callback();
            return;
          }
          client.respond(true);
          callback();
          context.emitter.emit('unsubscribed', chan, client);
        });
    },

    on_PUBLISH: function (client, request, callback) {
      var 
        args = request.body || [],
        chan = (args[0] || '').trim(),
        msg  = (args[1] || '').trim();

      if (!chan || typeof chan != "string" || 
          !msg  || typeof msg  != "string") {
        client.kill("publish requires channel and message"); 
        callback();
        return;
      }

      var payload = JSON.stringify({ from: client.toString(), msg: msg });

      redis_client.publish(chan, payload, function (err, reply) {
        if (err) {
          client.kill("internal error: " + err);
          callback();
          return;
        }
        client.respond(true);
        callback();
      });
    }, 

    on_LIST: function (client, request, callback) {
      // Don't fear the use of KEYS.  You should have configured NodeRed
      // to use a database number in Redis dedicated to NodeRed.  That's
      // why NodeRed defaults to non-zero database number.  NodeRed does
      // not use a large number of keys so a range-scan is cheap.

      redis_client.keys('pubsub:ch:*', function (err, reply) {
        if (err) throw new Error(err);
        var list = [], key_at = 'pubsub:ch:'.length;
        if (reply instanceof Array) 
          for (var i=0, n=reply.length; i<n; ++i)
            list.push(reply[i].toString().substr(key_at));
        client.respond(list);
        callback();
      });
    }
  };
  
  context.dispatch.add_handler(handler);
};

exports.deinit_extension = function (context, callback) {
  log("deinitializing.");

  flow.exec(
    function unsubscribe_subscribers_from_local_subscriptions() {
      var chans = Object.keys(context.pubsub.subscriptions);
      if (chans.length == 0)
        this();
      else
        for (var i=0, n=chans.length; i<n; ++i) 
          context.redis.client.zremrangebyscore('pubsub:ch:' + chans[i], 
            context.node_id, context.node_id, this.MULTI());
    },
    function check_results(args_array) {
      if (args_array) {
        for (var i=0, n=args_array.length; i<n; ++i) {
          var args = args_array[i];
          if (args[0]) throw args[0];      // (err, reply)
        }
      }
      context.pubsub.client.close();
      callback();
    }
  );
};

