# Bundled Extension: pubsub

Part of the bundled functionality is "PUBSUB" (publisher-subscriber) in which a
client subscribes to one or more channels, and publishes zero or more messages
to any channel.  A NodeRed instance subscribes in Redis to the set of channels
its connected clients have subscribed to. A NodeRed instance forwards publish
requests to Redis which in turn sends the message to other connected NodeRed
instances.  When a NodeRed instance receives a published message from Redis, it
sends the message to any and all connected clients subscribed to the channel of
the published message.

A channel *pattern* uses wildcards as in `countries.*`, `sizes.?xl`, and
`h[eu]llo, w[uo]rld`.

## SUBSCRIBE request

The client subscribes to the given channel or channel pattern.

    --> { "id": Number, 
          "cmd": "SUBSCRIBE", 
          "body": [ "$channel_name_or_pattern" ] 
        } <CRLF>

    <-- { "id": Number, "body": true } <CRLF>

## PUBLISH request

The client publishes a message to the given channel.  *Note* the client *does not* need
to be subscribed to the given channel before publishing to it.

    --> { "id": Number, 
          "cmd": "PUBLISH", 
          "body": [ "$channel", "$message" ] 
        } <CRLF>

    <-- { "id": Number, "body": true } <CRLF>

## UNSUBSCRIBE request

The client unsubscribes from the given channel or channel pattern.  Note that channels
and patterns are treated distinctly.

    --> { "id": Number, 
          "cmd": "UNSUBSCRIBE", 
          "body": [ "$channel_name_or_pattern" ] 
        } <CRLF>

    <-- { "id": Number, "body": true } <CRLF>

## MESSAGE notification

Sent by the NodeRed instance when another client, an extension, or NodeRed
itself publishes a message.  

    <-- { "notice": {
            "message": {
                "from":"42@127.0.0.1",
                "msg":"hello",
                "channel":"greetings"
            }
          }
        } <CRLF>

## LIST request

A client wishes to know the channels that have active subscribers.

    --> { "id": Number, "cmd": "LIST" } <CRLF>

    <-- { "id": Number, "body": [ "$channel", ... ] } <CRLF>

## Additions to `context`

The pubsub extension adds the following to `context`:

`pubsub.subscriptions`

* An `Object` as associative array where the key is a channel name or pattern 
  to which at least one connected client is subscribed and whose value is 
  an `Object` as associative array where the key is the client id and whose
  value is the `Client` object.
* i.e. `pubsub.subscriptions = { $channel: { id: Client, ... }, ... }`

`pubsub.client`

* A `redis-node-client` client that is used to handle PUBSUB in Redis. 
  This is an additional connection to Redis which is required as handling
  subscriptions puts a Redis client connection into subscription mode wherein
  only PUBSUB related commands may be issued.  The same database number as
  specified on the CLI is used for PUBSUB but it should not matter.

## Additions to the Redis Schema

### `pubsub:ch:$chan`

A ZSET of clients subscribed to the given channel. The value is the client
ID and the score is the node ID to which the client is connected.

## Additions to `Client` objects

`subscriptions => { chan: 1, ... }`

The channels the client is subscribed to.

## Events Emitted

`subscribed` 

Emitted when a client subscribes to a channel.
Passes `(channel_name_or_pattern, client)`.

`unsubscribed`

Emitted when a client unsubscribes to a channel.
Passes `(channel_name_or_pattern, client)`.

