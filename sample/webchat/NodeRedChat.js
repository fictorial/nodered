(function () {
  try {
    function strip(s) {
      return s.replace(/(<([^>]+)>)/ig, "");
    }

    function dump(e) {
      if (console && console.log)
        console.log(e);
    }
    
    function output(options) {

      // TODO there an easier way to do this date manipulation?

      var now = new Date()
        , minutes = now.getMinutes()
        , hour = Math.max(1, now.getHours() % 12)
        , nowStr = hour + ":" + (minutes < 10 ? "0" + minutes.toString() : minutes);

      var html = 
        '<div class="message">' + 
        '<span class="time">' + nowStr + '</span>';

      if (options.channel)
        html += '<span class="channel">' + strip(options.channel) + '</span>';

      if (options.nick)
        html += '<span class="nick">' + strip(options.nick) + '</span>';

      if (options.msg) {
        var msg = options.msg;
        var classes = "payload";

        if (options.error)  classes += " error";
        if (options.status) classes += " status";

        if (options.published) {
          // 'published' means the message comes from a user so strip tags.

          classes += " published";
          msg = strip(msg);
        }

        html += '<span class="' + classes + '">' + msg + '</span>';
      }

      html += '</div>';

      $('#messages').append($(html));
    }

    var client = new NodeRedClient();
    
    $(document).ready(function() {
      client.connect("localhost", 8080);

      $('#logo').animate({ top:0, right:0 }, 3000);
      $('#nick').focus();

      $('#nickForm').submit(function () {
        var nick = strip($.trim($('#nick').val()));

        if (nick.length == 0) {
          output({ error:true
                 , msg:"invalid nickname."
                 });

          return false;
        }

        if (nick == client.nick) {
          output({ error:true
                 , msg:"invalid nickname - same as current"
                 });

          return false;
        }

        try {
          client.setNickname(nick, function (ok, reply) {
            if (!ok) {
              output({ error:true
                     , msg:"failed to set nick" + (reply.msg ? ": " + reply.msg : "")
                     });
            } else {
              client.nick = nick;

              output({ status:true
                     , msg:"nick changed ok"
                     });
            }
          });
        } catch (e) {
          dump(e);

          output({ error:true
                 , msg:"ERROR: " + e
                 });
        }

        return false;
      });

      $('#publishForm').submit(function () {
        var channel = strip($.trim($('#publishChannel').val()))
          , payload = strip($.trim($('#publishPayload').val()));

        if (channel.length == 0) {
          output({ error:true
                 , msg:"A channel is required!" 
                 });

          return false;
        }

        if (payload.length == 0) {
          output({ error:true
                 , msg:"A message is required!" 
                 });

          return false;
        }

        try {
          client.publish(channel, payload, function (ok) {
            if (ok) {
              $('#publishPayload').val('');
            } else {
              output({ error:true
                     , msg:"Failed to publish message!"
                     });
            }

            $('#publishPayload').focus();
          });
        } catch (e) {
          dump(e);

          output({ error:true
                 , msg:"ERROR: " + e 
                 });
        }

        return false;
      });

      $('#subscribeForm').submit(function () {
        var channel = strip($.trim($('#subscribeChannel').val()));

        if (channel.length == 0) {
          output({ error:true
                 , msg:"A channel is required!" 
                 });

          return false;
        }

        try {
          client.subscribe(channel, function (ok) {
            if (ok) {
              // TODO show subscription in a tab?

              $('#subscribeChannel').val('');
            } else {
              output({ status:true
                     , msg:"failed to subscribe to " + channel
                     });
            }

            $('#subscribeChannel').focus();
          });
        } catch (e) {
          dump(e);

          output({ error:true
                 , msg:"ERROR: " + e 
                 });
        }

        return false;
      }); 
    });
    
    client.onConnect = function () {
      $('#forms').slideDown("slow");

      output({ status:true
             , msg:"connected"
             });
      
      client.getServerInfo(function (success, reply) {
        if (reply.version)
          output({ status:true
                 , msg:"server version: " + reply.version
                 });

        if (reply.clients)
          output({ status:true
                 , msg:"clients connected to this server: " + reply.clients
                 });
      });

      client.getClusterInfo(function (success, reply) {
        if (reply instanceof Array) {
          var verb = reply.length >= 1 ? "is" : "are";
          var noun = reply.length >= 1 ? "node" : "nodes";

          output({ status:true
                 , msg:"there " + verb + " " + reply.length + " " + noun + " in this cluster."
                 });
        }
      });
    };
    
    client.onDisconnect = function () {
      $('#forms').slideUp("slow");

      output({ error:true
             , msg:"not connected to server"
             });
    };
    
    client.onReceiveMessage = function (channel, message) {
      if (channel == SYSTEM_CHANNEL || message.from == SYSTEM_USER) {
        if (message.msg.join) {
          output({ status:true
                 , msg:message.msg.join + " joined."
                 , channel:channel
                 });
        } else if (message.msg.part) {
          output({ status:true
                 , msg:message.msg.part + " parted."
                 , channel:channel
                 });
        } else if (message.msg.nick) {
          output({ status:true
                 , msg:message.msg.nick[0] + " is now known as " + message.msg.nick[1] + "."
                 , channel:channel
                 });
        }
      } else {
        output({ published:true
               , msg:message.msg
               , nick:message.from
               , channel:channel
               });
      }
    };

  } catch (e) {
    dump(e);

    output({ error:true
           , msg:"ERROR: " + e
           });
  }

})();

