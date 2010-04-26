- return the generated nickname as a system message on connection

- expose more node metadata
    - list the extensions loaded
    - periodically write memory usage to redis for the node

## protocol extensions

- specify on command line
- load from URIs (redis://key, node://module, kiwi://module)
- example: nick registration and authentication against redis itself
