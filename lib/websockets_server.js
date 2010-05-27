var 
  sys = require("sys"),
  Client = require("./client").Client,
  dispatch = require("./request_dispatch"),
  ws = require('./vendor/ws');

function WebSocketsServer(ip, port, specDraft) {
  this.ip = ip;
  this.port = port;

  var banner = "[ws]" + this.ip + ":" + this.port + " ";
  this.log = function (what) { 
    sys.log(banner + what); 
  };

  var self = this;

  this.server = ws.createServer(specDraft ? { version: specDraft } : {});

  // NB: connection is a ws.Connection object not a Node.js Stream

  this.server.addListener('connection', function (connection) {
    if (our.shutting_down || Object.keys(our.clients).length > our.max_clients) 
      return connection.close();

    var client = new Client(self, connection);
    self.log("⇔ " + client + " connected");
    our.clients[client.id] = client;
    our.emitter.emit("connected", client);

    connection.addListener("message", function (message) { 
      if (our.shutting_down) return;
      self.log("⇇ " + message + ": " + message.replace(/\r\n/g, '<crlf>'));

      try {
        client.parser.feed(message); 
        our.dispatch._next_request(client);
      } catch (e) {
        client.kill(e.message);
      }
    });

    connection.addListener("close", function () {
      self.log("⇎ " + client + " disconnected");
      our.emitter.emit("disconnected", client);

      delete our.clients[client.id]; 

      our.redis.client.hincrby(our.metadata_key, 'client_count', -1, 
        function (err, reply) {
          if (err) throw new Error(err);
          our.client_count--;
        });
    });
  });

  this.server.listen(port, ip);
  this.log("listening!");
}

exports.WebSocketsServer = WebSocketsServer;

WebSocketsServer.prototype.write = function (conduit, data) {
  conduit.write(data);      // conduit is a ws.Connection
};

exports.create = function (ip, port) {
  return new WebSocketsServer(ip, port);
};

