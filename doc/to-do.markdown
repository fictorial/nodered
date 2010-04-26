- support options from the command-line and pass in to a transport
    - `'--transport=$name://ip:port?$key=$val&$key=$val...'`
    - not real URI encoding; just looks like a URI.

- specify docs for hooking into NodeRed events
    - how does an extension ... 
        - ... add a request handler to the dispatcher?
        - ... add a request handler to the dispatcher?

- should nickname handling be an extension?
    - probably!

- specify extensions on command line
    - `--ext=redis://key?opt=val...`
    - `--ext=node://moduleName?opt=val...`

- load specified extensions from redis or local module

- note in the per-node metadata in Redis which extensions are loaded

- `LOCAL` and `CLUSTER` commands should return the loaded extensions

- add a command to the built-ins that reloads redis-based extensions
  (which is useful for development and for 0-downtime upgrades)

- example extension: nick registration and authentication against redis itself
    - new protocol requests
        - `auth:REGISTER`
        - `auth:LOGIN`
    - new protocol notifications
        - `auth:CHALLENGE`
    - schema to store user credentials in redis
    - hook into `NICK` command (or replace it entirely)

- encapsulate the logic in the tcp transport better to allow for hooks outside of transport implementations

- return the generated nickname as a system message on connection

- expose more node metadata
    - list the extensions loaded
    - periodically write memory usage to redis for the node

- add support for seed.js packaging

