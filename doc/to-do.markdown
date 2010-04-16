- for some reason the exception thrown when a rename fails due to an 
  in-use nickname is not being caught even though there it's in a try..catch
  block!  something to do with flow-js?

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
