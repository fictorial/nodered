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

        if (options.error)  classes += " error ui-state-error";
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

          $('#nick').addClass('ui-state-error');
          return false;
        }

        if (nick == client.nick) {
          output({ error:true
                 , msg:"invalid nickname - same as current"
                 });

          $('#nick').addClass('ui-state-error');
          return false;
        }

        try {
          client.setNickname(nick, function (ok, reply) {
            if (!ok) {
              output({ error:true
                     , msg:"failed to set nick" + (reply.msg ? ": " + reply.msg : "")
                     });

              $('#nick').addClass('ui-state-error');
            } else {
              client.nick = nick;

              $('#nick').val(nick);
              $('#nick').removeClass('ui-state-error');
              $('#nickForm').slideUp("slow");
              $('#currentNick').text(nick);

              $('#subscribeForm').slideDown("slow", function () {
                $('#subscribeChannel').focus();
              });

              $('#publishForm').slideDown("slow");
            }
          });
        } catch (e) {
          dump(e);

          output({ error:true
                 , msg:"ERROR: " + e
                 });

          $('#nick').addClass('ui-state-error');
        }

        return false;
      });

      $('#publishForm').submit(function () {
        var channel = strip($.trim($('#publishChannel').val()))
          , payload = strip($.trim($('#publishPayload').val()));

        if (payload.length == 0) {
          output({ error:true
                 , msg:"A message is required!" 
                 });

          $('#publishPayload').addClass('ui-state-error');
          $('#publishPayload').focus();
          return false;
        } else {
          $('#publishPayload').removeClass('ui-state-error');
        }

        if (channel.length == 0) {
          output({ error:true
                 , msg:"A channel is required!" 
                 });

          $('#publishChannel').addClass('ui-state-error');
          $('#publishChannel').focus();
          return false;
        } else {
          $('#publishChannel').removeClass('ui-state-error');
        }

        try {
          client.publish(channel, payload, function (ok) {
            if (ok) {
              $('#publishPayload').val('');
              $('#publishPayload').removeClass('ui-state-error');
              $('#publishChannel').removeClass('ui-state-error');
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
              $('#publishChannel').val(channel);
              $('#publishPayload').focus();

              client.getSubscribersToChannel(channel, function (success, reply) {
                if (reply instanceof Array && reply.length > 0) {
                  output({ status:true
                         , msg:"subscribers to " + channel + ": " + 
                               reply.map(function (o) { return o.nick; }).join(', ')
                         });
                }
              });
            } else {
              output({ status:true
                     , msg:"failed to subscribe to " + channel
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

      client.getActiveChannels(function (success, reply) {
        if (reply instanceof Array && reply.length > 0) {
          output({ status:true
                 , msg:"channels with active subscribers: " + reply.join(', ')
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

