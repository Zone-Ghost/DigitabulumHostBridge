'use strict'

var inherits = require('util').inherits;
var ee = require('events').EventEmitter;
var messageHandler = require('../messageHandler.js');

var net = require('net');

var DEFAULT_PORT = 8008;

var DEFAULT_IP = "127.0.0.1"

// trys to grab the local IP...
require('dns').lookup(require('os').hostname(), function (err, add, fam) {
  DEFAULT_IP = add;
})

// EXPOSED OBJECT / CONSTRUCTOR
function mTransport(socket) {
  ee.call(this);

  // set scope for private methods
  var that = this;
  var connect_state = false;
  var _sock = (socket) ? socket : false;
  var _addr = '';
  var _port = '';

  if (_sock) {

    var address = _sock.address();
    _addr = _sock.remoteAddress;
    _port = _sock.remotePort

    _sock.on('error',
      function(err) {
        that.send('log', {
          body:      'A socket.io client experienced an error: ' + err,
          verbosity: 3
        });
        that.send('connected', false);
      }
    );

    _sock.on('disconnect',
      function() {
        that.send('log', {
          body:      'Socket disconnected',
          verbosity: 5
        });
        that.send('connected', false);
      }
    );

    _sock.on('data',
      function(dat) {
        var tmp_buf = new Buffer(dat, 'utf8')
        that.send('data', tmp_buf);
      }
    );
  }

  this.disconnect = function() {
    _sock.disconnect();
  }

  this.transmit = function(dat) {
    _sock.write(dat);
  }


  this.interface_spec = {
    type: 'mTransport',
    name: 'Websocket',
    schema: {
      inputs: {
        'disconnect': {
          label: "Disconnect",
          args: [ ],
          func: function(me, data) {
            me.disconnect();
          },
          hidden: false
        },
        'data': {
          label: "Send Data",
          args: [ { label: 'Data', type: 'string' }],
          func: function(me, data) {
            me.transmit(data);
          },
          hidden: false
        }
      },
      outputs: {
        'connected': {
          type: 'boolean',
          value: false
        },
        'localAddress': {
          label: 'Local Address',
          type: 'string',
          value: ''
        },
        'remoteAddress': {
          label: 'Remote Address',
          type: 'string',
          value: ''
        }
      }
    }
  };

  this.mH = new messageHandler(this.interface_spec, this);

  setTimeout(function(){
    that.send('remoteAddress', _addr + ':' + _port);
    that.send('log', {
      body:      'Socket connected: ' + _addr + ':' + _port,
      verbosity: 5
    });
    that.send('connected', true);


  }, 1000)
};




// EXPOSED OBJECT / CONSTRUCTOR
function mTransportFactory() {
  ee.call(this);

  // set scope for private methods
  var that = this;

  this.server = null;

  this.client = null;

  // will depend on transport library....
  // Used to get a transport instance (the thing that
  //   actually moves data and represents a connection).
  this.getWorker = function() {
      return new mTransport();
  }


  this.interface_spec = {
    type: 'mTransportFactory',
    name: 'WebSocketFactory',
    schema: {
      inputs: {
        'connect' : {
          label: "Connect",
          args: [ { label: 'Remote Address', type: 'string', def: '192.168.0.19' },
                  { label: 'Port', type: 'number', def: 45067 } ],
          func: function(me, data) {
            if (data.length > 0) {
              var address = data.shift();
              var port = (data.length > 0) ? data.shift() : DEFAULT_PORT;
              me.send('log', {
                  body: 'Attempting connection to ' + address + ":" + port,
                  verbosity: 4
              });
              var nu_inst = new net.Socket();
              nu_inst.connect(port, address, function(){
                // nuffin.
              })
              nu_inst.once('connect',
                function () {
                  var instance = new mTransport(nu_inst);
                  me.send('connected', instance);
                }
              );
            }
            else {
              me.send('log', {
                  body: 'Unspecified address.',
                  verbosity: 2
              });
            }
          },
          hidden: false
        },
        'listen' : {
          label: "Listen",
          args: [
            { label: 'Listen', type: 'boolean', def: true },
                  { label: 'Local Address', type: 'string', def: '127.0.0.1' },
                  { label: 'Port', type: 'number', def: 8008 }],
          func: function(me, data) {
            if (data.length === 0) {
              me.send('log', {
                  body: 'Insufficient parameter count.',
                  verbosity: 3
              });
              return;
            }
            var d_state = data.shift();

            if (me.server && !d_state) {
              // Server is running and ought not be.
              me.server.close();
              me.send('listening', false);
              me.send('localAddress', '');
              me.server = null;
            }
            else if (d_state) {
              // Start the server listening.
              if (!me.server) {
                var listen_addr = (data.length) ? data.shift() : DEFAULT_IP;
                var listen_port = (data.length) ? data.shift() : DEFAULT_PORT;

                me.server = net.createServer(function(socket) {
                	socket.write('Echo server\r\n');
                	socket.pipe(socket);
                });
                me.server.listen(listen_port, listen_addr);
                me.server.on('connection',
                  function (socket) {
                    var instance = new mTransport(socket);
                    var address = socket.address();
                    me.send('log', {
                      body: 'New connection from ' + address.address + ':' + address.port
                    });
                    me.send('connected', instance);
                  }
                );
                me.send('listening', true);
                me.send('localAddress', listen_addr + ":" + listen_port);
              }
              else {
                me.send('log', {
                  body: 'SocketFactory is already listening on ' + me.server.origins(),
                  verbosity: 5
                });
              }
            }
            else {
              me.send('log', {
                body: 'SocketFactory is not listening.',
                verbosity: 6
              });
            }
          },
          hidden: false
        }
      },
      outputs: {
        'listening': {
          label: 'Listening',
          type: 'boolean',
          value: false
        },
        'scanResult': {
          label: ['Address'],
          type: 'array',
          value: []
        },
        'connected': {
          // NOTE: Unlink the instance 'connected', the factory returns the instanced
          //         transport as it's data. Also... no state.
          label: 'Instanced Transport',
          type: 'object',
          value: false
        }
      }
    },
    adjuncts: {
    }
  };


  // instantiate handler
  this.mH = new messageHandler(this.interface_spec, this);
};

inherits(mTransport, ee);
inherits(mTransportFactory, ee);

module.exports = {
  init: function() {
    return new mTransportFactory();
  }
};