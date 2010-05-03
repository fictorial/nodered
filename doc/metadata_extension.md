# Bundled Extension: metadata

NodeRed natively supports basic introspection of the local NodeRed instance as
well as the cluster (of which the instance is a member) via the requests
`LOCAL` and `CLUSTER`. 

Let `-->` denote a request sent by a client to a NodeRed instance.  Let `<--`
denote a response or notice sent by a NodeRed instance to a client.

## LOCAL request

    --> { "id": Number, "cmd": "LOCAL" } <CRLF>

    <-- {"id": Number, 
         "body": {
            "node_name":"foo",
            "node_id":1,
            "nodered_version":"0.1.0",
            "nodejs_version":"v0.1.93",
            "redis_version":"1.3.10",
            "client_count":42,
            "extensions":["metadata", "pubsub"],
            "servers":[
              "tcp://127.0.0.1:8080",
              "ws://127.0.0.1:8081"
            ]
          }
        } <CRLF>


A client may inspect `response.body.extensions` to perform a simple form of "service
discovery".

## CLUSTER request

    --> { "id": Number, "cmd": "CLUSTER" } <CRLF>

    <-- {"id": Number, 
         "body": [ 
            {
              "node_name":"foo",
              "node_id":1,
              "nodered_version":"0.1.0",
              "nodejs_version":"v0.1.93",
              "redis_version":"1.3.10",
              "client_count":42,
              "extensions":["metadata", "pubsub"],
              "servers":[
                "tcp://127.0.0.1:8080",
                "ws://127.0.0.1:8081"
              ]
            }, 
            ... 
          ]
        } <CRLF>

