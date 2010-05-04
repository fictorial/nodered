var 
  sys = require("sys"),
  byteLength = require("buffer").Buffer.byteLength;

function Parser(client) {
  this.input = '';
  this.client = client;
}

Parser.prototype.feed = function (chunk) {
  this.input += chunk;

  if (byteLength(this.input) > our.max_request_size) 
    throw new Error("flooding");

  var match;
  while (match = this.input.match(/^(.+?)\r\n/)) {
    this.input = this.input.substr(match[0].length);

    var request;
    try { 
      request = JSON.parse(match[1]); 
    } catch (e) {
      sys.log(e);    // pass-through
    } 

    if (request === undefined || 
        typeof request.cmd != "string" || 
        typeof request.id != "number")
      throw new Error("malformed request");

    this.client.requests.push(request);
    if (this.client.requests.length > our.max_queued_requests)
      throw new Error("flooding");
  }
};

exports.Parser = Parser;

