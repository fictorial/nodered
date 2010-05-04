function strip(s) {
  return s.replace(/(<([^>]+)>)/ig, "");
}

function output(what) {
  $("#output").append(strip(what) + "\n");
  $("#output").get(0).scrollTop = $("#output").get(0).scrollHeight;    // scroll to bottom
}

$(document).ready(function() {
  if (!("WebSocket" in window)) {
    output("⚠\tThis web browser does not support WebSockets.");
    return;
  }

  var extensions = [];

  function on_help () {
    var str = "\nNodeRed PUBSUB over HTML5 WebSockets demo.\n\n" +
              "help\n" +
              "clear\n" +
              "info\n";

    if ($.inArray('pubsub', extensions))
      str += "channels\n" +
             "subscribe channel\n" +
             "unsubscribe channel\n" +
             "publish channel message\n";

    if ($.inArray('nickname', extensions)) 
      str += "nick new_nickname\n";

    output(str);
  }

  var 
    host = 'localhost',
    port = 8081,
    client = new NodeRedClient(),
    retrying = false,
    first_local = true;

  function on_local() {
    client.local(function (err, reply) {
      extensions = reply.extensions;

      if (first_local) {
        first_local = false;

        for (var i=0; i<extensions.length; ++i)
          client.add_extension_support(extensions[i]);

        on_help();
      } else {
        output("Instance/Node Name: " + reply.node_name);
        output("NodeRed version: " + reply.nodered_version);
        output("Up since: " + (new Date(reply.up_since)));
        output("Node.js version: " + reply.nodejs_version);
        output("Redis version: " + reply.redis_version);
        output("Connected clients: " + reply.client_count);
        output("Servers: " + reply.servers.join(", "));
        output("Extensions: " + reply.extensions.join(", "));
        output("\n");
      }
    });
  }

  client.on_connected = function() { 
    output("☺\tconnected established.\n"); 

    $('#action').disabled = false;
    $('#action').val('');
    $('#action').show(function () {
      $('#action').focus();
    });

    client.connected = true;
    retrying = false;

    on_local();
  };

  client.on_disconnected = function() { 
    output("⚠\tno connection.\n"); 

    $('#action').val('');
    $('#action').disabled = true;
    $('#action').hide();

    client.connected = false;
    retrying = false;
    first_local = true;

    setTimeout(function () {
      if (client.connected || retrying) return;
      output("☎\ttrying " + host + ":" + port + " ...");
      retrying = true;
      client.connect(host, port);
    }, 10000);
  };

  client.on_notice = function (what) { 
    if (what.message) {
      var 
        msg = what.message,
        str = "✎\t" + msg.from + " &lt;" + msg.channel;

      if (msg.pattern) 
        str += " (" + msg.pattern + ")";

      output(str + "&gt;  " + msg.msg);
    }
  };

  client.connect(host, port);

  function handle_action(action) {
    $('#action').val('');
    $('#action').focus('');

    if (action.match(/^clear/)) {
      $('#output').text('');
      return;
    } 
    
    if (action.match(/^(help|\?)/)) {
      on_help();
      return;
    }

    // metadata extension must always be enabled.

    if (action.match(/^info$/)) {
      on_local();
      return;
    }

    var m;

    if ($.inArray('pubsub', extensions)) {
      if (action.match(/^channels/)) {
        client.list(function (err, reply) {
          if (err) {
            output("✘\tfailed to get channel list: " + err);
          } else {
            if (reply.length == 0) output("∅\tno active channels/patterns\n");
            else output("☝\tactive channels/patterns: " + reply.join(", "));
          }
        });
        return;
      } 
      
      if (m = action.match(/^publish\s+(\S+)\s+(.+)$/)) {
        var chan = m[1], msg = $.trim(m[2]);
        client.publish(chan, msg, function (err, reply) {
          if (err) output("✘\tfailed to publish to " + chan + ": " + err);
          $('#action').val('publish ' + chan + ' ');
        });
        return;
      } 
      
      if (m = action.match(/^subscribe\s*(.+)$/)) {
        var chan = $.trim(m[1]);
        client.subscribe(m[1], function (err, reply) {
          if (err) output("✘\tfailed to subscribe to " + chan + ": " + err);
          else output("✔\tsubscribed to " + chan);
          $('#action').val('subscribe ');
        });
        return;
      } 
      
      if (m = action.match(/^unsubscribe\s*(.+)$/)) {
        var chan = $.trim(m[1]);
        client.unsubscribe(chan, function (err, reply) {
          if (err) output("✘\tfailed to unsubscribe from " + chan + ": " + err);
          else output("✔\tunsubscribed from " + chan);
          $('#action').val('unsubscribe ');
        });
        return;
      }
    }

    if ($.inArray('nickname', extensions)) {
      if (m = action.match(/^nick(?:name)?\s*(.+)$/)) {
        var nick = $.trim(m[1]);
        client.nickname(nick, function (err, reply) {
          if (err) output("✘\tfailed to set nickname: " + err);
          else output("✔\tnickname changed to " + nick);
        });
      }
      return;
    }
  }

  $('#form').submit(function () {
    var action = $.trim($('#action').val());
    handle_action(action);
    return false;
  });
});

