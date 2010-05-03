# Redis Schema

NodeRed uses Redis to store information about the cluster, and for inter-node communications
via PUBSUB.

Extensions are free to use Redis as they see fit as well.

Redis support for Node.js comes by way of `redis-node-client` which is *bundled* with NodeRed.

### nr:cluster

All nodes in the cluster.

A ZSET in which the key is the node name and the score is the node ID.

### nr:nodeid

A node ID sequence generator.

An INTEGER.

### nr:cluster:$id

Metadata about the node with ID `$id`.

A HASH with the following keys:

`name`

- `String`
-  name of the node

`id`

- `Number`
- node ID

`version`

- `String`
- NodeRed version ("x.y.z")

`nodejs_version`

- `String`
- Node.js version (e.g. "v0.1.90-27-g9cf2a02")

`platform`

- `String`
- OS (e.g. "darwin")

`up_since`

- `Number`
- UNIX epoch timestamp

`client_count`

- `Number`
- Spans all servers

`servers`

- `String`
- "$type://$ip:$port,$type://$ip:$port,..."
- `$type` is one of { "tcp", "ws" }

`mem`

- `String` 
- JSON encoded `Object` describing memory usage for the node
