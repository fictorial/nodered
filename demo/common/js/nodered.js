function NodeRedClient() {
  this.next_id  = 0;
  this.pending = {};  // id => function
}

NodeRedClient.prototype.connect = function (host, port) {
  if (this.ws) 
    throw "This client is already connected.";

  var self = this;

  ws = new WebSocket("ws://" + (host || 'localhost') + ":" + (port || 8081)); 

  ws.onopen = function() {
    self.ws = ws;
    if (self.on_connected) self.on_connected();
  };

  ws.onmessage = function (event) {
    try { 
      var obj = JSON.parse(event.data); 
    } catch (e) {
    }

    if (!obj || !(obj instanceof Object)) 
      throw "malformed message";

    if (obj.notice) {
      if (self.on_notice) 
        self.on_notice(obj.notice);
    } else if (obj.id !== undefined) {
      if (obj.id < 0) {
        if (self.on_error) 
          self.on_error(obj.body);
      } else if (self.pending[obj.id]) {
        self.pending[obj.id](obj.body);
        delete self.pending[obj.id];
      }
    }
  };

  ws.onclose = function() {
    if (self.on_disconnected) 
      self.on_disconnected();
    self.ws = null;
    delete self.ws;
  };
}

function make_requester(command_name) {
  return function () {
    if (!this.ws) return;

    var arg_count = arguments.length;
    var callback = arguments[arguments.length - 1];
    if (typeof callback == "function") arg_count--;

    var request = { 
      id: this.next_id++, 
      cmd: command_name, 
      body: []
    };

    for (var i=0; i < arg_count; ++i) 
      request.body.push(arguments[i]);

    if (request.body.length == 0)
      delete request.body;

    this.pending[request.id] = callback;

    var cmd = JSON.stringify(request) + "\r\n";
    this.ws.send(cmd);
  };
}
var builtins = [ "LOCAL", "CLUSTER", "LIST", "SUBSCRIBE", "UNSUBSCRIBE", "PUBLISH" ];
for (var i in builtins)
  NodeRedClient.prototype[builtins[i].toLowerCase()] = make_requester(builtins[i]);

