var logger = require("./logger")
  , pubsub = require("./pubsub")
  , config = require("./config")
  , flow   = require("./vendor/flow");

function Controller(options) { 
  this.clients     = {};
  this.clientCount = 0;
  this.inShutdown  = false;

  var self = this;

  options.transports.forEach(
    function (transport) {
      logger.info("CONTROLLER/INIT  loading '" + transport.name + "'");

      var mod = require("./transports/" + transport.name);
      self[transport.name] = mod.create(self, transport);
    });
};

exports.Controller = Controller;

Controller.prototype.nickChanged = function (client, oldNick, newNick) {
  logger.info("CONTROLLER/NICK  " + oldNick + " " + newNick);

  delete this.clients[oldNick];
  this.clients[newNick] = client;
};

Controller.prototype.clientConnected = function (client) {
  logger.info("CONTROLLER/CONNECT  " + client.nickname 
                                     + "@" 
                                     + client.stream.remoteAddress);

  if (this.inShutdown)
    throw new Error("shutting down");

  if (this.clientCount >= config.MAX_CLIENTS)
    throw new Error("overloaded");

  this.clients[client.nickname] = client;

  pubsub.controlClient.hincrby('nr:cluster:' + NODE_ID,
    'clientCount', 1, throwOnRedisError);
};

var disconnectFlow = flow.define(
  function unsubscribeFromAllChannels(controller, client) {
    this.client = client;
    this.controller = controller;

    var subs = Object.getOwnPropertyNames(client.subscriptions);
    if (typeof subs == "undefined" || subs.length == 0) {
      this();
    } else {
      for (var i=0, n=subs.length; i<n; ++i) 
        pubsub.unsubscribe(client, subs[i], this.MULTI());
    }
  },
  function releaseNick(argsArray) {
    if (argsArray) {
      argsArray.forEach(
        function (args) {
          if (args[0]) throw err;
        });
    }
    pubsub.doneWithNick(this.client.nickname, this);
  },
  function cleanup(err, reply) {
    delete this.controller.clients[this.client.nickname];
    this.controller.clientCount--;

    pubsub.controlClient.hincrby('nr:cluster:' + NODE_ID, 
      'clientCount', -1, throwOnRedisError);
  }
);

Controller.prototype.clientDisconnected = function (client) {
  logger.info("CONTROLLER/DISCONNECT  " + client.nickname 
                                        + "@" 
                                        + client.stream.remoteAddress);

  disconnectFlow(this, client);
};
