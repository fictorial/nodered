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
    self.add_extension_support('metadata');     // must always be enabled. 
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
      if (self.on_notice) self.on_notice(obj.notice);
    } else if (obj.id !== undefined && self.pending[obj.id]) {
      self.pending[obj.id](obj.error || null, obj.body || null);
      delete self.pending[obj.id];
    }
  };

  ws.onclose = function() {
    if (self.on_disconnected) 
      self.on_disconnected();
    self.ws = null;
    delete self.ws;
  };
}

NodeRedClient.prototype.add_extension_support = function (ext_name) {
  var make_requester = function (command_name) {
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
  };

  var extension_commands = {
    basic:    [ 'QUIT' ],
    metadata: [ 'LOCAL', 'CLUSTER' ],
    pubsub:   [ 'LIST', 'SUBSCRIBE', 'UNSUBSCRIBE', 'PUBLISH' ],
    nickname: [ 'NICKNAME' ]
  };

  var to_add = extension_commands[ext_name];

  if (!to_add) 
    alert("Internal error! I don't know how to add support for: " + ext_name);
  else 
    for (var i=0; i<to_add.length; ++i) 
      NodeRedClient.prototype[to_add[i].toLowerCase()] = make_requester(to_add[i]);
};

