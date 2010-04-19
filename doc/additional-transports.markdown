# How to add a new transport to NodeRed

1. Create a module in `lib/transports/$name/index.js`.
1. Add whatever support modules you need to `lib/transports/$name`.
1. Specify that the transport should be loaded on the command-line.

## Command-line syntax for loading a transport

    --transport=$name://ip:port[?$opt=$val,...]

where `$name` is the name of the transport module (e.g. `tcp`);
`ip` is the IP address to bind the transport's server to;
`port` is the local port number to have the transport's server
listen to; `$opt` is an arbitrary transport option; and `$val`
is the associated transport option's value.

Zero or more transport options (`$opt=$val`) are supported.
Note that URI-encoding is not expected; this just looks like
a URI. You may consider enclosing `--transport` command-line 
parameters in single-quotes to avoid interpretation by the
shell.  For example:

    '--transport=foo://127.0.0.1:9999?eggs=good&bacon=better'

Do not use `ip` or `port` for any `$opt`.

## Transport modules

A transport module must export the following function:

    create(controller, options)

where `controller` is a `controller.Controller` object, and
`options` is an `Object` (as associative array) containing options
as parsed from the command-line.  Following the example command-line
above, `options` would be:

    { ip: 127.0.0.1
    , port: 9999
    , eggs: "good"
    , bacon: "better"
    }

The `create` function should return a (transport) `Object`.

## Transport objects

Transport objects must have the following methods:

    sendReply(client, replyParts)
    fatal(client, err)

where `client` is an instance of `client.Client`; `replyParts` is
an `Object` (as associative array); and `err` is an error message 
(a `String`).

`sendReply` should take the `replyParts`, inject or modify any 
part, serialize the parts as a UTF-8, JSON-encoded representation
via `reply.makeReply(parts)`, and write it to the client.  

`fatal` should serialize `err` as an error reply, write the error
reply to the client, then close the client connection/stream.

## Transport expectations

The transport should call `controller.clientConnected(client)` when
a client connects.  This may throw an exception if the client is not
allowed to connect, the server is too busy, etc.  Catch the exception
and issue a `fatal(client, {msg: err.message})`.

The transport should call `controller.clientDisconnected(client)` when
a client disconnects.

The value `controller.inShutdown` will be set to `true` when the node is being
shutdown.  The transport should not allow further client commands to be
processed when in "shutdown mode."

## Learning by example

See the TCP transport in `lib/transports/tcp/index.js` for an example
transport.

