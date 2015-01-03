var glove = function(io) {

// core packages
var util = require('util');
var events = require('events');

// deoxxa libraries
var Dissolve = require('dissolve');
//var Concentrate = require('concentrate');

// 24 bit numbers!
var int24 = require('int24')

// our libs
var defs = require("./lib/defs.js")(io);

// Pre and post buffers
// these currently just accumulate, but we'll "process" them in a FIFO queue

// The parser will push the values it's converted from the Buffer here.
var jsonBuffArrayIn = [];

// We will insert readable JSON here to be sent to the glove.
var jsonBuffArrayOut = [];

// this waits for the replies before executing the relevant command; we don't start anything until a reply
// is received
var listenerArray = [];

var btSerial;

// test on socket.io
console.log('Running glove host...');

var exec_in = function(jsonBuff){
    if(jsonBuff.messageId == defs.outCommand.REPLY_FROM_HOST){
        defs.inCommand[jsonBuff.messageId].runIt(jsonBuff);
        defs.runIt(jsonBuff);
    } else {
        defs.runIt(jsonBuff);
        //defs.inCommand[jsonBuff.messageId].runIt(jsonBuff);
        // change the jsonBuff in to a reply here
        //exec_out(jsonBuff);
    }
};

var exec_out = function(jsonBuff){

    if(jsonBuff.messageId == defs.outCommand.REPLY_FROM_HOST){
        // just sending a reply
    } else
    {
        //run concentrate on jsonBuff here....

        //push to listener array
        listenerArray.push({
            commandID   :   jsonBuffIn.commandID,
            obj         :   jsonBuff
        })
    }
};

var EventEmitter = events.EventEmitter;
var ee = new EventEmitter();

var testLegend = Buffer([   0x4a, 0x06, 0x00, 0x4a, 0x81, 0x84, 0x11, 0x00, 0xff, 0xff, 0xff, 0xff, 0x43, 0x4f, 0x55,
                            0x4e, 0x54, 0x45, 0x52, 0x50, 0x41, 0x52, 0x54, 0x59, 0x5f, 0x52, 0x45, 0x50, 0x4c, 0x59,
                            0x00, 0x0f, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x53, 0x59, 0x53, 0x5f, 0x42, 0x4f, 0x4f,
                            0x54, 0x5f, 0x43, 0x4f, 0x4d, 0x50, 0x4c, 0x45, 0x54, 0x45, 0x44, 0x00, 0x00, 0x02, 0x00,
                            0x00, 0x00, 0x53, 0x59, 0x53, 0x5f, 0x42, 0x4f, 0x4f, 0x54, 0x4c, 0x4f, 0x41, 0x44, 0x45,
                            0x52, 0x00, 0x00, 0x03, 0x00, 0x00, 0x00, 0x53, 0x59, 0x53, 0x5f, 0x52, 0x45, 0x42, 0x4f,
                            0x4f, 0x54, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0x53, 0x59, 0x53, 0x5f, 0x53, 0x48, 0x55,
                            0x54, 0x44, 0x4f, 0x57, 0x4e, 0x00, 0x00, 0x05, 0x00, 0x00, 0x00, 0x53, 0x59, 0x53, 0x5f,
                            0x50, 0x52, 0x45, 0x41, 0x4c, 0x4c, 0x4f, 0x43, 0x41, 0x54, 0x49, 0x4f, 0x4e, 0x00, 0x00,
                            0x14, 0x00, 0x00, 0x00, 0x56, 0x45, 0x52, 0x53, 0x49, 0x4f, 0x4e, 0x5f, 0x50, 0x52, 0x4f,
                            0x54, 0x4f, 0x43, 0x4f, 0x4c, 0x00, 0x08, 0x00, 0x00, 0x13, 0x00, 0x00, 0x00, 0x56, 0x45,
                            0x52, 0x53, 0x49, 0x4f, 0x4e, 0x5f, 0x46, 0x49, 0x52, 0x4d, 0x57, 0x41, 0x52, 0x45, 0x00,
                            0x0e, 0x00, 0x00, 0x10, 0x00, 0x00, 0x00, 0x4c, 0x45, 0x47, 0x45, 0x4e, 0x44, 0x5f, 0x54,
                            0x59, 0x50, 0x45, 0x53, 0x00, 0x00, 0x11, 0x00, 0x00, 0x00, 0x4c, 0x45, 0x47, 0x45, 0x4e,
                            0x44, 0x5f, 0x4d, 0x45, 0x53, 0x53, 0x41, 0x47, 0x45, 0x53, 0x00, 0x0f, 0x00, 0x00, 0x12,
                            0x00, 0x00, 0x00, 0x4c, 0x45, 0x47, 0x45, 0x4e, 0x44, 0x5f, 0x4d, 0x41, 0x50, 0x00, 0x00,
                            0x00, 0x01, 0x00, 0x00, 0x53, 0x59, 0x53, 0x5f, 0x44, 0x41, 0x54, 0x45, 0x54, 0x49, 0x4d,
                            0x45, 0x5f, 0x43, 0x48, 0x41, 0x4e, 0x47, 0x45, 0x44, 0x00, 0x00, 0x01, 0x01, 0x00, 0x00,
                            0x53, 0x59, 0x53, 0x5f, 0x53, 0x45, 0x54, 0x5f, 0x44, 0x41, 0x54, 0x45, 0x54, 0x49, 0x4d,
                            0x45, 0x00, 0x00, 0x02, 0x01, 0x00, 0x00, 0x53, 0x59, 0x53, 0x5f, 0x52, 0x45, 0x50, 0x4f,
                            0x52, 0x54, 0x5f, 0x44, 0x41, 0x54, 0x45, 0x54, 0x49, 0x4d, 0x45, 0x00, 0x00, 0x00, 0x02,
                            0x00, 0x00, 0x53, 0x59, 0x53, 0x5f, 0x50, 0x4f, 0x57, 0x45, 0x52, 0x5f, 0x4d, 0x4f, 0x44,
                            0x45, 0x00, 0x06, 0x00, 0x00, 0x00, 0x03, 0x00, 0x00, 0x53, 0x59, 0x53, 0x5f, 0x49, 0x53,
                            0x53, 0x55, 0x45, 0x5f, 0x4c, 0x4f, 0x47, 0x5f, 0x49, 0x54, 0x45, 0x4d, 0x00, 0x0e, 0x00,
                            0x00, 0x01, 0x03, 0x00, 0x00, 0x53, 0x59, 0x53, 0x5f, 0x4c, 0x4f, 0x47, 0x5f, 0x56, 0x45,
                            0x52, 0x42, 0x4f, 0x53, 0x49, 0x54, 0x59, 0x00, 0x06, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00,
                            0x53, 0x43, 0x48, 0x45, 0x44, 0x5f, 0x45, 0x4e, 0x41, 0x42, 0x4c, 0x45, 0x5f, 0x42, 0x59,
                            0x5f, 0x50, 0x49, 0x44, 0x00, 0x00, 0x01, 0x04, 0x00, 0x00, 0x53, 0x43, 0x48, 0x45, 0x44,
                            0x5f, 0x44, 0x49, 0x53, 0x41, 0x42, 0x4c, 0x45, 0x5f, 0x42, 0x59, 0x5f, 0x50, 0x49, 0x44,
                            0x00, 0x00, 0x02, 0x04, 0x00, 0x00, 0x53, 0x43, 0x48, 0x45, 0x44, 0x5f, 0x50, 0x52, 0x4f,
                            0x46, 0x49, 0x4c, 0x45, 0x52, 0x5f, 0x53, 0x54, 0x41, 0x52, 0x54, 0x00, 0x00, 0x03, 0x04,
                            0x00, 0x00, 0x53, 0x43, 0x48, 0x45, 0x44, 0x5f, 0x50, 0x52, 0x4f, 0x46, 0x49, 0x4c, 0x45,
                            0x52, 0x5f, 0x53, 0x54, 0x4f, 0x50, 0x00, 0x00, 0x04, 0x04, 0x00, 0x00, 0x53, 0x43, 0x48,
                            0x45, 0x44, 0x5f, 0x50, 0x52, 0x4f, 0x46, 0x49, 0x4c, 0x45, 0x52, 0x5f, 0x44, 0x55, 0x4d,
                            0x50, 0x00, 0x00, 0x05, 0x04, 0x00, 0x00, 0x53, 0x43, 0x48, 0x45, 0x44, 0x5f, 0x44, 0x55,
                            0x4d, 0x50, 0x5f, 0x4d, 0x45, 0x54, 0x41, 0x00, 0x00, 0x06, 0x04, 0x00, 0x00, 0x53, 0x43,
                            0x48, 0x45, 0x44, 0x5f, 0x44, 0x55, 0x4d, 0x50, 0x5f, 0x53, 0x43, 0x48, 0x45, 0x44, 0x55,
                            0x4c, 0x45, 0x53, 0x00, 0x00, 0x07, 0x04, 0x00, 0x00, 0x53, 0x43, 0x48, 0x45, 0x44, 0x5f,
                            0x57, 0x49, 0x50, 0x45, 0x5f, 0x50, 0x52, 0x4f, 0x46, 0x49, 0x4c, 0x45, 0x52, 0x00, 0x00,
                            0x08, 0x04, 0x00, 0x00, 0x53, 0x43, 0x48, 0x45, 0x44, 0x5f, 0x44, 0x45, 0x46, 0x45, 0x52,
                            0x52, 0x45, 0x44, 0x5f, 0x45, 0x56, 0x45, 0x4e, 0x54, 0x00, 0x00, 0x00, 0x10, 0x00, 0x00,
                            0x42, 0x54, 0x5f, 0x43, 0x4f, 0x4e, 0x4e, 0x45, 0x43, 0x54, 0x49, 0x4f, 0x4e, 0x5f, 0x4c,
                            0x4f, 0x53, 0x54, 0x00, 0x00, 0x01, 0x10, 0x00, 0x00, 0x42, 0x54, 0x5f, 0x43, 0x4f, 0x4e,
                            0x4e, 0x45, 0x43, 0x54, 0x49, 0x4f, 0x4e, 0x5f, 0x47, 0x41, 0x49, 0x4e, 0x45, 0x44, 0x00,
                            0x00, 0x03, 0x10, 0x00, 0x00, 0x42, 0x54, 0x5f, 0x51, 0x55, 0x45, 0x55, 0x45, 0x5f, 0x52,
                            0x45, 0x41, 0x44, 0x59, 0x00, 0x00, 0x04, 0x10, 0x00, 0x00, 0x42, 0x54, 0x5f, 0x52, 0x58,
                            0x5f, 0x42, 0x55, 0x46, 0x5f, 0x4e, 0x4f, 0x54, 0x5f, 0x45, 0x4d, 0x50, 0x54, 0x59, 0x00,
                            0x00, 0x05, 0x10, 0x00, 0x00, 0x42, 0x54, 0x5f, 0x45, 0x4e, 0x54, 0x45, 0x52, 0x45, 0x44,
                            0x5f, 0x43, 0x4d, 0x44, 0x5f, 0x4d, 0x4f, 0x44, 0x45, 0x00, 0x00, 0x06, 0x10, 0x00, 0x00,
                            0x42, 0x54, 0x5f, 0x45, 0x58, 0x49, 0x54, 0x45, 0x44, 0x5f, 0x43, 0x4d, 0x44, 0x5f, 0x4d,
                            0x4f, 0x44, 0x45, 0x00, 0x00, 0x00, 0x20, 0x00, 0x00, 0x49, 0x32, 0x43, 0x5f, 0x51, 0x55,
                            0x45, 0x55, 0x45, 0x5f, 0x52, 0x45, 0x41, 0x44, 0x59, 0x00, 0x00, 0x99, 0x20, 0x00, 0x00,
                            0x49, 0x32, 0x43, 0x5f, 0x44, 0x55, 0x4d, 0x50, 0x5f, 0x44, 0x45, 0x42, 0x55, 0x47, 0x00,
                            0x00, 0x00, 0x30, 0x00, 0x00, 0x52, 0x4e, 0x47, 0x5f, 0x42, 0x55, 0x46, 0x46, 0x45, 0x52,
                            0x5f, 0x45, 0x4d, 0x50, 0x54, 0x59, 0x00, 0x00, 0x02, 0x30, 0x00, 0x00, 0x49, 0x4e, 0x54,
                            0x45, 0x52, 0x52, 0x55, 0x50, 0x54, 0x53, 0x5f, 0x4d, 0x41, 0x53, 0x4b, 0x45, 0x44, 0x00,
                            0x00, 0x00, 0x40, 0x00, 0x00, 0x49, 0x4d, 0x55, 0x5f, 0x49, 0x52, 0x51, 0x5f, 0x52, 0x41,
                            0x49, 0x53, 0x45, 0x44, 0x00, 0x00, 0x01, 0x40, 0x00, 0x00, 0x49, 0x4d, 0x55, 0x5f, 0x44,
                            0x49, 0x52, 0x54, 0x59, 0x00, 0x00, 0x02, 0x40, 0x00, 0x00, 0x49, 0x4d, 0x55, 0x5f, 0x4d,
                            0x41, 0x50, 0x5f, 0x52, 0x45, 0x51, 0x55, 0x45, 0x53, 0x54, 0x00, 0x00, 0x03, 0x40, 0x00,
                            0x00, 0x49, 0x4e, 0x49, 0x54, 0x5f, 0x49, 0x4d, 0x55, 0x53, 0x00, 0x00, 0x04, 0x40, 0x00,
                            0x00, 0x49, 0x4e, 0x49, 0x54, 0x5f, 0x4b, 0x4d, 0x41, 0x50, 0x00, 0x00, 0x00, 0x50, 0x00,
                            0x00, 0x53, 0x45, 0x4e, 0x53, 0x4f, 0x52, 0x5f, 0x49, 0x4e, 0x41, 0x32, 0x31, 0x39, 0x00,
                            0x00, 0x00, 0x51, 0x00, 0x00, 0x53, 0x45, 0x4e, 0x53, 0x4f, 0x52, 0x5f, 0x49, 0x53, 0x4c,
                            0x32, 0x39, 0x30, 0x33, 0x33, 0x00, 0x00, 0x00, 0x52, 0x00, 0x00, 0x53, 0x45, 0x4e, 0x53,
                            0x4f, 0x52, 0x5f, 0x4c, 0x50, 0x53, 0x33, 0x33, 0x31, 0x00, 0x00, 0x00, 0x53, 0x00, 0x00,
                            0x53, 0x45, 0x4e, 0x53, 0x4f, 0x52, 0x5f, 0x53, 0x49, 0x37, 0x30, 0x32, 0x31, 0x00, 0x00,
                            0x00, 0x54, 0x00, 0x00, 0x53, 0x45, 0x4e, 0x53, 0x4f, 0x52, 0x5f, 0x54, 0x4d, 0x50, 0x30,
                            0x30, 0x36, 0x00, 0x00, 0x00, 0x60, 0x00, 0x00, 0x4b, 0x4d, 0x41, 0x50, 0x5f, 0x50, 0x45,
                            0x4e, 0x44, 0x49, 0x4e, 0x47, 0x5f, 0x46, 0x52, 0x41, 0x4d, 0x45, 0x00, 0x00, 0x01, 0x60,
                            0x00, 0x00, 0x4b, 0x4d, 0x41, 0x50, 0x5f, 0x55, 0x53, 0x45, 0x52, 0x5f, 0x43, 0x48, 0x41,
                            0x4e, 0x47, 0x45, 0x44, 0x00, 0x00, 0x02, 0x60, 0x00, 0x00, 0x4b, 0x4d, 0x41, 0x50, 0x5f,
                            0x42, 0x49, 0x4f, 0x4d, 0x45, 0x54, 0x52, 0x49, 0x43, 0x5f, 0x4d, 0x41, 0x54, 0x43, 0x48,
                            0x00, 0x00, 0x03, 0x60, 0x00, 0x00, 0x4b, 0x4d, 0x41, 0x50, 0x5f, 0x42, 0x49, 0x4f, 0x4d,
                            0x45, 0x54, 0x52, 0x49, 0x43, 0x5f, 0x4e, 0x55, 0x4c, 0x4c, 0x00, 0x00, 0x00, 0x80, 0x00,
                            0x00, 0x4f, 0x4c, 0x45, 0x44, 0x5f, 0x44, 0x49, 0x52, 0x54, 0x59, 0x5f, 0x46, 0x52, 0x41,
                            0x4d, 0x45, 0x5f, 0x42, 0x55, 0x46, 0x00, 0x00, 0x00, 0xa0, 0x00, 0x00, 0x47, 0x50, 0x49,
                            0x4f, 0x5f, 0x56, 0x49, 0x42, 0x52, 0x41, 0x54, 0x45, 0x5f, 0x30, 0x00, 0x07, 0x06, 0x00,
                            0x07, 0x00, 0x00, 0x01, 0xa0, 0x00, 0x00, 0x47, 0x50, 0x49, 0x4f, 0x5f, 0x56, 0x49, 0x42,
                            0x52, 0x41, 0x54, 0x45, 0x5f, 0x31, 0x00, 0x07, 0x06, 0x00, 0x07, 0x00, 0x00, 0x02, 0xa0,
                            0x00, 0x00, 0x4c, 0x45, 0x44, 0x5f, 0x57, 0x52, 0x49, 0x53, 0x54, 0x5f, 0x4f, 0x46, 0x46,
                            0x00, 0x00, 0x03, 0xa0, 0x00, 0x00, 0x4c, 0x45, 0x44, 0x5f, 0x57, 0x52, 0x49, 0x53, 0x54,
                            0x5f, 0x4f, 0x4e, 0x00, 0x00, 0x04, 0xa0, 0x00, 0x00, 0x4c, 0x45, 0x44, 0x5f, 0x44, 0x49,
                            0x47, 0x49, 0x54, 0x53, 0x5f, 0x4f, 0x46, 0x46, 0x00, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06,
                            0x00, 0x06, 0x06, 0x06, 0x06, 0x06, 0x00, 0x06, 0x06, 0x06, 0x06, 0x00, 0x06, 0x06, 0x06,
                            0x00, 0x06, 0x06, 0x00, 0x06, 0x00, 0x00, 0x05, 0xa0, 0x00, 0x00, 0x4c, 0x45, 0x44, 0x5f,
                            0x44, 0x49, 0x47, 0x49, 0x54, 0x53, 0x5f, 0x4f, 0x4e, 0x00, 0x06, 0x06, 0x06, 0x06, 0x06,
                            0x06, 0x00, 0x06, 0x06, 0x06, 0x06, 0x06, 0x00, 0x06, 0x06, 0x06, 0x06, 0x00, 0x06, 0x06,
                            0x06, 0x00, 0x06, 0x06, 0x00, 0x06, 0x00, 0x00, 0x06, 0xa0, 0x00, 0x00, 0x4c, 0x45, 0x44,
                            0x5f, 0x50, 0x55, 0x4c, 0x53, 0x45, 0x00, 0x08, 0x02, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06,
                            0x00, 0x08, 0x02, 0x06, 0x06, 0x06, 0x06, 0x06, 0x00, 0x08, 0x02, 0x06, 0x06, 0x06, 0x06,
                            0x00, 0x08, 0x02, 0x06, 0x06, 0x06, 0x00, 0x08, 0x02, 0x06, 0x06, 0x00, 0x08, 0x02, 0x06,
                            0x00, 0x00, 0x07, 0xa0, 0x00, 0x00, 0x4c, 0x45, 0x44, 0x5f, 0x44, 0x49, 0x47, 0x49, 0x54,
                            0x5f, 0x4c, 0x45, 0x56, 0x45, 0x4c, 0x00, 0x06, 0x00, 0x06, 0x08, 0x00, 0x06, 0x08, 0x02,
                            0x00, 0x00, 0x08, 0xa0, 0x00, 0x00, 0x4c, 0x45, 0x44, 0x5f, 0x4d, 0x4f, 0x44, 0x45, 0x00,
                            0x06, 0x00, 0x00, 0x00, 0xb0, 0x00, 0x00, 0x53, 0x44, 0x5f, 0x45, 0x4a, 0x45, 0x43, 0x54,
                            0x45, 0x44, 0x00, 0x00, 0x01, 0xb0, 0x00, 0x00, 0x53, 0x44, 0x5f, 0x49, 0x4e, 0x53, 0x45,
                            0x52, 0x54, 0x45, 0x44, 0x00, 0x00, 0x00, 0xe0, 0x00, 0x00, 0x53, 0x45, 0x53, 0x53, 0x5f,
                            0x45, 0x53, 0x54, 0x41, 0x42, 0x4c, 0x49, 0x53, 0x48, 0x45, 0x44, 0x00, 0x00, 0x01, 0xe0,
                            0x00, 0x00, 0x53, 0x45, 0x53, 0x53, 0x5f, 0x48, 0x41, 0x4e, 0x47, 0x55, 0x50, 0x00, 0x00,
                            0x02, 0xe0, 0x00, 0x00, 0x53, 0x45, 0x53, 0x53, 0x5f, 0x41, 0x55, 0x54, 0x48, 0x5f, 0x43,
                            0x48, 0x41, 0x4c, 0x4c, 0x45, 0x4e, 0x47, 0x45, 0x00, 0x00, 0x03, 0xe0, 0x00, 0x00, 0x53,
                            0x45, 0x53, 0x53, 0x5f, 0x53, 0x55, 0x42, 0x43, 0x52, 0x49, 0x42, 0x45, 0x00, 0x00, 0x04,
                            0xe0, 0x00, 0x00, 0x53, 0x45, 0x53, 0x53, 0x5f, 0x55, 0x4e, 0x53, 0x55, 0x42, 0x43, 0x52,
                            0x49, 0x42, 0x45, 0x00, 0x00, 0x05, 0xe0, 0x00, 0x00, 0x53, 0x45, 0x53, 0x53, 0x5f, 0x44,
                            0x55, 0x4d, 0x50, 0x5f, 0x44, 0x45, 0x42, 0x55, 0x47, 0x00, 0x00, 0x10, 0xe0, 0x00, 0x00,
                            0x53, 0x45, 0x53, 0x53, 0x5f, 0x4f, 0x52, 0x49, 0x47, 0x49, 0x4e, 0x41, 0x54, 0x45, 0x5f,
                            0x4d, 0x53, 0x47, 0x00, 0x00], 'hex');

var syncPacket = Buffer([0x04, 0x00, 0x00, 0x55], 'hex');
var maxLength = 32000;
var warningLength = 10000;
var waitingForSync = 0;

var bufferCompare = function (a, b) {
    if (!Buffer.isBuffer(a)) return undefined;
    if (!Buffer.isBuffer(b)) return undefined;
    if (typeof a.equals === 'function') return a.equals(b);
    if (a.length !== b.length) return false;

    for (var i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }

    return true;
};

var sync = function(flag){
    waitingForSync = flag;
    if(waitingForSync === 1){
        console.log("OUT OF SYNC...");
        //send reset command here
    } else {
        console.log("BACK IN SYNC!");
    }
}

var dataCheck = function(jsonBuff){
    var buffSum = 0;
    if(jsonBuff.checkSum === 0x55){
        console.log("Sync got in here somehow?");
        return 1;
    }
    for(var i = 0; i < jsonBuff.raw.length; i++){
        buffSum += jsonBuff.raw.readUInt8(i);
    }
    buffSum += 0x55;
    buffSum %= 256;
    if(jsonBuff.checkSum === buffSum){
        //console.log("Checksum is good!");
        return 1;
    } else {
        console.log("ERROR! Expected checksum: " + jsonBuff.checkSum + " Received: " + buffSum);
        return 0;
    }
};

var parser = Dissolve().loop(function(end) {
    if(waitingForSync === 1 ){
        this.uint8("wait")
            .tap(function(){
                if(this.vars.wait === 0x55){
                    this.buffer("check", 4)
                        .tap(function(){
                            if(bufferCompare(this.vars.check, syncPacket)){
                                sync(0);
                            }
                            this.vars = Object.create(null);
                        })
                    this.vars = Object.create(null);
                } else {
                    this.vars = Object.create(null);
                }
            })
    } else {
        this.uint32le("temp")
            .tap(function () {
                this.vars.totalLength   = this.vars.temp & 0x00FFFFFF; // converting in to 24 bit integer
                this.vars.checkSum      = this.vars.temp >>> 24;             // grabbing the checksum
                delete this.vars.temp;
                if (this.vars.totalLength > 4) {
                    if (this.vars.totalLength >= warningLength && this.vars.totalLength < maxLength) {
                        console.log("I'm getting a big packet of " + this.vars.totalLength + " bytes");
                        this.buffer("raw", this.vars.totalLength - 4)
                    } else if (this.vars.totalLength >= maxLength) {
                        console.log("Something is WAY too big; dropping to sync mode...");
                        //This will consume a lot of events....
                        //this.buffer("raw", this.vars.totalLength - 4)
                        sync(1);
                    } else {
                        this.buffer("raw", this.vars.totalLength - 4)
                    }
                } else {
                    if (this.vars.checkSum === 0x55) {
                        console.log("sync...")
                    } else {
                        // something is very wrong...
                        sync(1);
                    }
                }
            })
            .tap(function () {
                if (this.vars.checkSum != 0x55 && waitingForSync === 0) {
                    this.push(this.vars);
                } else {
                    // got data, but couldn't push it
                }
                this.vars = Object.create(null);
            })
    };
});

ee.on("addedToBufferIn", function () {
    if(null != jsonBuffArrayIn[0]) {
        exec_in(jsonBuffArrayIn[0]);
        jsonBuffArrayIn.shift();
    }
});


parser.on("readable", function() {
    var e;
    while (e = parser.read()) {
        if(dataCheck(e) === 1) {
            //this is UGLY...
            //e.data = new rawParser(e.totalLength, e);
            e.uniqueId = e.raw.readUInt16LE(0);
            e.messageId = e.raw.readUInt16LE(2);
            e.raw = e.raw.slice(4);
            jsonBuffArrayIn.push(e);
            ee.emit("addedToBufferIn");
        } else {
            sync(1);
        }
    }
});

/* old tests.... not needed unless the parser breaks hard.  Use the builder instead
function testParser() {
    parser.write(new Buffer([0x08, 0x00, 0x00, 0x22, 0x20, 0x0a, 0x03, 0xa0]));
    parser.write(new Buffer([0x08, 0x00, 0x00, 0x22, 0x20, 0x0a, 0x03, 0xa0]));
    parser.write(new Buffer([0x22, 0x00, 0x00, 0x22, 0x20, 0x0a, 0x03, 0xa0]));
    parser.write(new Buffer([0x08, 0x00, 0x00, 0x22, 0x20, 0x0a, 0x03, 0xa0]));
    parser.write(syncPacket);
    parser.write(syncPacket);
    parser.write(syncPacket);
    parser.write(syncPacket);
    parser.write(new Buffer([0x08, 0x00, 0x00, 0x22, 0x20, 0x0a, 0x03, 0xa0]));
    parser.write(syncPacket);
    parser.write(syncPacket);
    parser.write(syncPacket);
    parser.write(syncPacket);
    parser.write(new Buffer([0x08, 0x00, 0x00, 0x22, 0x20, 0x0a, 0x03, 0xa0]));
    parser.write(new Buffer([0x08, 0x00, 0x00, 0x22, 0x20, 0x0a, 0x03, 0xa0]));
    parser.write(syncPacket);
    parser.write(syncPacket);
    parser.write(syncPacket);
    parser.write(syncPacket);
}
*/

// BLUETOOTH COPYPASTA

btSerial = new (require('bluetooth-serial-port')).BluetoothSerialPort();


btSerial.on('found', function(address, name) {
    console.log("Found SPP BT connection...")
    btSerial.findSerialPortChannel(address, function(channel) {
        btSerial.connect(address, channel, function() {
            console.log('Connected on address: ' + address + " @ channel: " + channel);

            btSerial.on('data', function(buffer) {
                console.log("Getting some BT data...");
                parser.write(buffer);
            });
        }, function () {
            console.log("Can't connect");
        });
        //btSerial.close();
    }, function() {
        console.log("Didn't find anything");
    });
});

// build this in to an express call to do your bluetooth connection initiation
function connectBT() {
    console.log("Scanning for bluetooth connections.\n(This is blocking, so be patient!))");
    btSerial.inquire();
}

function disconnectBT() {
    console.log("Closing BT connection...");
    btSerial.close();
}

// Buffer generation

var builder = function(messageID, uniqueID, argBuffObj){
    //  Binary Model:
    //  uint24le        uint8       uint16le    uint16le    (buffer)
    //  totalLength     checkSum    uniqueID    messageId    raw
    //  total bytes   uID to end

    if(messageID !== 0xFFFF){
        // add something to the listener array if we're not sending a reply
    }

    if(!messageID || !uniqueID){
        console.log("Malformed builder: mID: " + messageID + " uID: " + uniqueID);
        console.log("Feeding a sync packet!")
        return (syncPacket);
    }

    var buffSum = 0;
    var checkBuf;
    var headBuf = new Buffer(4);
    var midBuf = new Buffer(4);

    if(undefined !== argBuffObj && argBuffObj.length){

        int24.writeUInt24LE(headBuf, 0, argBuffObj.length + 8);
        midBuf.writeUInt16LE(uniqueID, 0);
        midBuf.writeUInt16LE(messageID,2);
        checkBuf = Buffer.concat([midBuf, argBuffObj]);

    } else {

        int24.writeUInt24LE(headBuf, 0, 8);
        checkBuf = new Buffer(4);
        checkBuf.writeUInt16LE(uniqueID, 0);
        checkBuf.writeUInt16LE(messageID,2);

    }

    // calculate the checksum, and then add them together
    for(var i = 0; i < checkBuf.length; i++){
        buffSum += checkBuf.readUInt8(i);
    }
    buffSum += 0x55;
    buffSum %= 256;
    headBuf.writeUInt8(buffSum, 3);

    return Buffer.concat([headBuf, checkBuf])

}

module.exports.builder = builder;

// mainloop... convert this to a Node Eventloop later
//
//var shutDown = 0;
//var runCount = 0;
//
//while(!shutDown) {
//
//    runCount++;
//}

    module.exports.parser = parser;
    module.exports.syncPacket = syncPacket;
    module.exports.testLegend = testLegend;
    module.exports.btSerial = btSerial;
    module.exports.connectBT = connectBT;
    module.exports.disconnectBT = disconnectBT;
}

module.exports = glove;
