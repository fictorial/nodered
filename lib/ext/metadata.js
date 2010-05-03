var 
  flow = require("../vendor/flow"),
  redis = require("../vendor/redis-client"),
  sys = require("sys");

function log(what) {
  sys.log("[ext:metadata] " + what);
};

var cluster_flow = flow.define(
  function active_nodes(redis_client, callback) {
    this.callback = callback;
    this.redis_client = redis_client;
    redis_client.zrange('nr:cluster', 0, -1, 'withscores', this);
  },
  function fetch_info_from_each_node(err, reply) {
    redis.convertMultiBulkBuffersToUTF8Strings(reply);
    for (var i=1, n=reply.length; i<n; i += 2)  // score = node ID
      this.redis_client.hgetall('nr:cluster:' + reply[i], this.MULTI());
  },
  function aggregate(args_array) {
    var results = [];
    for (var i=0, n=args_array.length; i<n; ++i) {
      var args = args_array[i];
      if (args[0]) throw args[0];    // err, reply

      var info_hash = args[1];
      redis.convertMultiBulkBuffersToUTF8Strings(info_hash);

      [ 'id', 'client_count', 'up_since' ].forEach(function (prop) {
        info_hash[prop] = parseInt(info_hash[prop], 10);
      });

      info_hash.servers = info_hash.servers.split(/,/);

      if (info_hash.mem)
        info_hash.mem = JSON.parse(info_hash.mem);

      results.push(info_hash);
    }
    this.callback(results);
  }
);

exports.init_extension = function (options, context) {
  log("initializing.");

  context.dispatch.add_handler({ 
    on_LOCAL: function (client, request, callback) {
      var reply = { 
        node_name: context.node_name,
        node_id: context.node_id,
        nodered_version: context.version,
        nodejs_version: process.version,
        redis_version: context.redis.version,
        client_count: context.client_count,
        extensions: context.extensions.map(function (e) { return e.name }),
        up_since: parseInt(context.up_since, 10),
        servers: []
      };

      for (var i=0, n=context.servers.length; i<n; ++i) {
        var srv = context.servers[i];
        reply.servers.push(srv.type + "://" + srv.ip + ":" + srv.port);
      }

      client.respond(reply);
      callback();
    },

    on_CLUSTER: function (client, request, callback) {
      cluster_flow(context.redis.client, function (results) {
        client.respond(results);
        callback();
      });
    }
  });
};

exports.deinit_extension = function (context, callback) {
  log("deinitializing.");
  process.nextTick(callback);
};

