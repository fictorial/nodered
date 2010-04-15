# NodeRed FAQ

## Why are you recreating IRC, poorly?

NodeRed is not an IRCd.  NodeRed is defined in terms of content-agnostic
messages, topic channels, subscribers, and publishers.  It is more similar to a
very simple message broker.

## Is this a pubsubhubbub server?

No, NodeRed is not a [pubsubhubbub](http://code.google.com/p/pubsubhubbub)
server.

## Why not use a binary protocol and use Protocol Buffers, Thrift, Avro, etc.?

Because of the added complexity of such serialization systems, it seems like
premature optimization to *start* with them.  Also consider that JSON is easily
consumed by web browser based NodeRed clients.

## Why use Redis for PUBSUB?  Use a Message Broker!  Use RabbitMQ you dummy!!1!

Firstly, I happen to already use Redis for data storage in my apps. 

Secondly, this type of system does not require the sophistication that the AMQP
model offers and the extra administration and higher minimal system
requirements to run. 

If you think this is crazy or have concerns about using Redis instead of
something like RabbitMQ, by all means use RabbitMQ.  You won't be disappointed.

