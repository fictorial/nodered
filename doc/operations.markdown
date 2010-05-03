# NodeRed Operations Guide

## Installation

### Git clone

    git clone git://github.com:fictorial/nodered.git

### Seed.js

TBD

## Configuration

### config.js

Edit config.js (`etc/config.js`) as needed.

The default (annotated) config.js is shown here:

    configuration = { 

        // The name of the NodeRed instance/node. 
        // Ensure this is unique in your cluster.

        node_name: "default", 

        // The Redis instance to connect to.

        redis: { 
            ip: '127.0.0.1', 
            port: 6379, 
            db: 1
        },

        // Servers to enable.  TCP/IP and HTML5 WebSockets are supported.

        servers: [ 
            { type: 'tcp', ip: '127.0.0.1', port: 8080 },
            { type: 'ws',  ip: '127.0.0.1', port: 8081 }
        ],

        // Extensions to enable.
        // Always enable at least 'basic' and 'metadata'.

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
            }
        ],

        // If there are too many clients connected, disallow 
        // further connections.

        max_clients: 50000,

        // If a client sends a request that is too large,
        // reset their connection.  Unit: bytes.

        max_request_size: 50240,

        // If a client sends too many requests (flooding),
        // reset their connection.  A client has 1 command
        // processed at a time; the rest are enqueued.

        max_queued_requests: 100
    };

## ENVIRONMENT

    NODERED_DEBUG=1

If set, enables (synchronous) debug output on stderr.

    NODERED_CONFIG_PATH=path/to/config.js

Where to find config.js.

## Shutting Down

By default, NodeRed will attempt to shutdown cleanly 
when it receives any of the following signals:

- SIGINT
- SIGKILL
- SIGQUIT
- SIGTERM

By "cleanly" we mean that the following steps are taken:

1. The node is configured to stop accepting new connections;
1. the node is configured to stop processing new input;
1. the node is removed from the cluster by updating metadata in Redis;
1. the node's extensions are given a chance to cleanup;
1. the clients are disconnected;
1. the node shuts down.

### Resetting node state after an unclean shutdown

If a node is not given a chance to shutdown cleanly, perhaps due to hardware
failure or simply a `kill -9`, the state or remnants of the node will remain in
Redis.  Such outdated data can be cleaned up with the
`nodered-reset` script.  

    nodered-reset <name> [<redis host> [<redis port> [<redis db>]]]

Here's an example:

    $ bin/nodered.js &
    [2] 45316

    $ kill -9 %2
    [2]-  Killed                  bin/nodered.js

    $ bin/nodered.js
    [2] 45318

    3 May 15:14:51 - nodered v0.5.0
    3 May 15:14:51 - node.js v0.1.93
    3 May 15:14:51 - [tcp] 127.0.0.1:8080 listening!
    3 May 15:14:51 - [ws] 127.0.0.1:8081 listening!
    3 May 15:14:51 - redis v1.3.10 @ 127.0.0.1:6379/1
    Error: name 'default' is non-unique in the cluster
        at Function.<anonymous> (/Users/brian/projects/scratch/nr/bin/nodered.js:324:23)
        at applyArgs (/Users/brian/projects/scratch/nr/lib/vendor/flow.js:9:15)
        at /Users/brian/projects/scratch/nr/lib/vendor/flow.js:39:6
        at Client.onReply_ (/Users/brian/projects/scratch/nr/lib/vendor/redis-client.js:389:28)
        at /Users/brian/projects/scratch/nr/lib/vendor/redis-client.js:143:30
        at ReplyParser.feed (/Users/brian/projects/scratch/nr/lib/vendor/redis-client.js:169:21)
        at Stream.<anonymous> (/Users/brian/projects/scratch/nr/lib/vendor/redis-client.js:332:28)
        at Stream.emit (events:25:26)
        at IOWatcher.callback (net:365:18)
        at node.js:176:9

    [2]-  Exit 1      bin/nodered.js

    $ bin/nodered-reset default

    WARNING!

    This script will reset the state of a NodeRed node
    as stored in Redis.

    A NodeRed node cleans up after itself in Redis on a
    clean shutdown (kill $pid, ^C (SIGINT), etc.).  But,
    when forcibly shutdown (kill -9, hardware failure, etc.),
    the node has no chance to clean up after itself.
    This script will do such clean up ex post facto.

    You have requested to reset the Redis state of node

            default

    in the Redis instance at 127.0.0.1:6379 (db 1)

    Are you sure you want to do this (enter YES or NO): 
    YES

    Removing node from cluster
    (integer) 1
    Removing the node metadata
    (integer) 0
    DONE!

    $ bin/nodered.js &
    [2] 45329

    3 May 15:15:54 - nodered v0.5.0
    3 May 15:15:54 - node.js v0.1.93
    3 May 15:15:54 - [tcp] 127.0.0.1:8080 listening!
    3 May 15:15:54 - [ws] 127.0.0.1:8081 listening!
    3 May 15:15:54 - redis v1.3.10 @ 127.0.0.1:6379/1
    3 May 15:15:54 - [ext:basic] initializing.
    3 May 15:15:54 - [ext:metadata] initializing.
    3 May 15:15:54 - [ext:pubsub] initializing.
    3 May 15:15:54 - ready! ☺

    ...

