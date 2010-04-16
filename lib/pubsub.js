var redis     = require("./vendor/redis-client")
  , logger    = require("./logger")
  , makeReply = require("./reply").makeReply
  , config    = require("./config")
  , flow      = require("./vendor/flow");

var subscribers   = {}
  , controlClient = null
  , pubsubClient  = null;

exports.initRedisClients = function (options, callback) {
  redis.debugMode = options.debugMode || false;

  var port = options.port || 6379
    , host = options.host || '127.0.0.1'
    , dbNo = options.db   || 1;

  controlClient = redis.createClient(port, host);
  pubsubClient  = redis.createClient(port, host);

  var connected = 0;

  function checkSelectedDB(err, reply) {
    if (err)
      throw new Error("Is redis configured for at least " + 
        dbNo + " databases in redis.conf?");

    if (++connected == 2) {
      exports.controlClient = controlClient;
      exports.pubsubClient = pubsubClient;

      callback();
    }
  }

  controlClient.stream.addListener("connect", 
    function () {
      controlClient.select(dbNo, checkSelectedDB);
    });

  pubsubClient.stream.addListener("connect", 
    function () {
      pubsubClient.select(dbNo, checkSelectedDB);
    });
};

function forwardToLocalSubscribers(channel, message) {
  if (typeof subscribers[channel] == "undefined") 
    return;

  var serializedMessage = JSON.stringify([ "MESSAGE"
                                         , channel
                                         , message 
                                         ]) + "\r\n";

  var nicks = Object.getOwnPropertyNames(subscribers[channel]);
  for (var i=0, n=nicks.length; i<n; ++i) {
    var client = subscribers[channel][nicks[i]];
    if (client.stream.writable)
      client.stream.write(serializedMessage, "utf8");
  }
}

exports.subscribe = function (client, channel, callback) {
  if (channel.match(config.RESERVED_CHANNEL_REGEX)) {
    process.nextTick(
      function () {
        callback(false);
      });
    return;
  }
  // If the client is the first local subscriber to the given channel,
  // subscribe this node to the channel.

  if (typeof subscribers[channel] == "undefined") {
    subscribers[channel] = {};
    pubsubClient.subscribeTo(channel, 
      function (channel, message) {
        forwardToLocalSubscribers(channel.utf8Slice(0, channel.length), 
          JSON.parse(message.utf8Slice(0, message.length)));
      });
    if (DEBUG) logger.debug("PUBSUB  Added node subscription to " + channel);
  }

  // Add the client as local subscriber.

  if (typeof subscribers[channel][client.nickname] == "undefined") {
    subscribers[channel][client.nickname] = client;
    client.subscriptions[channel] = 1;

    // Note the client as subscriber in Redis, and let other subscribers know
    // of the change in presence on the channel.

    controlClient.zadd('nr:chan:'+channel, NODE_ID, client.nickname, 
      function (err, reply) {
        if (err) throw err;
        if (callback) callback(true);
        exports.publish(config.SYSTEM_NICK, channel, { join: client.nickname });
      });
  }
};

exports.unsubscribe = function (client, channel, callback) {
  var nick = client.nickname;

  // Remove the client as local subscriber to the given channel.

  delete client.subscriptions[channel];
  delete subscribers[channel][nick];

  // If there are no other local subscribers to the channel, 
  // unsubscribe this node from the channel.

  if (Object.getOwnPropertyNames(subscribers[channel]).length == 0) {
    if (DEBUG) logger.debug("PUBSUB  removing node subscription to " + channel);

    delete subscribers[channel];
    pubsubClient.unsubscribeFrom(channel);
  }

  // Note that the client is no longer a subscriber in Redis, and let other
  // subscribers know of the change in presence on the channel.

  controlClient.zrem('nr:chan:'+channel, nick, 
    function (err, reply) {
      if (err) throw err;
      if (callback) callback();
      exports.publish(config.SYSTEM_NICK, channel, { part: nick });
    });
};

exports.publish = function (from, channel, message, callback) {
  // There is no need to wait for the publish call to return from Redis.

  controlClient.publish(channel, 
    JSON.stringify({ from:from
                   , msg:message 
                   }), 
    function (err, reply) {
      if (err) throw err;
      if (callback) callback(reply);
    });
}

exports.getSubscribersTo = function (channel, callback) {
  controlClient.zrange('nr:chan:' + channel, 0, -1, 'withscores', 
    function (err, reply) {
      if (err) throw err;

      var list = [];

      for (var i=0, n=reply.length; i<n; i += 2) {
        var nick   = reply[i].utf8Slice(0, reply[i].length);
        var nodeID = parseInt(reply[i+1].utf8Slice(0, reply[i+1].length), 0);

        list.push({ nick: nick
                  , node: nodeID 
                  });
      }

      callback(list);
    });
};

exports.getChannelList = function (callback) {
  // Don't fear the use of KEYS.  You should have configured NodeRed
  // to use a database number in Redis dedicated to NodeRed.  That's
  // why NodeRed defaults to non-zero database number.  NodeRed does
  // not use a large number of keys so a range-scan is cheap.

  controlClient.keys('nr:chan:*', function (err, reply) {
    if (err) throw err;
    var list = [], keyAt = 'nr:chan:'.length;
    for (var i=0, n=reply.length; i<n; ++i)
      list.push(reply[i].utf8Slice(0, reply[i].length).substr(keyAt));
    callback(list);
  });
};

exports.getLocalChannelsWithLocalSubscribers = function () {
  return Object.getOwnPropertyNames(subscribers);
};

exports.getLocalSubscribersToChannel = function (channel) {
  if (typeof subscribers[channel] == "undefined")
    return [];
  return Object.getOwnPropertyNames(subscribers[channel]);
};

// Multi-step rename nickname process implemented in terms of flow-js.

var renameNickFlow = flow.define(
  function tryAcquireNewNick(client, newNick, callback) {
    this.client = client;
    this.oldNick = client.nickname;
    this.newNick = newNick;
    this.callback = callback;

    controlClient.zadd("nr:nicks", NODE_ID, newNick, this);
  },
  function removeOldNick(err, wasAdded) {
    if (err) throw err;

    if (!wasAdded) {
      this.callback(false);
      //throw new Error("in use");
      this.failed = true;
      this();
    } else {
      controlClient.zrem("nr:nicks", this.oldNick, this);
    }
  },
  function removeOldNickAddNewNickInSubscriptions(err, wasRemoved) {
    if (this.failed) this();
    if (err) throw err;

    // Reserved nicks like Guest-121212121 are not stored in Redis 
    // like other nicks.  They are random.

    if (!wasRemoved && !this.oldNick.match(config.RESERVED_NICK_REGEX)) {
      this.callback(false);
      throw new Error("oldNick '" + this.oldNick + "' wasn't present!");
    }

    this.subs = Object.keys(this.client.subscriptions);
    if (this.subs.length > 0) {
      for (var i=0, n=this.subs.length; i<n; ++i) {
        var channel = this.subs[i];
        controlClient.zadd('nr:chan:'+channel, NODE_ID, this.newNick, this.MULTI());
        controlClient.zrem('nr:chan:'+channel, this.oldNick, this.MULTI());
      }
    } else {
      // No subscriptions, so carry on to the next step.

      this();
    }
  },
  function publishRenameNoticeInSubscribedChannels(argsArray) {
    if (this.failed) this();

    if (argsArray) {
      // Check if one of the zadd/zrem above threw.
      // Each redis client callback passes (err, reply).

      for (var i=0, n=argsArray.length; i<n; ++i) {
        var args = argsArray[i];
        if (args[0]) throw args[0];    
      }
    }

    for (var i=0, n=this.subs.length; i<n; ++i) {
      var channel = this.subs[i];

      // NB: We do not have to wait around for the publish to return.

      exports.publish(config.SYSTEM_NICK, channel, 
        { rename: [ this.oldNick
                  , this.newNick
                  ]
        });

      delete subscribers[channel][this.oldNick];
      subscribers[channel][this.newNick] = this.client;
    }

    this.client.nickname = this.newNick;
    this.callback(true);
  }
);

exports.changeNick = function (client, newNick, callback) {
  // Disallow a user to use reserved nicknames.

  if (newNick.match(config.RESERVED_NICK_REGEX)) {
    process.nextTick(
      function () {
        callback(false);
      });
    return;
  }

  try {
    renameNickFlow(client, newNick, callback);
  } catch (e) {
    // Throwing an Error is the only way to early-out of a flow-js
    // flow it seems.  However, the rename flow calls the callback 
    // with false on error.  We're just catching this so the exception
    // does not bubble up.

    logger.error("PUBSUB/NICK  " + e);
  }
};

exports.doneWithNick = function (nick, callback) {
  controlClient.zrem('nr:nicks', nick, callback);
};

var clusterInfoFlow = flow.define(
  function getActiveNodes(callback) {
    this.callback = callback;
    controlClient.zrange('nr:cluster', 0, -1, 'withscores', this);
  },
  function fetchInfoFromEachNode(err, reply) {
    redis.convertMultiBulkBuffersToUTF8Strings(reply);
    for (var i=1, n=reply.length; i<n; i += 2) 
      controlClient.hgetall('nr:cluster:' + reply[i], this.MULTI());
  },
  function aggregateResults(argsArray) {
    var results = [];
    for (var i=0, n=argsArray.length; i<n; ++i) {
      var args = argsArray[i];
      if (args[0]) throw args[0];
      var infoHash = args[1];
      redis.convertMultiBulkBuffersToUTF8Strings(infoHash);
      results.push(infoHash);
    }
    this.callback(results);
  }
);

exports.getClusterInfo = function (callback) {
  clusterInfoFlow(callback);
};
