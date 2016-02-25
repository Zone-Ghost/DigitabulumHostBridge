var _ = require('lodash');
var mHub = require('./lib/mHub.js');

//var local_ip = "10.96.164.31";
var local_ip = '0.0.0.0';

// Temporary broker file.  Need to retrofit this and a
// general JSON schema to mHub to replace this logic...
//
// For demo purposes only


// need to remove config requirement from mHub...
var config = {
  nothing: "here"
};

var hub = new mHub(config);

// bounce from here
hub.on('output', function(message) {
    console.log(
        "Received: [" + message.target.join(", ") + "] :"
        + JSON.stringify(message.data)
      )
      
    //if(message.target[0] === 'connected') {
      //hub.emit('input', {target: ["assignEngine"], data: ['NewSession0', 'Deacon.js']});
    //}
});

//
// require('dns').lookup(require('os').hostname(), function (err, add, fam) {
//   local_ip = add;
// })

setTimeout(function(){
	console.log('SENDING EMIT INTO HUB TO CREATE TCP LISTENER');
	hub.emit('input', {target: ["listen", "tcp"], data: [true, local_ip, 8008]});
	}, 3000);
