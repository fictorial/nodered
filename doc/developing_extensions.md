# Developing NodeRed Extensions

Create a new Node.js module which exports a function named `init_extension`.
Install the module somewhere where NodeRed may find it via a vanilla
`require`.  Tell NodeRed to load the extension by adding an entry to the
config file.  After NodeRed loads the module, it invokes
`$module.init_extension(options, context)` where `options` is an `Object`
from the config file; and `context` is an `Object` that forms the NodeRed
instance's context or state.  *It is through modifications of `context` that
an extension customizes NodeRed.* We will detail `context` but first, some
examples.

## Request Handler Extensions

To add a new request handler, call `context.dispatch.add_handler(handler)` in
your module's `init_extension` function.  Here, `handler` is an `Object` with
properties like `on_WHATEVER` which is a `Function` that is called when a
client sends a request with a `cmd` equal to `WHATEVER`.  

The handler function is passed the `Client` that made the call, the request
body/value, and a callback function that **must** be called when the request
has been handled.  Recall that I/O processing in Node.js is asynchronous. If
any extension performed I/O the result of processing the command would not be
immediately available. Hence, the callback function.  

Note that a request handler may do whatever it pleases, including killing the
client connection, or overriding an existing request handler implementation.

The following is a simple NodeRed extension that adds two new request handlers,
one for the command `FOOBAR` and another for the command `KILLME`.

    exports.init_extension = function (options, context) {
      context.dispatch.add_handler({ 
        on_FOOBAR: function (client, request, callback) {
          client.respond("hello, client!");
          callback();
        },
        on_KILLME: function (client, request, callback) {
          client.kill("bye!");
          callback();
        }
      });
    };

`Client` has the following methods:

- `.respond(value)`
- `.notify(value)`
- `.kill(reason)` where `reason` has a `toString()` method

Note that request handler extensions add their own handlers to the
dispatch object.  An extension *can* muck with existing extensions
in order to alter or replace existing request handlers.  Extensions
are initialized in the same order as specified in the config file.

## Events

The `context` passed to `init_extension` has an `EventEmitter` that emits
events when interesting things happen in NodeRed.  Here is an example extension
that resets a client connection as soon as the client connection is
established!

    exports.init_extension = function (options, context) {
      context.emitter.addListener("connected", function (client) {
        client.kill("none shall pass!");
      });
    }

The events emitted are as follows:

- `connected` passing `client`
- `disconnected` passing `client`
- `killed` passing `client, reason`

Extensions may use the emitter to emit their own events.

## Cleaning up

An extension module may export an optional function which will be called
on server shutdown.  This function has the form:

    exports.deinit_extension = function (context, callback) {
        // ...
        callback();
    };

where `context` is the same context passed to `init_extension`; and 
`callback` is a function that **must** be called when deinit has 
finished.

# The `context` Object

The `context` object passed to an extension module's `init_extension` function
contains the following keys:

`version`

* `String`
* version of NodeRed in the form 'major.minor.release'
* "read-only"

`node_id`

* `Number`
* auto-assigned NodeRed instance/node ID
* "read-only"

`node_name`

* `String`
* name of the NodeRed instance from the config file
* "read-only"

`max_clients`

* `Number`
* maximum Number of concurrently connected clients allowed
* initial value from the config file
* read-write

`max_request_size`

* `Number`
* maximum size of any single client request (in bytes); a value larger than
  this causes the client to be disconnected due to "flooding"
* initial value from the config file 
* read-write

`max_queued_requests`

* `Number`
* maximum Number of requests any single client may have queued before 
  NodeRed considers the client to be "flooding" the server
* initial value from the config file
* read-write

`servers`

* `Array`
* each element is an `Object` of the form `{ type: "tcp", ip: "x.y.z.w", port: 8080 }`
    * `type` is one of "ws" or "tcp"
* "read-only"

`extensions`

* `Array`
* each element is an `Object` of the form `{ name: "metadata", type: "node", "module": "path" }`
* `type` is only "node" at this time
* `module` is the path to the extension module to load
* "read-only"

`metadata_key`

* `String`
* the key to use in Redis to access this node's metadata (a Redis `HASH`)
* "read-only"

`emitter`

* `events.EventEmitter`
* an event emitter that emits events when interesting things occur
* "read-only"

`clients`

* `Object` as associative array 
* "read-only"

`redis`

* `Object` as associative array 
* contains information about the Redis instance in use
    * keys include `port`, `host`, `db`, `version`
    * these keys and values are "read-only"
* also contains a `redis-node-client` client at key `client` which acts as a means to query Redis

