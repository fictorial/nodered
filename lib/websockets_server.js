var TcpServer = require("./tcp_server").TcpServer;

// The WebSockets module is a drop-in replacement for the 'net' module,
// so we just abstract the TcpServer a bit to achieve WebSockets support.

exports.create = function (ip, port) {
  return new TcpServer(ip, port, require('./vendor/websocket'), 'ws');
};
