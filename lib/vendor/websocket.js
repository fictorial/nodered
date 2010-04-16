/*
Copyright (c) 2010 Tim Caswell <tim@creationix.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

var net = require('net'),
    sys = require('sys'),

    // what the request headers should match
    requestHeaders = new RegExp(
      "^GET (\/[^\s]*) HTTP\/1\.1\r\n" +
      "Upgrade: WebSocket\r\n" +
      "Connection: Upgrade\r\n" +
      "Host: (.+)\r\n" +
      "Origin: (.+)\r\n\r\n"
    ),

    // what the response headers should be
    responseHeaders =
      "HTTP/1.1 101 Web Socket Protocol Handshake\r\n" +
      "Upgrade: WebSocket\r\n" +
      "Connection: Upgrade\r\n" +
      "WebSocket-Origin: {origin}\r\n" +
      "WebSocket-Location: {protocol}://{host}{resource}\r\n\r\n",

    // Initial policy request from flash
    // TODO: find a safer match that won't grab text in the data stream
    policyRequest = /policy-file-request/,

    // Policy file needed by flash based sockets
    policyXML =
      '<?xml version="1.0"?>' +
      '<!DOCTYPE cross-domain-policy SYSTEM ' +
      'ww.macromedia.com/xml/dtds/cross-domain-policy.dtd">' +
      '<cross-domain-policy>' +
      "<allow-access-from domain='*' to-ports='*'/>" +
      '</cross-domain-policy>';


exports.createServer = function (on_connect) {
  var server = net.createServer(function (socket) {
    var websocket = new process.EventEmitter();

    // Wrap some of the tcp socket methods.
    websocket.write = function (data) {
      try {
        if (socket.writable) socket.write('\u0000', 'binary');
        if (socket.writable) socket.write(data, 'utf8');
        if (socket.writable) socket.write('\u00ff', 'binary');
        return true;
      } catch(e) {
        e.message = e.message;
        sys.debug(sys.inspect(e));
        if (e.message === 'Socket is not open for writing') {
          setTimeout(function () {
            websocket.write(data);
          }, 100);
        } else {
          throw e;
        }
      }
      return false;
    };

    // Must set encoding to UTF-8 for handshake, else
    // the 'data' callback receives a buffer.Buffer object.

    socket.setEncoding('utf8');

    [ "resume"
    , "pause"
    , "setTimeout"
    , "setNoDelay"
    , "setEncoding"
    , "end"
    ].forEach(function (toProxy) {
      websocket[toProxy] = function () {
        net.Stream.prototype[toProxy].apply(socket, arguments);
      };
    });

    Object.defineProperty(websocket, 'readyState', { 
      get: function () {
        return socket.readyState;
      }
    });

    Object.defineProperty(websocket, 'remoteAddress', { 
      get: function () {
        return socket.remoteAddress;
      }
    });

    Object.defineProperty(websocket, 'writable', { 
      get: function () {
        return socket.writable;
      }
    });

    Object.defineProperty(websocket, 'readable', { 
      get: function () {
        return socket.readable;
      }
    });

    socket.addListener('data', function (data) {
      var matches, chunks;

      if(data.match(policyRequest)) {
        socket.write(policyXML);
        socket.end();
        return;
      }

      matches = data.match(requestHeaders);
      if (matches) {
        handshake(matches);
        on_connect(websocket);
        return;
      }

      chunks = data.split('\ufffd');
      chunks.pop();
      chunks.forEach(function (chunk) {
        if (chunk[0] != '\u0000') {
          throw "Invalid chunk";
        }
        websocket.emit('data', chunk.substr(1, chunk.length));
      });
    });

    socket.addListener('end', function () {
      websocket.emit('end');
    });

    function handshake(matches) {
      var response = responseHeaders.
        replace("{resource}", matches[1]).
        replace("{host}", matches[2]).
        replace("{origin}", matches[3]).
        replace("{protocol}", 'ws');
      socket.write(response);
    }

  });

  return {
    listen: function (port, host) {
      server.listen(port || 8080, host || "127.0.0.1");
    }
  };
};
