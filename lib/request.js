var error = require("./error");

function Parser(input) {
  this.input = input || '';
}

exports.Parser = Parser;

Parser.prototype.feed = function (chunk) {
  this.input += chunk;
  return this.input.length;
};

var lineRegex = /^(.+)\r\n/;

Parser.prototype.getNextRequest = function () {
  var match = this.input.match(lineRegex);
  if (!match) return null;
  this.input = this.input.substr(match[0].length);
  try {
    var obj = JSON.parse(match[1]);
    this.validateRequest(obj);
    return obj;
  } catch (e) {
    error.clientFailsAtLife("malformed");
  }
};

Parser.prototype.validateRequest = function (request) {
  if (!(request instanceof Array) ||
      request.length < 2 ||
      typeof request[0] != "number" ||
      typeof request[1] != "string") 
    throw new Error("malformed");
};

