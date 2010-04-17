module.exports = { VERSION: '0.1.0'
                 , SUPPORTED_TRANSPORTS: [ "tcp", "ws" ]
                 , MIN_REDIS_VERSION: '1.3.8'
                 , MAX_CLIENTS: 50000
                 , MAX_BUFFER_LENGTH: 4096
                 , MAX_QUEUED_REQUESTS: 16
                 , MAX_NICK_LENGTH: 32
                 , MAX_SUBSCRIPTIONS_PER_CLIENT: 10
                 , SYSTEM_NICK: "*system*"
                 , SYSTEM_CHANNEL: "*system*"
                 , RESERVED_NICK_REGEX: /^(?:\*system\*|Guest\-.+)/
                 , RESERVED_CHANNEL_REGEX: /^\*system\*/
                 };

global.DEBUG = process.env["NODERED_DEBUG"];

global.throwOnRedisError = function (err, reply) {
  if (err) throw err;
};
