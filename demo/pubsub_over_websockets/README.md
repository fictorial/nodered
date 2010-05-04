# NodeRed PUBSUB over WebSockets Demo

1. Launch Redis.
1. Launch NodeRed with a `ws` server listening on port 8081.
1. Open two browser windows to the `index.html` file.
1. In both windows, subscribe to a channel (invent a channel name).
1. In one window, publish a message (e.g. Hello!).
1. See it in the other window.  

Requires browsers that support HTML5 WebSockets.  This demo has been tested on
Google Chrome and WebKit Nightly, both on Mac OS X.

