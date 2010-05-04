// Nickname extension for NodeRed.
// Load this -after- the pubsub extension (if you are using the pubsub extension).

var 
  sys = require("sys"), 
  Client = require("../client").Client;

function log(what) {
  sys.log("[ext:nickname] " + what);
};

exports.init_extension = function (options, context) {
  log("initializing.");

  var nicknames_in_use = {};

  context.emitter.addListener("disconnected", function (client) {
    if (client.nickname !== undefined)
      delete nicknames_in_use[client.nickname];
  });

  // pubsub uses .toString() to set the 'from' field in a
  // published message.  Let's monkey patch .toString() to 
  // return the nickname if there is one.

  Client.prototype.toString = function () {
    return (this.nickname || this.id) + '@' + context.node_name;
  };

  context.dispatch.add_handler({ 
    on_NICKNAME: function (client, request, callback) {
      var nickname = ((request.body || []).shift() || '').trim();
      if (!nickname) {
        client.kill("nickname required");
        process.nextTick(callback);
      } else if (nicknames_in_use[nickname.toLowerCase()] != undefined) {
        if (nicknames_in_use[nickname.toLowerCase()] == client) 
          client.error("same nick");
        else 
          client.error("in use");
        process.nextTick(callback);
      } else {
        nicknames_in_use[nickname.toLowerCase()] = client;
        var previous_nickname = client.nickname || client.id;
        client.nickname = nickname;
        delete nicknames_in_use[previous_nickname.toLowerCase()];
        if (context.pubsub) {
          context.redis.client.publish('system.' + context.node_id + '.nickname', {
            from: "system", 
            msg: { nickname: { from: previous_nickname, to: nickname } }
          }, function (err, reply) {
            if (err) throw new Error(err);
            client.respond(true);
            callback();
          });
        }
      }
    }
  });
};

exports.deinit_extension = function (context, callback) {
  log("deinitializing.");
  process.nextTick(callback);
};

