- return the generated nickname as a system message on connection

- expose more node metadata
    - list the extensions loaded
    - periodically write memory usage to redis for the node

# protocol extensions

- specify on command line
- load from URIs (redis://key, node://module, kiwi://module)
- example: nick registration and authentication against redis itself

# samples

## text chat

- show list of available channels in a list
- show who is subscribed to the selected channel
- publish to selected channel and remove the "to" input box in the publish form
- use default text for the form input fields
- make an inverse logo so it shows up better 
- put each channel in its own tab

## video chat

- stress test; probably a very bad idea
- grab images from webcam using flash (jquery plugin) and publish the captured frames as messages
    - will require base64 encoding (!) the frames

## games

- a million ideas

## collaborative document editing

- upload a doc; get a uri back
- share uri with friend over im or whatever
- send keystrokes to each other on a channel dedicated to that doc

## irc relay

- just to show you can, not realistic to have 1 proxy for N users  

