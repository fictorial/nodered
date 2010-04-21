![NodeRed Logo](http://github.com/fictorial/nodered/raw/master/doc/assets/NodeRedLogo.png)

NodeRed is an extensible topic-based [PUBSUB](http://en.wikipedia.org/wiki/Publish/subscribe) 
server framework for [Node.js](http://nodejs.org) with [Redis](http://code.google.com/p/redis/) 
in the middle.

Nodes/servers accept client connections over TCP/IP or HTML5 WebSockets.  Nodes
*subscribe* to channels/topics in Redis.  Nodes *publish* messages to channels
by sending a request to Redis, which are then forwarded to all active
subscribers.

NodeRed is a *framework*.  Your app hooks into NodeRed via Javascript
extensions.  Plug-ins/add-ons/extensions are written in Javascript and have
access to the [Node.js](http://nodejs.org) [API](http://nodejs.org/api.html).

NodeRed is a good fit for real-time web apps, chat, game servers, etc.

New transports [may be developed easily](http://github.com/fictorial/nodered/raw/master/doc/additional-transports.markdown).

[The protocol](http://github.com/fictorial/nodered/raw/master/doc/protocol.markdown) is simple.

[Scaling out](http://github.com/fictorial/nodered/raw/master/doc/assets/NodeRedScaleOut.png) is easy.

- Brian Hammond [http://fictorial.com](http://fictorial.com)
- Copyright (C) 2010 Fictorial LLC
- License: MIT
