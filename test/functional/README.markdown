# NodeRed Tests

Requires: ncat.

These are not unit tests.  You have to understand how NodeRed
works and interpret the output.  However, running NodeRed in
the background of the same terminal will weave NodeRed's output
with that of the test runner, making debugging that much easier.

Here's an example.  The `<--` lines indicate client input sent
to NodeRed.  The `-->` lines indicate replies and notifications
sent by NodeRed.

    $ bin/nodered-run --name=testing --transport=tcp://127.0.0.1:8080 &
    $ cd test/functional
    $ ./run

    =================================================
    test file: 00-cmd-missing.input
    =================================================
    <-- [ 0 ]
    INFO/CONTROLLER/CONNECT  Guest-1kfvhvu6ytnfp3nmi@127.0.0.1
    ERROR/TCP/ERROR  Error: malformed
    INFO/CONTROLLER/DISCONNECT  Guest-1kfvhvu6ytnfp3nmi@127.0.0.1
    --> [null,false,{"msg":"invalid request"}]

    =================================================
    test file: 00-cmd-unknown.input
    =================================================
    <-- [ 0, "MONKEYS!" ]
    INFO/CONTROLLER/CONNECT  Guest-27lpqwki26fzgp66r@127.0.0.1
    --> [null,false,{"msg":"unknown command"}]
    INFO/CONTROLLER/DISCONNECT  Guest-27lpqwki26fzgp66r@127.0.0.1

    =================================================
    test file: 00-cmd-wrong-type.input
    =================================================
    <-- [ 0, 42 ]
    INFO/CONTROLLER/CONNECT  Guest-323s6mrciypl4ygb9@127.0.0.1
    ERROR/TCP/ERROR  Error: malformed
    --> [null,false,{"msg":"invalid request"}]
    INFO/CONTROLLER/DISCONNECT  Guest-323s6mrciypl4ygb9@127.0.0.1

    =================================================
    test file: 00-junk.input
    =================================================
    <-- sdfkasdfjlaksdfsdjflk;sdjflkajdf
    INFO/CONTROLLER/CONNECT  Guest-4rb8e0mfgzi5uq5mi@127.0.0.1
    ERROR/TCP/ERROR  Error: malformed
    --> [null,false,{"msg":"invalid request"}]
    INFO/CONTROLLER/DISCONNECT  Guest-4rb8e0mfgzi5uq5mi@127.0.0.1

    =================================================
    test file: 00-not-array.input
    =================================================
    <-- { requestID: 0, command: "LOCAL" }
    INFO/CONTROLLER/CONNECT  Guest-56y5ainxha1sgu8fr@127.0.0.1
    ERROR/TCP/ERROR  Error: malformed
    --> [null,false,{"msg":"invalid request"}]
    INFO/CONTROLLER/DISCONNECT  Guest-56y5ainxha1sgu8fr@127.0.0.1

    =================================================
    test file: 00-request-id-invalid.input
    =================================================
    <-- [ "0", "LOCAL" ]
    INFO/CONTROLLER/CONNECT  Guest-6r88gw6klin3ik9@127.0.0.1
    ERROR/TCP/ERROR  Error: malformed
    INFO/CONTROLLER/DISCONNECT  Guest-6r88gw6klin3ik9@127.0.0.1
    --> [null,false,{"msg":"invalid request"}]

    =================================================
    test file: 00-request-id-missing.input
    =================================================
    <-- [ "LOCAL" ]
    INFO/CONTROLLER/CONNECT  Guest-7iwwev7uskkfhia4i@127.0.0.1
    ERROR/TCP/ERROR  Error: malformed
    --> [null,false,{"msg":"invalid request"}]
    INFO/CONTROLLER/DISCONNECT  Guest-7iwwev7uskkfhia4i@127.0.0.1

    =================================================
    test file: 00-request-id-non-increasing.input
    =================================================
    <-- [ 0, "LOCAL" ]
    <-- [ 0, "LOCAL" ]
    INFO/CONTROLLER/CONNECT  Guest-8110qaw9szudte29@127.0.0.1
    --> [null,false,{"msg":"request IDs must increase"}]
    INFO/CONTROLLER/DISCONNECT  Guest-8110qaw9szudte29@127.0.0.1

    =================================================
    test file: 01-cluster-cmd.input
    =================================================
    <-- [0,"cluster"]
    <-- [1,"quit"]
    INFO/CONTROLLER/CONNECT  Guest-9an5gm4wzkpig4x6r@127.0.0.1
    --> [0,true,[{"name":"testing","id":"5","version":"0.0.8","upSince":"1271306879575","clientCount":"1","tcp":"127.0.0.1:8080"}]]
    --> [1,true,"bye"]
    INFO/CONTROLLER/DISCONNECT  Guest-9an5gm4wzkpig4x6r@127.0.0.1

    =================================================
    test file: 01-local.input
    =================================================
    <-- [0,"local"]
    <-- [1,"quit"]
    INFO/CONTROLLER/CONNECT  Guest-ahugdc0ks0ddyrpb9@127.0.0.1
    INFO/CONTROLLER/DISCONNECT  Guest-ahugdc0ks0ddyrpb9@127.0.0.1
    --> [0,true,{"version":"0.0.8","clients":-9}]
    --> [1,true,"bye"]

    =================================================
    test file: 01-nick-reserved-guest.input
    =================================================
    <-- [1,"nick","Guest-1000"]
    <-- [2,"quit"]
    INFO/CONTROLLER/CONNECT  Guest-b5jnimudpspsqbyb9@127.0.0.1
    INFO/CONTROLLER/DISCONNECT  Guest-b5jnimudpspsqbyb9@127.0.0.1
    --> [1,false]
    --> [2,true,"bye"]

    =================================================
    test file: 01-nick-reserved-system.input
    =================================================
    <-- [1,"nick","*system*"]
    <-- [2,"quit"]
    INFO/CONTROLLER/CONNECT  Guest-cgdwuro40fzxs9k9@127.0.0.1
    --> [1,false]
    --> [2,true,"bye"]
    INFO/CONTROLLER/DISCONNECT  Guest-cgdwuro40fzxs9k9@127.0.0.1

    =================================================
    test file: 01-nick-set-multiple-times.input
    =================================================
    <-- [1,"nick","bob"]
    <-- [2,"nick","al"]
    <-- [3,"quit"]
    INFO/CONTROLLER/CONNECT  Guest-d964jwxusp5ezh0k9@127.0.0.1
    INFO/CONTROLLER/NICK  Guest-d964jwxusp5ezh0k9 bob
    --> [1,true]
    INFO/CONTROLLER/NICK  bob al
    --> [2,true]
    --> [3,true,"bye"]
    INFO/CONTROLLER/DISCONNECT  al@127.0.0.1

    =================================================
    test file: 01-nick.input
    =================================================
    <-- [0,"nick","al"]
    <-- [1,"quit"]
    INFO/CONTROLLER/CONNECT  Guest-etbdsoacy6cmfs9k9@127.0.0.1
    INFO/CONTROLLER/NICK  Guest-etbdsoacy6cmfs9k9 al
    INFO/CONTROLLER/DISCONNECT  al@127.0.0.1
    --> [0,true]
    --> [1,true,"bye"]

    =================================================
    test file: 02-subscribe-wrong-command-name.input
    =================================================
    <-- [ 0, "NICK", "Brian" ]
    <-- [ 1, "SUBSCRIBE", "Foobar" ]
    <-- [ 2, "QUIT" ]
    INFO/CONTROLLER/CONNECT  Guest-f5ce36njhqsyk3xr@127.0.0.1
    INFO/CONTROLLER/NICK  Guest-f5ce36njhqsyk3xr Brian
    --> [0,true]
    INFO/CONTROLLER/DISCONNECT  Brian@127.0.0.1
    --> [null,false,{"msg":"unknown command"}]

    =================================================
    test file: 02-subscribe.input
    =================================================
    <-- [ 0, "NICK", "Brian" ]
    <-- [ 1, "SUB", "Foobar" ]
    <-- [ 2, "QUIT" ]
    INFO/CONTROLLER/CONNECT  Guest-g1mq3btk7yeh1if6r@127.0.0.1
    INFO/CONTROLLER/NICK  Guest-g1mq3btk7yeh1if6r Brian
    --> [0,true]
    --> [1,true]
    INFO/CONTROLLER/DISCONNECT  Brian@127.0.0.1
    --> [2,true,"bye"]

    =================================================
    test file: 03-list.input
    =================================================
    <-- [ 0, "NICK", "Brian" ]
    <-- [ 1, "SUB", "Foobar" ]
    <-- [ 2, "LIST" ]
    <-- [ 3, "QUIT" ]
    INFO/CONTROLLER/CONNECT  Guest-hwiew108uvqx2mx6r@127.0.0.1
    INFO/CONTROLLER/NICK  Guest-hwiew108uvqx2mx6r Brian
    --> [0,true]
    --> [1,true]
    --> [2,true,["Foobar"]]
    --> ["MESSAGE","Foobar",{"from":"*system*","msg":{"join":"Brian"}}]
    --> [3,true,"bye"]
    INFO/CONTROLLER/DISCONNECT  Brian@127.0.0.1

    =================================================
    test file: 03-who.input
    =================================================
    <-- [ 0, "NICK", "Brian" ]
    <-- [ 1, "SUB", "Foobar" ]
    <-- [ 2, "WHO", "Foobar" ]
    <-- [ 3, "QUIT" ]
    INFO/CONTROLLER/CONNECT  Guest-ieuswk28rf92akyb9@127.0.0.1
    INFO/CONTROLLER/NICK  Guest-ieuswk28rf92akyb9 Brian
    --> [0,true]
    --> [1,true]
    --> [2,true,[{"nick":"Brian","node":5}]]
    --> ["MESSAGE","Foobar",{"from":"*system*","msg":{"join":"Brian"}}]
    --> [3,true,"bye"]
    INFO/CONTROLLER/DISCONNECT  Brian@127.0.0.1

    =================================================
    test file: 04-publish.input
    =================================================
    <-- [ 1, "PUB", "Foobar", "Hello!" ]
    <-- [ 2, "QUIT" ]
    INFO/CONTROLLER/CONNECT  Guest-jivqsh3dib7nl8fr@127.0.0.1
    --> [1,true]
    INFO/CONTROLLER/DISCONNECT  Guest-jivqsh3dib7nl8fr@127.0.0.1
    --> [2,true,"bye"]

    =================================================
    test file: 05-subscribe-then-publish.input
    =================================================
    <-- [ 0, "NICK", "Brian" ]
    <-- [ 1, "SUB", "Foobar" ]
    <-- [ 2, "PUB", "Foobar", "Hello!" ]
    <-- [ 3, "QUIT" ]
    INFO/CONTROLLER/CONNECT  Guest-k47bugqzlltcyds4i@127.0.0.1
    INFO/CONTROLLER/NICK  Guest-k47bugqzlltcyds4i Brian
    --> [0,true]
    --> [1,true]
    --> [2,true]
    --> ["MESSAGE","Foobar",{"from":"Brian","msg":"Hello!"}]
    --> ["MESSAGE","Foobar",{"from":"*system*","msg":{"join":"Brian"}}]
    --> [3,true,"bye"]
    INFO/CONTROLLER/DISCONNECT  Brian@127.0.0.1

