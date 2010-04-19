# A simple chat sample for .

1. Launch Redis.
1. Launch NodeRed with the `ws` transport enabled: `bin/nodered-run --transport=ws://127.0.0.1:8080 --name=foo`
1. Open two browser windows to the `client.html` file.
1. Enter a unique nickname in both windows.
1. In both windows, subscribe to a channel (invent a channel name).
1. In one window, publish a message (e.g. Hello!).
1. See it in the other window.  
1. Profit?

![Screenshot](http://github.com/fictorial/nodered/raw/master/sample/webchat/screenshot.png)

Requires browsers that support HTML5 WebSockets.  This demo has been tested on
Google Chrome and WebKit Nightly, both on Mac OS X.

