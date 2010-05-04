var sys = require("sys");

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

    var n = this._handlers.length;
    for (var i=0; i<n; ++i) {
      var handler = this._handlers[i];
      if (handler.hasOwnProperty(func_name) &&
          typeof handler[func_name] == "function") {
        var self = this;
        handler[func_name](client, request, function () {
          if (client && !our.shutting_down) {    // perhaps killed in handler.
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

