#!/usr/bin/env node

var
  sys = require("sys"),
  net = require("net"),
  url = require("url"),
  fs = require("fs"),
  events = require("events"),
  byteLength = require("buffer").Buffer.byteLength,
  redis = require("../lib/vendor/redis-client"),
  flow = require("../lib/vendor/flow"),
  shutting_down = false,
  next_client_id = 0;

redis.debugMode = process.env["NODERED_DEBUG"] || false;

// The local NodeRed node context, a global variable.  Extensions can freely
// read/write from/to this context since extensions are *trusted*.  NodeRed
// provides a framework for servers but the real meat is in the extensions.
// So, NodeRed gets out of their way by not hiding anything.

our = { 
  version: "0.5.2",
  redis: {},
  servers: [],
  extensions: [],
  clients: {},
  client_count: 0,
  emitter: new events.EventEmitter(),
  up_since: Date.now().toString(),
};


function Request(client, command, args) {
  this.client = client;
  this.command = command;
  this.args = args;
}


function Parser(client) {
  this.input = '';
  this.client = client;
}

Parser.prototype.feed = function (chunk) {
  this.input += chunk;
  if (byteLength(this.input) > our.max_request_size) 
    throw new Error("flooding");

  var match;
  while (match = this.input.match(/^(.+?)\r\n/)) {
    this.input = this.input.substr(match[0].length);

    var request;
    try { 
      request = JSON.parse(match[1]); 
    } catch (e) {
      sys.log(e);
    } 

    if (request === undefined || 
        typeof request.cmd != "string" || 
        typeof request.id != "number")
      throw new Error("malformed request");

    this.client.requests.push(request);
    if (this.client.requests.length > our.max_queued_requests)
      throw new Error("flooding");
  }

  our.dispatch._next_request(this.client);
};


our.dispatch = {
  _handlers: [],

  add_handler: function (handler) {
    if (typeof handler != "object") 
      throw new Error("expected object for handler");
    this._handlers.push(handler);
    return this;
  },

  _next_request: function (client) {
    var request = client.requests[0];
    if (!request) return;

    if (request.id <= client.prev_request_id) {
      client.kill("invalid request id");
      return;
    }

    client.prev_request_id = request.id;

    var func_name = "on_" + request.cmd.toUpperCase();

    sys.debug(func_name);
    sys.debug(JSON.stringify(client.requests));

    var n = this._handlers.length;
    for (var i=0; i<n; ++i) {
      var handler = this._handlers[i];
      if (handler.hasOwnProperty(func_name) &&
          typeof handler[func_name] == "function") {
        var self = this;
        handler[func_name](client, request, function () {
          if (client && !shutting_down) {    // perhaps killed in handler.
            client.requests.shift();
            self._next_request(client);
          }
        });
        return;
      }
    }
    client.kill("unknown command");
  }
};


function Client(server, socket, callback) {
  this.parser = new Parser(this);
  this.socket = socket;
  this.server = server;
  this.requests = [];
  this.id = (next_client_id++).toString(36);
  this.prev_request_id = -1;

  our.redis.client.hincrby(our.metadata_key, 'client_count', 1, 
    function (err, reply) {
      if (err) throw err;
      our.client_count++;
    });
}

Client.prototype.respond = function (response) {
  var serialized = JSON.stringify({ id: this.requests[0].id, body: response }) + "\r\n";
  this.server.log("⇉ " + this + ": " + serialized.replace(/\r\n/g, '<crlf>'));
  this.server.write(this.socket, serialized);
};

Client.prototype.error = function (reason) {
  var serialized = JSON.stringify({ id: this.requests[0].id, error: reason }) + "\r\n";
  this.server.log("⇉ " + this + ": " + serialized.replace(/\r\n/g, '<crlf>'));
  this.server.write(this.socket, serialized);
};

Client.prototype.notify = function (notice, already_serialized) {
  var serialized = already_serialized ? notice : (JSON.stringify({ notice: notice }) + "\r\n");
  this.server.log("☞ " + this + ": " + serialized.replace(/\r\n/g, '<crlf>'));
  this.server.write(this.socket, serialized); 
};

Client.prototype.kill = function (reason) {
  our.emitter.emit("killed", this, reason);
  var serialized = JSON.stringify({ id: -1, fatal: reason }) + "\r\n";
  this.server.log("↛ " + this + ": " + serialized.replace(/\r\n/g, '<crlf>'));
  this.server.write(this.socket, serialized);
  this.socket.end();
};

Client.prototype.toString = function () {
  return this.id + '@' + our.node_name;
};


function TcpServer(ip, port, net_module, type) {
  this.ip = ip;
  this.port = port;
  this.type = type || 'tcp';

  var banner = "[" + this.type + "] " + this.ip + ":" + this.port + " ";
  this.log = function (what) { sys.log(banner + what); };

  var self = this;

  this.server = net_module.createServer(function (socket) {
    if (shutting_down || Object.keys(our.clients).length > our.max_clients) 
      return socket.end();

    var client = new Client(self, socket);
    self.log("⇔ " + client + " connected");
    our.clients[client.id] = client;
    our.emitter.emit("connected", client);

    socket.setEncoding("utf8");
    socket.setTimeout(0);
    socket.setNoDelay(true);

    socket.addListener("data", function (chunk) { 
      if (shutting_down) return;
      self.log("⇇ " + client + ": " + chunk.replace(/\r\n/g, '<crlf>'));

      try {
        client.parser.feed(chunk); 
      } catch (e) {
        client.kill(e.message);
      }
    });

    socket.addListener("end", function () {
      self.log("⇎ " + client + " disconnected");
      our.emitter.emit("disconnected", client);

      delete our.clients[client.id]; 

      our.redis.client.hincrby(our.metadata_key, 'client_count', -1, 
        function (err, reply) {
          if (err) throw err;
          our.client_count--;
        });
      socket.end();
    });
  });

  this.server.listen(port, ip);
  this.log("listening!");
}

TcpServer.prototype.write = function (socket, data) {
  if (socket.writable)
    socket.write(data, "utf8");
};

function create_tcp_server(ip, port) {
  return new TcpServer(ip, port, require('net'));
}

// The WebSockets module is a drop-in replacement for the 'net' module,
// so we just abstract the TcpServer a bit to achieve WebSockets support.

function create_ws_server(ip, port) {
  return new TcpServer(ip, port, require('../lib/vendor/websocket'), 'ws');
}


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
  process.binding('evals').Script.runInNewContext(fs.readFileSync(config_path), sandbox);
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
  tcp: create_tcp_server, 
  ws: create_ws_server 
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
        die("invalid extension module " + ext_spec.name + ": missing/invalid init_extension function");
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
    sys.log("redis v" + info.redis_version + " @ " + our.redis.ip + ":" + our.redis.port + "/" + our.redis.db);
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
    if (!added) throw new Error("name '" + our.node_name + "' is non-unique in the cluster");

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
  if (shutting_down) return;
  shutting_down = true;

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

