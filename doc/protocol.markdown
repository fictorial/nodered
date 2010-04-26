# NodeRed Client-Server Protocol Specification

Requests, responses, notifications are encoded as CRLF-delimited JSON arrays.

The protocol is not binary safe.  Consider using base64 encoding for sending
"binary" data in requests.

## Requests

    [ id, "COMMAND", ...  ] CRLF

- client picks `id` number
- `id` numbers must grow larger in value with each request

## Responses

    [ id, passedOrFailed, ...  ] CRLF

- same id as request's
- `passedOrFailed` is true means successful handling of the request
- error responses have bodies (third argument) of the form: `{ msg: "error message" }`

## Notifications

    [ "TYPE", ...  ] CRLF

## Protocol

### Requests

Logout/quit/disconnect.

    [ id, "QUIT" ] CRLF

Obtain information about the local server or the cluster to which it belongs.

    [ id, "LOCAL" ] CRLF

    [ id, "CLUSTER" ] CRLF

Determine what channels have subscribers and who is subscribed to a channel.

    [ id, "LIST" ] CRLF

    [ id, "WHO", "channel" ] CRLF

Change the nickname (from "Guest-xxxxxxx") to a new nickname.

    [ id, "NICK", "newNick" ] CRLF

Subscribe to a channel, unsubscribe from a channel, or publish a message to a channel.

    [ id, "SUB", "channel" ] CRLF

    [ id, "UNSUB", "channel" ] CRLF

    [ id, "PUB", "channel", "message" ] CRLF

### Responses

LOCAL

    [ id, true, { "name": "nodeName"
                , "id": number
                , "version": "x.y.z"
                , "clients": number 
                } 
    ] CRLF

CLUSTER

    [ id, true, [ { "name": "nodeName"
                  , "id": number
                  , "version": "x.y.z"
                  , "clients": number 
                  } 
                , ... 
                ]
    ] CRLF

LIST

    [ id, true, [ "channel"
                , ... 
                ] 
    ] CRLF

WHO

    [ id, true, { "channel": [ "nick"
                             , ... 
                             ] 
                } 
    ] CRLF

NICK, SUB, UNSUB, PUB

    [ id, true ] CRLF

QUIT
    
    [ id, "bye" ] CRLF

### Notifications

    [ "MESSAGE", "channel", { "from": "senderNick"
                            , "msg": message 
                            } 
    ] CRLF

When `senderNick` equals `*system*` the message pertains to:

- user presence changes;

        [ "MESSAGE", "channel", { "from": "*system*"
                                , "msg": { "join": "nick" }  // or "part"
                                } 
        ] CRLF

- nickname changes; or

        [ "MESSAGE", "channel", { "from": "*system*"
                                , "msg": { "nick": [ "oldNick", "newNick" ] } 
                                } 
        ] CRLF

- system shutdown notice (wherein the channel is `*system*`).

        [ "MESSAGE", "*system*", { "from": "*system*"
                                 , "msg": "shutdown"
                                 }
        ] CRLF

