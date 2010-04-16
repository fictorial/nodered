var tcp = require("../tcp");

// use the drop-in 'net' module replacement from "creationix"
// http://github.com/creationix/websocket

exports.create = function (controller, options) {
  return tcp.create(controller, options, 
    require('../../vendor/websocket'), 'WEBSOCKETS');
};
