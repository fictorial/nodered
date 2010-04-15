var idSequence = 0;

function makeNick() {
  return "Guest-" + (idSequence + Math.random(1e6))
                    .toString(36)
                    .replace('.', '');
}

function Client(transport, stream) {
  this.transport     = transport;
  this.stream        = stream;
  this.id            = idSequence++;
  this.nickname      = makeNick();
  this.subscriptions = {};    // {"channel":1, ...}
  this.requestQueue  = [];     // queue
}

Client.prototype.enqueueRequest = function (request) {
  this.requestQueue.push(request);
  return this.requestQueue.length;
};

Client.prototype.nextRequest = function () {
  return this.requestQueue.shift();
};

Client.prototype.send = function (data) {
  this.transport.sendReply(this, data);
};

Client.prototype.toString = function () {
  return JSON.stringify({ nick: this.nickname
                        , peer: this.stream.remoteAddress
                        , state: this.stream.readyState
                        , requests: this.requestQueue.length
                        });
};

exports.Client = Client;
