// The dispatcher handles many concurrent client requests, but allows only
// a single request to be processed *per client* at any given time.
//
// Put another way, if a client has 2 queued requests, the second is not
// dispatched until the processing of the first request ends. But, we can
// support thousands of such clients.

var config = require("./config")
  , error = require("./error")
  , pubsub = require("./pubsub")
  , logger = require("./logger");

function Dispatch(controller) {
  this.clients = {};
  this.controller = controller;
};

exports.Dispatch = Dispatch;

Dispatch.prototype.addRequestsForClient = function (client) {
  if (client.requestQueue.length == 0)
    return;

  var clientContext = this.clients[client.id];

  if (typeof clientContext == "undefined") 
    clientContext = this.clients[client.id] = { active: false
                                              , requestQueue: []
                                              , client: client
                                              };

  for (var i=0, n=client.requestQueue.length; i<n; ++i)
    clientContext.requestQueue.push(client.requestQueue.shift());

  if (!clientContext.active) 
    this.dispatchOne(client.id);
};

Dispatch.prototype.finishedWithRequest = function (clientID) {
  var clientContext = this.clients[clientID];
  clientContext.active = false;

  try {
    if (clientContext.requestQueue.length > 0)
      this.dispatchOne(clientID);
  } catch (e) {
    if (e instanceof ProtocolError) 
      clientContext.client.transport.fatal(clientContext.client, { msg:e.message });
  }
};

Dispatch.prototype.dispatchOne = function (clientID) {
  var clientContext = this.clients[clientID]
    , client = clientContext.client
    , request = clientContext.requestQueue.shift()
    , requestID = request.shift()
    , cmd = request.shift().trim().toUpperCase()
    , self = this;

  clientContext.active = true;

  switch (cmd) {
    case "QUIT":
      process.nextTick(
        function () {
          client.send({ requestID:requestID, body:"bye", ok:true });
          client.stream.end();
        });
      break;

    case "LOCAL":
      var resp = { version: config.VERSION
                 , clients: this.controller.clientCount
                 };

      client.send({ requestID:requestID
                  , body:resp
                  , ok:true 
                  });

      self.finishedWithRequest(clientID);
      break;

    case "CLUSTER":
      pubsub.getClusterInfo(
        function (info) {
          client.send({ requestID:requestID
                      , body:info
                      , ok:true 
                      });

          self.finishedWithRequest(clientID);
        });
      break;

    case "NICK":
      var newNick = (request.shift() || '').trim();

      if (!newNick.length || newNick.length > config.MAX_NICK_LENGTH)
        error.clientFailsAtLife("invalid arg(s)");

      var oldNick = client.nickname;
      pubsub.changeNick(client, newNick, 
        function (ok) {
          var resp = { requestID:requestID
                     , ok:ok 
                     };

          if (!ok) resp.body = { msg: "in use" };
          client.send(resp);

          if (ok) self.controller.nickChanged(client, oldNick, newNick);
          self.finishedWithRequest(clientID);
        });
      break;

    case "LIST":
      pubsub.getChannelList(
        function (list) {
          client.send({ requestID:requestID
                      , body:list
                      , ok:true 
                      });

          self.finishedWithRequest(clientID);
        });
      break;

    case "WHO":
      var channel = (request.shift() || '').trim();
      if (!channel)
        error.clientFailsAtLife("invalid arg(s)");

      pubsub.getSubscribersTo(channel, 
        function (list) {
          client.send({ requestID:requestID
                      , body:list
                      , ok:true 
                      });

          self.finishedWithRequest(clientID);
        });
      break;

    case "SUB":
      var channel = (request.shift() || '').trim();
      if (!channel)
        error.clientFailsAtLife("invalid arg(s)");

      if (client.subscriptions && 
          client.subscriptions.length >= config.MAX_SUBSCRIPTIONS_PER_CLIENT) {
        client.send({ requestID:requestID
                    , ok:false
                    , body:{ msg:"too many subscriptions" } 
                    });

        self.finishedWithRequest(clientID);
      } else {
        pubsub.subscribe(client, channel, 
          function (ok) {
            client.send({ requestID:requestID
                        , ok:ok 
                        });

            self.finishedWithRequest(clientID);
          });
      }
      break;

    case "UNSUB":
      var channel = (request.shift() || '').trim();
      if (!channel)
        error.clientFailsAtLife("invalid arg(s)");

      pubsub.unsubscribe(client, channel, 
        function () {
          client.send({ requestID:requestID
                      , ok:true 
                      });

          self.finishedWithRequest(clientID);
        });
      break;

    case "PUB":
      var channel = (request.shift() || '').trim();
      var message = (request.shift() || '').trim();

      if (!channel || !message)
        error.clientFailsAtLife("invalid arg(s)");

      pubsub.publish(client.nickname, channel, message, 
        function () {
          client.send({ requestID:requestID
                      , ok:true 
                      });

          self.finishedWithRequest(clientID);
        });
      break;

    default:
      // TODO this is where we'd hook into protocol extensions

      error.clientFailsAtLife("unknown command");
      break;
  }
};
