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
        '<div class="message" style="display:none">' + 
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

      var p = $(html);
      $('#messages').append(p);
      $(p).fadeIn("slow");
    }

    var client = new NodeRedClient();
    
    $(document).ready(function() {
      client.connect("localhost", 8080);

      $('#about').click(function() {
        $('#about-dialog').dialog({
          title:"About NodeRed Chat",
          width:500,
          height:500,
          modal:true,
          resizable:false
        });
        return false;
      });

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

              $('#nick').val(nick);
              $('#nickForm').fadeOut(200);
              $('#subscribeChannel').focus();
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
      $('#forms').slideDown(1000, function () {
        $('#nick').focus();
      });
      
      client.getServerInfo(function (success, reply) {
        output({ status:true
              , msg:"connected to nodered node" + 
                    (reply.name ? " '" + reply.name + "' " : "")
              });

        if (reply.version)
          output({ status:true
                 , msg:"nodered version on this node: " + reply.version
                 });

        if (reply.clients)
          output({ status:true
                 , msg:(reply.clients-1) + " other client" + 
                   ((reply.clients-1) > 1 ? "s" : "") + 
                   " connected to this node"
                 });
      });

      client.getClusterInfo(function (success, reply) {
        if (reply instanceof Array) {
          output({ status:true
                 , msg:reply.length + " node" + 
                       (reply.length > 1 ? "s" : "") + 
                       " in the cluster"
                 });
        }
      });
    };
    
    client.onDisconnect = function () {
      $('#forms').slideUp(1000);

      output({ error:true
             , msg:"not connected to server"
             });
    };
    
    client.onReceiveMessage = function (channel, message) {
      if (channel == SYSTEM_CHANNEL || message.from == SYSTEM_USER) {
        if (message.msg.join) {
          output({ status:true
                 , msg:'<span class="nick">' + message.msg.join + '</span> subscribed'
                 , channel:channel
                 });
        } else if (message.msg.part) {
          output({ status:true
                 , msg:'<span class="nick">' + message.msg.part + "</span> unsubscribed"
                 , channel:channel
                 });
        } else if (message.msg.rename) {
          output({ status:true
                 , msg:'<span class="nick">' + message.msg.rename[0] + '</span>' +
                       " is now known as " + 
                       '<span class="nick nick2">' + message.msg.rename[1] + "</span>"
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

