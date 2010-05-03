![Logo](http://github.com/fictorial/nodered/raw/master/doc/logo.png)

NodeRed is an extensible network service container for Node.js.

NodeRed provides plumbing such as a TCP/IP and WebSocket server,
a protocol parser, a request dispatcher, inter-node communication via
[Redis'](http://code.google.com/p/redis/) PUBSUB features, and extensibility
via JavaScript.

NodeRed is written for [Node.js](http://nodejs.org).  Moreover, extensions are
simply Node.js modules.  These extensions may add new request handlers to the
NodeRed client-server protocol; may hook into NodeRed client-handling events
(e.g. on client connection); and may emit their own events that yet other
extensions may listen for and react to.  

An extension might add a feature such as user registration, authentication,
validating the moves made in a chess game, perform web searches, query a
database, anything really.  Extensions may piggyback on the functionality of
other installed extensions (provided they know how to do so).  

Clients may perform basic "service discovery" to determine which extensions
are installed on any NodeRed instance. 

A NodeRed client connects to a single NodeRed instance in a cluster, issues one
or more requests over some arbitrary period of time, receives responses and
pushed notifications, and disconnects.  

NodeRed is compatible with Node.js 0.1.91 or later and Redis 1.3.8 or later.
