// Nickname extension for NodeRed.
// Load this -after- the pubsub extension (if you are using the pubsub extension).

var sys = require("sys");

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
        callback();
      } else if (nicknames_in_use[nickname.toLowerCase()] != undefined) {
        client.error("in use");
        callback();
      } else {
        nicknames_in_use[nickname.toLowerCase()] = client;
        var previous_nickname = client.nickname || client.id;
        client.nickname = nickname;
        if (context.pubsub) {
          context.pubsub.client.publish('system.' + context.node_id + '.nickname', {
            from: "system", 
            msg: { nickname: { from: previous_nickname, to: nickname } }
          }, function (err, reply) {
            if (err) throw err;
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

