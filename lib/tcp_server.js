var 
  sys = require("sys"),
  Client = require("./client").Client,
  dispatch = require("./request_dispatch"),
  net = require('net');

function TcpServer(ip, port) {
  this.ip = ip;
  this.port = port;

  this.type = 'tcp';   // for metadata extension

  var banner = "[tcp]" + this.ip + ":" + this.port + " ";
  this.log = function (what) { 
    sys.log(banner + what); 
  };

  var self = this;

  this.server = net.createServer(function (socket) {
    if (our.shutting_down || Object.keys(our.clients).length > our.max_clients) 
      return socket.end();

    var client = new Client(self, socket);
    self.log("⇔ " + client + " connected");
    our.clients[client.id] = client;
    our.emitter.emit("connected", client);

    socket.setEncoding("utf8");
    socket.setTimeout(0);
    socket.setNoDelay(true);

    socket.addListener("data", function (chunk) { 
      if (our.shutting_down) return;
      self.log("☜ " + client + ": " + chunk.replace(/\r\n/g, '<crlf>'));

      try {
        client.parser.feed(chunk); 
        our.dispatch._next_request(client);
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
          if (err) throw new Error(err);
          our.client_count--;
        });
      socket.end();
    });
  });

  this.server.listen(port, ip);
  this.log("listening!");
}

exports.TcpServer = TcpServer;

TcpServer.prototype.write = function (socket, data) {
  if (socket.writable)
    socket.write(data, "utf8");
};

exports.create = function (ip, port) {
  return new TcpServer(ip, port, require('net'));
};

