- probably a bug in redis-node-client
    - seems to be in the context of an unsubscribe
    - I think the bug is somewhere in the reply parser.
      I believe I saw it think that `*3<CRLF>$7<CRLF>message....*3<CRLF>UNSUBSCRIBE`
      did not start with a PUBSUB message but without the glued UNSUBSCRIBE on the end
      it works fine.
        - Can I write a test for this case?

        ERROR/MAIN  {"message":"Cannot read property 'commandName' of
        undefined","stack":"TypeError: Cannot read property 'commandName' of undefined\n
        at Client.onReply_
        (/Users/brian/.kiwi/current/seeds/redis-client/0.2.3/lib/redis-client.js:377:50)\n
        at
        /Users/brian/.kiwi/current/seeds/redis-client/0.2.3/lib/redis-client.js:145:34\n
        at ReplyParser.feed
        (/Users/brian/.kiwi/current/seeds/redis-client/0.2.3/lib/redis-client.js:178:21)\n
        at Stream.<anonymous>
        (/Users/brian/.kiwi/current/seeds/redis-client/0.2.3/lib/redis-client.js:280:28)\n
        at IOWatcher.callback (net:331:16)\n    at
        node.js:818:9","type":"non_object_property_load","arguments":["commandName",null]}

- periodically write memory usage to redis for the node

- check that docs are up to date
    - add diagram; migrate wiki
    - add logo

- upload to github
    - replace existing node-red project

# protocol extensions

- specify on command line
- load from URIs (redis://key, node://module, kiwi://module)
- example: nick registration and authentication against redis itself

# transports

- add websockets support

