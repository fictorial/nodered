# NodeRed: Nickname Extension

## Purpose

Give each client the ability to set a nickname, unique to the NodeRed instance
to which the client is connected, for the life of the client's connection to
the server.

Duplicate nicknames are forbidden within the scope of a single NodeRed node.
Clients with equal nicknames are differentiated by incorporating the NodeRed
node name into the full **client ID**.  A client ID thus takes the form
`<nickname>@<node name>` (e.g. `brian@foo`).

The nickname extension is likely useful for game and chat services wherein a
client ID is addressed by a human (e.g. for a "buddy" feature or the like).

## Requests

### Set Nickname (`NICKNAME`)

Allows a client to set a nickname for itself.

#### Request

    {   id: Number, 
        cmd: "NICKNAME", 
        body: [ "$new_nickname" ] 
    } <CRLF>

#### Responses

    { id: Number, body: true } <CRLF>
    { id: Number, error: "in use" } <CRLF>

## PubSub Integration

When a client changes his nickname and the **pubsub** extension is enabled, a
message is published to the `system.$node_id.nickname` channel where `$node_id`
is the ID of the NodeRed instance to which the client is connected.

    {   from: "system", 
        msg: { 
            nickname: { 
                from:   "$previous_nickname", 
                to:     "$current_nickname" 
            } 
        } 
    }

## Events

The following events are emitted via `context.emitter` by the nickname
extension:

### `nickname` 

The callback parameters are `client` (the `Client` that changed their
nickname), and `$previous_nickname` (the previous nickname).  The newly set
nickname may be found at `client.nickname`.

