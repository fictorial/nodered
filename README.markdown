![NodeRed Logo](http://github.com/fictorial/nodered/raw/master/doc/assets/NodeRedLogo.png)

NodeRed is an extensible, scalable, cluster of nodes which communicate via
Redis' PUBSUB features.

NodeRed natively supports PUBSUB over TCP/IP sockets.  However, new transports
(e.g. HTML5 WebSockets) can be added as extensions easily.  In addition, the
client-server protocol can be extended with new request types and associated
handlers (e.g. user authentication).  NodeRed invokes your extensions at the
right times.  Your app logic hooks into NodeRed. 

Applications that might be a good fit for NodeRed are chat, PUBSUB, and game
servers.  Any "real-time" app that may need to scale out may be a good fit 
for NodeRed.

Extensions are trusted (*its your deployment*) written in Javascript, run under
Node.js, and have full access to do as they please.  Be aware that Node.js is
single threaded; you can certainly have long-running request handlers know that
such will block the processing of other requests.

You do not need to use Redis as your app's datastore.  NodeRed simply uses
Redis for bookkeeping and inter-node communications (PUBSUB).

## Ideas for scaling out

![NodeRed Scaling Out](http://github.com/fictorial/nodered/raw/master/doc/assets/NodeRedScaleOut.png)

## Metadata

- Brian Hammond [http://fictorial.com](http://fictorial.com)
- Copyright (C) 2010 Fictorial LLC
- License: MIT
