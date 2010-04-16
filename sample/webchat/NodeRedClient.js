var 
  SYSTEM_CHANNEL = "*system*",
  SYSTEM_USER    = "*system*";

var websocketsSupported = false;

$(document).ready(function() {
  websocketsSupported = ("WebSocket" in window);
});

function NodeRedClient() {
  this.nextID  = 0;
  this.pending = {}; // id => function
}

NodeRedClient.prototype.connect = function (host, port) {
  var self = this;

  if (!websocketsSupported)
    throw "This browser does not support WebSockets.";

  if (this.ws)
    throw "This client is already connected.";

  ws = new WebSocket("ws://" + (host || 'localhost') 
                             + ":" 
                             + (port || 8081));

  ws.onopen = function() {
    self.ws = ws;
    if (typeof self.onConnect == "function")
      self.onConnect();
  };

  ws.onmessage = function (event) {
    var obj = JSON.parse(event.data);
    if (!(obj instanceof Array))
      throw "malformed message";
      
    var id = obj[0]; 

    if (id == "MESSAGE" && 
        obj.length == 3 && 
        typeof self.onReceiveMessage == "function") {
      var channel = obj[1]
        , message = obj[2];

      self.onReceiveMessage(channel, message);
    } else if (typeof id == "number") {
      var ok = obj[1]
        , reply = obj[2];

      if (typeof ok == "boolean" && 
          typeof self.pending[id] == "function") {
        self.pending[id](ok, reply);
        delete self.pending[id];
      }
    }
  };

  ws.onclose = function() {
    if (typeof self.onDisconnect == "function")
      self.onDisconnect();

    self.ws = null;
    delete self.ws;
  };
}

function makeRequester(commandName) {
  return function () {
    if (!this.ws)
      throw "Not connected";

    var argCount = arguments.length;
    var callback = arguments[arguments.length - 1];
    if (typeof callback == "function")
      argCount--;

    var request = [ this.nextID++
                  , commandName 
                  ];

    for (var i=0; i < argCount; ++i)
      request.push(arguments[i]);
      
    this.pending[request[0]] = callback;

    var cmd = JSON.stringify(request) + "\r\n";
    this.ws.send(cmd);
  };
}

var builtins = [ "LOCAL"
               , "CLUSTER"
               , "NICK"
               , "LIST"
               , "WHO"
               , "SUB"
               , "UNSUB"
               , "PUB" 
               ];

for (var i in builtins) 
  NodeRedClient.prototype[builtins[i].toLowerCase()] = makeRequester(builtins[i]);

NodeRedClient.prototype.getServerInfo           = NodeRedClient.prototype.local;
NodeRedClient.prototype.getClusterInfo          = NodeRedClient.prototype.cluster;
NodeRedClient.prototype.getActiveChannels       = NodeRedClient.prototype.list;
NodeRedClient.prototype.getSubscribersToChannel = NodeRedClient.prototype.who;
NodeRedClient.prototype.subscribe               = NodeRedClient.prototype.sub;
NodeRedClient.prototype.unsubscribe             = NodeRedClient.prototype.unsub;
NodeRedClient.prototype.publish                 = NodeRedClient.prototype.pub;
NodeRedClient.prototype.setNickname             = NodeRedClient.prototype.nick;

