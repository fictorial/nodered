## Client-Server Protocol

The NodeRed protocol is extremely simple. A client sends *requests* to a
NodeRed instance, receives a *response* for each request, and is sent
`notifications` pushed from the NodeRed instance (not in response to a
request).  Requests, responses, and notifications are encoded as
[JSON](http://en.wikipedia.org/wiki/Json) objects with a `CRLF` suffix
("\r\n").  The JSON encoding is [UTF-8](http://en.wikipedia.org/wiki/UTF-8).
Binary data (e.g. a raster image) must be suitably encoded; consider using
[Base64](http://en.wikipedia.org/wiki/Base64).

### Requests

A request takes the form 

    { "id": Number, "cmd": String, "body": [ value, ... ] } <CRLF>

where 

- `id` is a client-created request ID Number (`>= 0`) which should be incremented by 1 for each request; 
- `cmd` is either a built-in command name or a command name as registered by a loaded extension; and 
- `body` is an optional array whose elements are any JSON value type(s).

### Responses

A response takes the form 

    { "id": Number, "error": String } <CRLF>
    
on error; and 

    { "id": Number, "body": value } <CRLF> 
    
on success. A response's `id` is equal to its corresponding request. 

### Notifications

A notification takes the form 

    { "notice": value } <CRLF>

