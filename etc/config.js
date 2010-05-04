configuration = { 
  node_name: "default",  // ensure this is unique in your cluster
  redis: { 
    ip: '127.0.0.1', 
    port: 6379, 
    db: 1
  },
  servers: [ 
    { type: 'tcp', ip: '127.0.0.1', port: 8080 },
    { type: 'ws',  ip: '127.0.0.1', port: 8081 }
  ],
  extensions: [
    { 
      name: "basic",
      type: "node",
      module: "../lib/ext/basic" 
    },
    { 
      name: "metadata",
      type: "node",
      module: "../lib/ext/metadata" 
    },
    { 
      name: "pubsub",
      type: "node",
      module: "../lib/ext/pubsub", 
      options: { db: 1 } 
    },
    { 
      name: "nickname",
      type: "node",
      module: "../lib/ext/nickname", 
    }
  ],
  max_clients: 50000,
  max_request_size: 50240,
  max_queued_requests: 100
};
