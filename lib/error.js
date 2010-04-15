var sys = require("sys");

global.ProtocolError = function (message) {
  this.message = message;
  Error.call(this, message);
  if (Error.captureStackTrace) 
    Error.captureStackTrace(this, exports.clientFailsAtLife);
};

sys.inherits(ProtocolError, Error);

exports.clientFailsAtLife = function (message) {
  throw new ProtocolError(message);
};

