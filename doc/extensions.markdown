# NodeRed Extensions

Extensions are JavaScript modules that augment or change the features of
a NodeRed server. 

An extension does any of the following:

- adds new C2S request handlers or "new words" to the vocabulary of the
  client-server language (protocol extensions); 
- alters the behavior of NodeRed (event hooks)

Extensions are written in Javascript.  The source to an extension may be loaded
from Redis or from a Node.js module.  Loading extensions from Redis allows the
server admin to reload extensions into a running NodeRed server.  Loading
extensions from Node.js modules is of course more intuitive.

Extensions are fully *trusted* as they are loaded through a private mechanism
(local modules or your own private Redis deployment).  To be explicit: *NodeRed
never accepts Javascript from clients.* Since extensions are trusted, they may
utilize any and all of Node.js' features and APIs.  However, be aware that
Node.js is single-threaded.  *No other code runs while extension code runs*.
An extension may of course perform long-running, blocking operations.  Since
*your deployment is your deployment* you have control over which extensions are
activated, what they do, and how they do it.

## Protocol Extensions

Protocol extensions add to the vocabulary of the shared language that clients
and servers speak.  Protocol extensions register a Javascript function that is
called back when a client sends an associated request.  Protocol extension
requests are prefixed to support namespaces.  

## Event Hooks

**TBD**

## Extension Discovery

The `INFO` built-in request returns the active extensions of a particular
NodeRed server.  A client should check for supported extensions to ensure it
can effectively communicate with an extended vocabulary to a NodeRed server.

## Configuring Extensions

Which extensions to load into NodeRed and associated options for each are
configured using Redis.  

**TBD**

## Example

NodeRed does not support user registration, authentication, nor authorization
implicitly.  An extension (or a number of related extensions) might provide for
such functionality via protocol extensions.  Perhaps the new C2S requests would
resemble:

    [ requestID, "auth:REGISTER", { "nick":"brian", "pass":"ilovemygiraffe" } ]
    [ requestID, "auth:LOGIN", { "nick":"brian", "pass":"ilovemymonkey" } ]

