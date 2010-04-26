# NodeRed Operations Guide

## Installation

### Git clone

    git clone git://github.com:fictorial/nodered.git
    ./nodered/bin/nodered-run ARGUMENTS [OPTIONS]

### Kiwi

    kiwi install nodered
    nodered-run ARGUMENTS [OPTIONS]

## ARGUMENTS

    --name='<name>'

Each node in a NodeRed cluster must be given a *name* as assigned by you.
The name is an arbitrary string but must be unique in the cluster.

    '--transport=protocol://ip:port?option0=value0&option1=value1'

There must be at least one transport enabled, but multiple transports can be
enabled.  The currently defined `protocol` values are:

- `tcp`
- `ws`

## OPTIONS

    --redis=ip:port[/db][?debug=on|off]

Defines the Redis instance NodeRed should use.  All NodeRed instances that use
the same Redis instance define a "cluster."  

- The default `ip` is `127.0.0.1`.
- The default `port` is `6379`.  
- The default `db` is `1`.
- The default `debug` value is `off`.

If `debug` is `on`, the Redis clients will emit lots of (synchronous) debug
output on stderr.

## ENVIRONMENT

    NODERED_DEBUG=1

If set, enables (synchronous) debug output on stderr.

## EXAMPLES

Here are a few usage examples.

### Basic

    nodered-run --name=foo --transport=tcp://127.0.0.1:8080 

### Full debug output

    NODERED_DEBUG=1 nodered-run --name=foo --transport=tcp://127.0.0.1:8080 --redis=127.0.0.1:6379/1?debug=on

### Starting two local nodes

    nodered-run --name=foo --transport=tcp://127.0.0.1:8080 
    nodered-run --name=bar --transport=tcp://127.0.0.1:8081 

## Shutting Down

By default, NodeRed will attempt to shutdown cleanly 
when it receives any of the following signals:

- SIGINT
- SIGKILL
- SIGQUIT
- SIGTERM

By "cleanly" we mean that the following steps are taken:

1. The node is configured to stop accepting new connections;
1. the node is removed from the cluster by updating metadata in Redis;
1. any subscriptions managed by the node on behalf of connected clients are unsubscribed in Redis;
1. the nicknames of all connected clients are released in Redis;
1. connected clients are sent a `MESSAGE` regarding that the shutdown procedure has begun;
1. when each connected client has read all sent data, the client is disconnected.

This could take some time to complete relative to the number of connected clients, etc.

### Resetting node state after an unclean shutdown

If a node is not given a chance to shutdown cleanly, perhaps due to hardware
failure or simply a `kill -9`, the state or remnants of the node will remain in
Redis.  Such outdated data can be cleaned up with the
`nodered-reset-node-state` script.  

    nodered-reset-node-state <name> [<redis host> [<redis port> [<redis db>]]]

Here's an example:

    $ bin/nodered-run --transport=tcp://127.0.0.1:8080 --name=foo &
    [2] 45316

    INFO/MAIN/VERSION  0.0.8
    INFO/MAIN/NAME  foo
    INFO/MAIN/TRANSPORTS  tcp
    INFO/MAIN/REDIS  {"port":6379,"host":"127.0.0.1","debugMode":false}
    INFO/MAIN/REDIS  1.3.8
    INFO/CONTROLLER/INIT  loading 'tcp'
    INFO/TCP/LISTEN  127.0.0.1:8080

    $ kill %2
    ERROR/MAIN/SIGNAL  SIGTERM
    INFO/MAIN/SHUTDOWN  removing node from cluster.
    INFO/MAIN/SHUTDOWN  removing local subscribers from any channels.
    INFO/MAIN/SHUTDOWN  removing locally-used nicknames.
    INFO/MAIN/SHUTDOWN  cleanly disconnecting all.
    INFO/MAIN/SHUTDOWN  no clients connected.
    INFO/MAIN/SHUTDOWN  shutdown sequence complete.
    INFO/MAIN/EXIT

    [2]-  Done     bin/nodered-run --transport=tcp://127.0.0.1:8080 --name=foo

    $ bin/nodered-run --transport=tcp://127.0.0.1:8080 --name=foo &
    [2] 45317
    $ INFO/MAIN/VERSION  0.0.8
    INFO/MAIN/NAME  foo
    INFO/MAIN/TRANSPORTS  tcp
    INFO/MAIN/REDIS  {"port":6379,"host":"127.0.0.1","debugMode":false}
    INFO/MAIN/REDIS  1.3.8
    INFO/CONTROLLER/INIT  loading 'tcp'
    INFO/TCP/LISTEN  127.0.0.1:8080

    $ kill -9 %2
    [2]-  Killed                  bin/nodered-run --transport=tcp://127.0.0.1:8080 --name=foo

    $ bin/nodered-run --transport=tcp://127.0.0.1:8080 --name=foo &
    [2] 45318
    INFO/MAIN/VERSION  0.0.8
    INFO/MAIN/NAME  foo
    INFO/MAIN/TRANSPORTS  tcp
    INFO/MAIN/REDIS  {"port":6379,"host":"127.0.0.1","debugMode":false}
    ERROR/MAIN  foo is not unique in the cluster.
    INFO/MAIN/EXIT

    [2]-  Exit 1      bin/nodered-run --transport=tcp://127.0.0.1:8080 --name=foo

    $ bin/nodered-reset-node-state foo

    WARNING!

    This script will reset the state of a NodeRed node
    as stored in Redis.

    A NodeRed node cleans up after itself in Redis on a
    clean shutdown (kill $pid, ^C (SIGINT), etc.).  But,
    when forcibly shutdown (kill -9, hardware failure, etc.),
    the node has no chance to clean up after itself.
    This script will do such clean up ex post facto.

    You have requested to reset the Redis state of node

            foo

    in the Redis instance at 127.0.0.1:6379 (db 1)

    Are you sure you want to do this (enter YES or NO): 
    YES

    Removing node from cluster
    (integer) 1
    Removing the node metadata
    (integer) 0
    Removing any nicknames of clients that were connected
    (integer) 0
    DONE!

    $ bin/nodered-run --transport=tcp://127.0.0.1:8080 --name=foo &
    [2] 45329
    INFO/MAIN/VERSION  0.0.8
    INFO/MAIN/NAME  foo
    INFO/MAIN/TRANSPORTS  tcp
    INFO/MAIN/REDIS  {"port":6379,"host":"127.0.0.1","debugMode":false}
    INFO/MAIN/REDIS  1.3.8
    INFO/CONTROLLER/INIT  loading 'tcp'
    INFO/TCP/LISTEN  127.0.0.1:8080

    ...


