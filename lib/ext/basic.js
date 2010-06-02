var sys = require("sys");

function log(what) {
  sys.log("[ext:basic] " + what);
};

exports.init_extension = function (options, context) {
  log("initializing.");

  context.dispatch.add_handler({ 
    on_QUIT: function (client, request, callback) {
      client.notify({ quit: true });
      client.socket.end();
      callback();
    },

    on_PING: function (client, request, callback) {
      client.respond('PONG');
      callback();
    }
  });
};

exports.deinit_extension = function (context, callback) {
  log("deinitializing.");
  process.nextTick(callback);
};

