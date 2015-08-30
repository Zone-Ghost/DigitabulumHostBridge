'use strict'

// Template for transports (bluetooth, serial, loopback, TCP/IP)
var inherits = require('util').inherits;
var ee = require('events').EventEmitter;
// may want to subscribe to global emitter?

//require device library
var bt = require('bluetooth-serial-port');

// sample config for transport parameters
var config = {
  name: 'Bluetooth',
  state: {
    'connected': {type: 'boolean',   value: false},
    'listening': {type: 'boolean',   value: false},
    'address':   {type: 'string',    value: ''}
  },
  inputs: {
    'scan': 'button',
    'data': 'buffer',
    'address': 'string',
    'connect': 'button',
    'disconnect': 'button',
    'getConfig': 'button'
  },
  outputs: {
    'connect': 'action',
    'disconnect': 'action',
    'scanResult': 'string',
    'log': 'log'
  }
  // etc
};

// EXPOSED OBJECT / CONSTRUCTOR
function mTransport() {
  ee.call(this);

  // set scope for private methods
  var that = this;

  this.connAddress = "";
  this.config  = JSON.parse(JSON.stringify(config));
  this.config.state.address.value = '';  // This is OUR address!

  // From local EE to Device functions
  var toTransport = function(type, data) {
    switch (type) {
      case 'connect':
        that.device.findSerialPortChannel(address, function(channel) {
          btSerial.connect(address, channel, function() {
            //connected
          }, function() {
            //failed, but channel acquired
          });
        }, function() {
          //failed, and no channel acquired
        });
        break;
      case 'data':
        that.device.write(data, function(err, bytesWritten) {
          if (err) fromTransport('log', [err, 2]);
        });
        break;
      case 'scan':
        that.device.inquire();
        break;
      case 'disconnect':
        that.device.close();
        break;
      case 'address':
        that.address = data;
      default:
        fromTransport('log', ['Bluetooth wut?', 7]);
        break;

    }
  }

  // from device to local EE functions
  var fromTransport = function(type, args) {
    switch (type) {
      case 'data':
        that.emit('fromTransport', 'data', args);
        break;
      case 'closed':
        that.emit('fromTransport', 'disconnect')
        break;
      case 'found':
        that.emit('fromTransport', 'scanResult', [args[0], args[1]])
        break;
      case 'log':
      default:
        that.emit('fromTransport', type, args);
        break;
    }
  }
  // will depend on transport library....

  // LISTENERS
  // from local EE
  this.on('toTransport', toTransport);

  // from device
  this.device = new bt.BluetoothSerialPort();

  this.device.on('data', function() {
    that.fromTransport('data', arguments[0])
  });
  this.device.on('found', function() {
    that.fromTransport('found', [arguments[0], arguments[1]])
  });
  this.device.on('closed', function() {
    that.fromTransport('closed', arguments[0])
  })

};

inherits(mTransport, ee);


mTransport.prototype.getConfig = function() {
  return config;
}

module.exports = mTransport;
