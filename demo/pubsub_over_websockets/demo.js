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

  function on_help () {
    output("\nNodeRed PUBSUB over HTML5 WebSockets demo\n" +
           "When connected, enter commands.\n\n" +
           "help\n" +
           "clear\n" +
           "info\n" +
           "channels\n" +
           "subscribe channel\n" +
           "publish channel message\n");
  }

  function on_local() {
    client.local(function (reply) {
      output("Instance/Node Name: " + reply.node_name);
      output("NodeRed version: " + reply.nodered_version);
      output("Up since: " + (new Date(reply.up_since)));
      output("Node.js version: " + reply.nodejs_version);
      output("Redis version: " + reply.redis_version);
      output("Connected clients: " + reply.client_count);
      output("Servers: " + reply.servers.join(", "));
      output("Extensions: " + reply.extensions.join(", "));
      output("\n");
    });
  }

  on_help();

  var 
    host = 'localhost',
    port = 8081,
    client = new NodeRedClient(),
    retrying = false;

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

  client.on_error = function (what) { 
    output("⚠\tError:\n\n" + JSON.stringify(what) + "\n\n"); 
  };

  client.connect(host, port);

  function handle_action(action) {
    $('#action').val('');
    $('#action').focus('');
    var m;
    if (action.match(/^info$/)) {
      on_local();
    } else if (action.match(/^channels/)) {
      client.list(function (reply) {
        if (reply.length == 0) {
          output("∅\tno active channels/patterns\n");
        } else {
          output("☝\tactive channels/patterns: " + reply.join(", "));
        }
      });
    } else if (action.match(/^clear/)) {
      $('#output').text('');
    } else if (action.match(/^(help|\?)/)) {
      on_help();
    } else if (m = action.match(/^publish\s+(\S+)\s+(.+)$/)) {
      var chan = m[1], msg = m[2];
      client.publish(chan, msg, function (reply) {
        if (reply !== true) output("✘\tfailed to publish to " + chan);
        $('#action').val('publish ' + chan + ' ');
      });
    } else if (m = action.match(/^subscribe\s*(.+)$/)) {
      var chan = m[1];
      client.subscribe(m[1], function (reply) {
        if (reply === true) output("✔\tsubscribed to " + chan);
        else output("✘\tfailed to subscribe to " + chan);
        $('#action').val('subscribe ');
      });
    } else if (m = action.match(/^unsubscribe\s*(.+)$/)) {
      var chan = m[1];
      client.unsubscribe(chan, function (reply) {
        if (reply === true) output("✔\tunsubscribed from " + chan);
        else output("✘\tfailed to unsubscribe from " + chan);
        $('#action').val('unsubscribe ');
      });
    }
  }

  $('#form').submit(function () {
    var action = $.trim($('#action').val());
    handle_action(action);
    return false;
  });
});

