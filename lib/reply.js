exports.makeReply = function (options) {
  var reply = [ (typeof options.requestID === "undefined") 
                                           ? null 
                                           : options.requestID
              , options.ok 
              ];

  if (typeof options.body != "undefined")
    reply.push(options.body);

  return JSON.stringify(reply) + "\r\n";
};

