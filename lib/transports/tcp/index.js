var net       = require("net")
  , logger    = require("../../logger")
  , makeReply = require("../../reply").makeReply
  , Client    = require("../../client").Client
  , Parser    = require("../../request").Parser
  , Dispatch  = require("../../dispatch").Dispatch
  , config    = require("../../config");

function makePrintable(str) {    // not 100% of course.
  var s = str;

  s = s.replace(/\r\n/g, '<CRLF>');
  s = s.replace(/\r/g, '<CR>');
  s = s.replace(/\n/g, '<LF>');

  return s;
}

function TCPTransport(controller, options) {
  this.controller = controller;
  this.dispatch = new Dispatch(controller);

  var self = this;

  this.server = net.createServer(
    function (stream) {
      stream.setEncoding("utf8");
      stream.setNoDelay();
      stream.timeout = 0;

      var client = new Client(self, stream);

      try {
        self.controller.clientConnected(client);
      } catch (e) {
        self.fatal(client, {msg:e.message});
      }
      
      var parser = new Parser();
      client.mostRecentRequestID = -1;

      stream.addListener("data", 
        function (chunk) {
          if (self.controller.inShutdown)
            return;

          if (DEBUG) 
            logger.debug("TCP/RECV  " + client.nickname 
                                      + "@" 
                                      + client.stream.remoteAddress 
                                      + " " 
                                      + makePrintable(chunk));

          if (parser.feed(chunk) > config.MAX_BUFFER_LENGTH) 
            self.fatal(client, { msg:"flooding" });

          try {
            while (true) {
              var request = parser.getNextRequest();
              if (!request) break;

              if (request[0] <= client.mostRecentRequestID) {
                self.fatal(client, { msg:"request IDs must increase" });
              } else {
                client.mostRecentRequestID = request[0];

                if (client.enqueueRequest(request) > config.MAX_QUEUED_REQUESTS)
                  self.fatal(client, { msg:"flooding" });
              }
            }
          } catch (e) {
            Error.captureStackTrace(e);
            logger.error("TCP/ERROR  " + e);
            self.fatal(client, { msg:"invalid request" });
          }

          try {
            self.dispatch.addRequestsForClient(client);
          } catch (e) {
            if (e instanceof ProtocolError)
              self.fatal(client, { msg:e.message });
            else
              throw e;
          }
        });

    stream.addListener("end", 
      function () {
        self.controller.clientDisconnected(client);
        stream.end();
      });
  });

  var port = options.port || 8080
    , host = options.host || '127.0.0.1';

  this.server.listen(port, host);
  logger.info("TCP/LISTEN  " + host + ":" + port);
}

// All transports must export a 'create' function like so:

exports.create = function (controller, options) {
  return new TCPTransport(controller, options);
};

// All transport prototypes must have a 'sendReply' function.
// 'client' is a client.Client
// 'options' is passed to reply.makeReply()

TCPTransport.prototype.sendReply = function (client, options) {
  if (client.stream && client.stream.writable) {
    var reply = makeReply(options);

    if (DEBUG) 
      logger.debug("TCP/SEND  " + client.nickname 
                                + "@" 
                                + client.stream.remoteAddress 
                                + " " 
                                + makePrintable(reply));

    client.stream.write(reply, "utf8");
  }
};

// All transport prototypes must have a 'fatal' function.

TCPTransport.prototype.fatal = function (client, err) {
  this.sendReply(client, { body:err
                         , ok:false 
                         });

  client.stream.end();
};
