- client in changeNick has no subs
- afterwards, when subscribing to another, the original is there
- something weird is happening with the client object passed to changeNick
- once this is resolved, consider the problem with this.failed in the rename nick flow

- return the generated nickname as a system message on connection

- expose more node metadata
    - list the extensions loaded
    - periodically write memory usage to redis for the node

# protocol extensions

- specify on command line
- load from URIs (redis://key, node://module, kiwi://module)
- example: nick registration and authentication against redis itself

# transports

- support options from the command-line and pass in to the transport
    - `--transport=$name://ip:port?$key=$val&$key=$val...`

# samples

- real-time twitter; idea from the "faye" project. pick a nick and 
  enter usernames to follow. messages from those usernames show up
  immediately.
