var 
  Parser = require("./protocol_parser").Parser,
  next_client_id = 0;

function Client(server, conduit, callback) {
  this.parser = new Parser(this);
  this.conduit = conduit;
  this.server = server;
  this.requests = [];
  this.id = (next_client_id++).toString(36);
  this.prev_request_id = -1;

  our.redis.client.hincrby(our.metadata_key, 'client_count', 1, 
    function (err, reply) {
      if (err) throw new Error(err);
      our.client_count++;
    });
}

Client.prototype.respond = function (response) {
  var serialized = JSON.stringify({ id: this.requests[0].id, body: response }) + "\r\n";
  this.server.log("☞ " + this + ": " + serialized.replace(/\r\n/g, '<crlf>'));
  this.server.write(this.conduit, serialized);
};

Client.prototype.error = function (reason) {
  var serialized = JSON.stringify({ id: this.requests[0].id, error: reason }) + "\r\n";
  this.server.log("☞ " + this + ": " + serialized.replace(/\r\n/g, '<crlf>'));
  this.server.write(this.conduit, serialized);
};

Client.prototype.notify = function (notice, already_serialized) {
  var serialized = already_serialized ? notice : (JSON.stringify({ notice: notice }) + "\r\n");
  this.server.log("☞ " + this + ": " + serialized.replace(/\r\n/g, '<crlf>'));
  this.server.write(this.conduit, serialized); 
};

Client.prototype.kill = function (reason) {
  this.error(reason);
  our.emitter.emit("killed", this, reason);
  this.conduit.end();
};

Client.prototype.toString = function () {
  return this.id + '@' + our.node_name;
};

exports.Client = Client;

