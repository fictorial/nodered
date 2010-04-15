var sys = require("sys");

var INFO  = "INFO/"
  , DEBUG = "DEBUG/"
  , ERROR = "ERROR/";

function log(level, msg) {
  sys.error(level + msg);
}

exports.info = function (msg) {
  log(INFO, msg);
};

exports.debug = function (msg) {
  log(DEBUG, msg);
};

exports.error = function (msg) {
  log("\033[7m" + ERROR + "\033[0m", 
      "\033[7m" + msg + "\033[0m");
};
