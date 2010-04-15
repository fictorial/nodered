# Rationale

"Why is Redis involved?" you may wonder given that a number of sample (PUBSUB)
servers based on Node.js *alone* exist.  Using Redis allows NodeRed to scale
horizontally to handle more client connections than could be serviced *well*
with a single Node.js server.  That is, at some point, an increasing number of
connected *and active* clients (let us arbitrarily pick `50K`) will cause a
single Node.js server to have performance issues, which is true of any single
server.  In theory, if we deploy `N>1` Node.js servers to which a client may
connect, we can support `≤ N*50K` clients and maintain *acceptable* performance
(hand-waving).  

But, how would the Node.js servers communicate with one another to relay
messages published from a client connected to server A to client(s) connected
to servers B and C?  Using a message broker such as RabbitMQ is a common
solution.  This project uses Redis' pubsub features instead.  There are of
course advantages and disadvantages to using Redis for this.  The point is to
experiment. Perhaps you might use this project as a *starting point* for
*your* application that needs to do something similar.

NodeRed does not establish a connection to Redis for each connected client.
While a NodeRed server accepts and manages many (more of that hand-waving)
concurrent client connections, a NodeRed server manages but *two* connections
to a Redis server.  One connection to Redis is for issuing arbitrary Redis
protocol commands while the other is used for the management of subscriptions
and reception (and forwarding to clients) of published messages.  Note that the
subscriptions managed for any single NodeRed server is the set of subscriptions
across all connected clients to that single NodeRed server.
