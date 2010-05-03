# NodeRed Tests

Requires: ncat.

These are not unit tests.  You have to understand how NodeRed works and
interpret the output.  However, running NodeRed in the background of the same
terminal will weave NodeRed's output with that of the test runner, making
debugging that much easier.

Ensure that your `bin/config.js` starts a TCP server on `127.0.0.1:8080` or
edit accordingly.

    $ bin/nodered.js &
    $ cd test/functional
    $ ./run
