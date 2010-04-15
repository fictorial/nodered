# NodeRed Redis Schema

This document describes how NodeRed uses Redis to store information
about the cluster.

## Database Number

The database number is configurable at node launch time.  See
the *NodeRed Operations Guide*.

## `nr:cluster`

All nodes in the cluster.

A ZSET in which the key is the node name and the score is the node ID.

## `nr:nodeid`

A node ID sequence generator.

An INTEGER.

## `nr:cluster:$id`

Metadata about the node with ID `$id`.

A HASH with the following keys:

- `name`: string; name of the node
- `id`: integer; node ID
- `version`: string; NodeRed version ("x.y.z")
- `upSince`: integer; UNIX epoch timestamp
- `clientCount`: integer; Spans all transports
- `$transport`: string; "host:port"
    - `$transport` is one of { "tcp" }

## `nr:nicks`

Nicknames in use by clients.

A ZSET in which the key is the nickname and the score is the node ID to which
the client with the given nickname is connected.

## `nr:chan:$name`

Subscribers to channel `$name`.

A ZSET in which the key is the nickname and the score is the node ID which
subscribes to the given channel.

