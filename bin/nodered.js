#!/usr/bin/env node

var
  sys = require("sys"),
  events = require("events"),
  redis = require("../lib/vendor/redis-client"),
  flow = require("../lib/vendor/flow");

redis.debugMode = process.env["NODERED_DEBUG"] || false;

// The local NodeRed node context, a global variable (*gasp!*).  Extensions can
// freely read/write from/to this context since extensions are *trusted*.
// NodeRed provides a framework for servers but the real meat is in the
// extensions.  So, NodeRed gets out of their way by not hiding anything.

our = { 
  version: "0.5.4",
  redis: {},
  servers: [],
  extensions: [],
  clients: {},
  client_count: 0,
  emitter: new events.EventEmitter(),
  up_since: Date.now().toString(),
  shutting_down: false
};

sys.log("nodered v" + our.version);
sys.log("node.js " + process.version);

function die(why) {
  sys.error("ERROR! " + why);
  process.exit(1);
}

var config_path = process.argv[2] || 
                  process.env['NODERED_CONFIG_PATH'] || 
                  __dirname + '/../etc/config.js';

var sandbox = {};
try {
  process.binding('evals').Script.runInNewContext(
    require("fs").readFileSync(config_path), sandbox);
} catch (e) {
  die("invalid NodeRed config file @ " + config_path + ": " + e);
}
var config = sandbox.configuration;

our.node_name = (config.node_name || '').trim().toLowerCase().replace(/\s/g, '_');
if (!our.node_name) die("a node name is required");

our.redis.ip = config.redis.ip || '127.0.0.1'; 
our.redis.port = config.redis.port || 6379;
our.redis.db = config.redis.db === undefined ? 1 : config.redis.db;
our.redis.client = redis.createClient(our.redis.port, our.redis.ip);

var server_creators = { 
  tcp: require("../lib/tcp_server").create, 
  ws: require("../lib/websockets_server").create
};

config.servers.forEach(function (t) {
  try {
    our.servers.push(server_creators[t.type](t.ip, t.port));
  } catch (e) {
    die("failed to create server! " + e);
  }
});

if (our.servers.length == 0) 
  die("no servers enabled!");

our.max_request_size = config.max_request_size || 50240;
our.max_clients = config.max_clients || 50000;
our.max_queued_requests = config.max_queued_requests || 250;

for (var i=0, n=config.extensions.length; i<n; ++i) {
  var ext_spec = config.extensions[i];

  switch (ext_spec.type) {
    case 'node':
      var mod = require(ext_spec.module);
      if (!mod) die("no such nodejs module @ " + ext_spec.module);

      if (typeof mod.init_extension != "function")
        die("invalid extension module " + ext_spec.name + 
            ": missing/invalid init_extension function");

      our.extensions.push({ 
        name: ext_spec.name, 
        module: mod, 
        options: ext_spec.options || {} 
      });
      break;

    default:
      die("unknown extension type: " + ext_spec.type);
  }
}

flow.exec(
  function () {
    our.redis.client.select(our.redis.db, this);
  },
  function () {
    our.redis.client.info(this);
  },
  function (err, info) {
    if (err) throw new Error(err);

    sys.log("redis v" + info.redis_version + " @ " + 
            our.redis.ip + ":" + our.redis.port + "/" + our.redis.db);

    our.redis.version = info.redis_version;
    our.redis.client.incr('nr:nodeid', this);
  },
  function (err, value) {
    if (err) throw new Error(err);

    our.node_id = parseInt(value, 10);
    our.redis.client.zadd('nr:cluster', our.node_id, our.node_name, this);
  },
  function (err, added) {
    if (err) throw new Error(err);

    if (!added) {
      sys.error("name '" + our.node_name + "' is non-unique in the cluster");
      process.exit(1);
    }

    our.metadata_key = 'nr:cluster:' + our.node_id;

    our.redis.client.hset(our.metadata_key, 'name', our.node_name, this.MULTI());
    our.redis.client.hset(our.metadata_key, 'id', our.node_id, this.MULTI());
    our.redis.client.hset(our.metadata_key, 'version', our.version, this.MULTI());
    our.redis.client.hset(our.metadata_key, 'nodejs_version', process.version, this.MULTI());
    our.redis.client.hset(our.metadata_key, 'platform', process.platform, this.MULTI());
    our.redis.client.hset(our.metadata_key, 'client_count', '0', this.MULTI());
    our.redis.client.hset(our.metadata_key, 'up_since', our.up_since, this.MULTI());

    var servers = [];
    config.servers.forEach(function (srv) { 
      servers.push(srv.type + '://' + srv.ip + ':' + srv.port);
    });
    our.redis.client.hset(our.metadata_key, 'servers', servers.join(','), this.MULTI());
  },
  function finish_boot() {
    for (var i=0; i<our.extensions.length; ++i) {
      var ext_spec = our.extensions[i];
      ext_spec.module.init_extension(ext_spec.options || {}, our);
    }

    setInterval(function () {
      var mem = JSON.stringify(process.memoryUsage());
      our.redis.client.hset(our.metadata_key, 'mem', mem, function (err, reply) {
        if (err) sys.log("** failed to update memory usage in redis: " + err);
      });
    }, 30000);

    sys.log("ready! ☺");
  }
);

function cleanup() {
  if (our.shutting_down) return;
  our.shutting_down = true;

  flow.exec(
    function rm_ourself_from_cluster() {
      our.redis.client.zremrangebyscore('nr:cluster', our.node_id, our.node_id, this);
    },
    function rm_our_metadata(err, reply) {
      if (our.metadata_key) 
        our.redis.client.del(our.metadata_key, this);
      else
        this();
    },
    function deinit_extensions() {
      var multi = this.MULTI;
      for (var i=0; i<our.extensions.length; ++i) {
        var ext_spec = our.extensions[i];
        if (typeof ext_spec.module.deinit_extension == "function") 
          ext_spec.module.deinit_extension(our, multi());
      }
    },
    function finish_up() {
      our.redis.client.close();
      sys.log("shutdown");
      process.exit(0);
    }
  );
}

[ 'SIGTERM', 'SIGINT', 'SIGKILL', 'SIGQUIT' ].forEach(function (sig) {
  process.addListener(sig, cleanup);
});

