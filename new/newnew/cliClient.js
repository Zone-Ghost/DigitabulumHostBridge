/*
 * This is to become the transport test directory.
 *
 */
'use strict'

var util = require('util');
var logo = require('./manuvrLogo');
var memwatch = require('memwatch-next');

memwatch.on('leak', function(info) {
  console.log("memwatch: " + info)
});

memwatch.on('stats', function(stats) {
  console.log("stats: " + stats)
});



/****************************************************************************************************
 * This is the configuration for this client and some meta-awareness.                                *
 ****************************************************************************************************/
var packageJSON = require('./package.json');
var fs          = require('fs');

var config = {};
var current_log_file = false;

/****************************************************************************************************
 * Small utility functions...                                                                        *
 ****************************************************************************************************/
function isFunction(fxn) {
  return (typeof fxn === 'function');
}


function openLogFile(path) {
  fs.open(path, 'ax', 
    function(err, fd) {
      if (err) {
        console.log('Failed to create log file ('+path+') with error ('+err+'). Logging disabled.');
      }
      else {
        current_log_file = fd;
      }
    }
  );
}


/* Save the current config, if it is dirty. */
function saveConfig(callback) {
  if (config.dirty) {
    delete config.dirty;
    if (!callback) {
      callback = function(err) {
        if (err) {
          config.dirty = true;
          console.log('Error saving configuration: ' + err);
        }
        else {
          console.log('Config was saved.');
        }
      }
    }
    
    fs.writeFile('./config.json', JSON.stringify(config), callback);
  }
  else {
    // If we con't need to save, fire the callback with no error condition.
    if (callback) callback(false);
  }
}

/*
* Tries to load a conf file from the given path, or the default path if no path
*   is provided. If config load fails, function will populate config with a default
*   and mark it dirty.
*/
function loadConfig(path) {
  if (!path) {
    path = './config.json';
  }
  fs.readFile(path, 'ascii',
    function(err, data) {
      if (err) {
        // Hmmmm... We failed to read a config file. Generate a default.
        console.log('Failed to read configuration from ' + path + '. Using defaults...');
        config = {
          dirty:     true,
          verbosity: 7,
          logPath:   './logs/'
        };
      }
      else {
        config = JSON.parse(data);
      }
      
      // Now we should setup logging if we need it...
      if (config.logPath) {
        fs.exists(config.logPath, 
          function(exists) {
            if (exists) {
              openLogFile(config.logPath + 'mhb-' + Math.floor(new Date() / 1000) + '.log');
            }
            else {
              fs.mkdir(config.logPath, 
                function(err) {
                  if (err) {
                    console.log('Log directory ('+config.logPath+') does not exist and could not be created. Logging disabled.');
                  }
                  else {
                    openLogFile(config.logPath + 'mhb-' + Math.floor(new Date() / 1000) + '.log');
                  }
                }
              );
            }
          }
        );
      }
    }
  );
}


// Load configuration.
loadConfig();


/****************************************************************************************************
 * We are using chalk and cli-table for console formatting.                                          *
 ****************************************************************************************************/
var Table = require('cli-table');
var chalk = require('chalk');
// Let's take some some time to setup some CLI styles.
var error = chalk.bold.red;


/****************************************************************************************************
 * This is junk related to prompt.                                                                   *
 ****************************************************************************************************/
var prompt = require('prompt');
prompt.message = '';
prompt.delimiter = '';


/****************************************************************************************************
 * Let's bring in the MHB stuff...                                                                   *
 ****************************************************************************************************/
var mSession = require('./lib/mSession.js'); // session factory
var mEngine = require('./lib/mEngine.js'); //  DHB
var BTTransport = require('./lib/bluetooth.js'); // bluetooth
var LBTransport = require('./lib/loopback.js'); // bluetooth

var lb = new LBTransport();

var transports = {};
transports.bt_transport = BTTransport;


var sessionGenerator = new mSession();

var sessions = {};
sessions.bt_session = sessionGenerator.init(new BTTransport());
//var lb_session = sessionGenerator.init(new LBTransport());



// By passing in the transports, we are returned sessions. When a session is successfully
//   setup, the actor variable will become a reference to the specific kind of manuvrable
//   that connected to the given transport.
sessions.actor0 = sessionGenerator.init(lb.transport0);
sessions.actor1 = sessionGenerator.init(lb.transport1);


// Now, for each session that we have, we should dd or toClient listener.
function toClientAggregation(ses, origin, type, data) {
  switch (type) {
    case 'log':    // Client is getting a log from somewhere.
      if (data[1] && data[1] <= config.verbosity) {
        console.log(chalk.cyan.bold(ses.getUUID() + ' (' + origin + "):\t") + chalk.gray(data[0]));
      }
      if (current_log_file) {
        // Write to the log file if we have one open.
        fs.writeSync(current_log_file, new Date()+'\t'+ses.getUUID() + ' (' + origin + "):\t"+data[0]+'\n');
      }
      break;
    case '':
      break;
    default:
      console.log(
        chalk.cyan.bold(ses.getUUID() + ' (' + origin + "):\n\t" +
          "type:" + type + "\n\t" +
          "data:" + util.inspect(data)
        ));
      break;
  }
}


sessions.bt_session.on('toClient', function(origin, type, data) {
  toClientAggregation(sessions.bt_session, origin, type, data);
});

sessions.actor0.on('toClient', function(origin, type, data) {
  toClientAggregation(sessions.actor0, origin, type, data);
});

sessions.actor1.on('toClient', function(origin, type, data) {
  toClientAggregation(sessions.actor1, origin, type, data);
});


/****************************************************************************************************
 * Functions that just print things.                                                                 *
 ****************************************************************************************************/

/*
 *
 */
function listSessions() {
  var table = new Table({
      head: [chalk.white.bold('Name'), chalk.white.bold('Session'), chalk.white.bold('Transport'), chalk.white.bold('Engine')],
      chars: {'top':'─','top-mid':'┬','top-left':'┌','top-right':'┐','bottom':'─','bottom-mid':'┴','bottom-left':'└','bottom-right':'┘','left':'│','left-mid':'├','mid':'─','mid-mid':'┼','right':'│','right-mid':'┤','middle':'│'},
      style: {'padding-left': 0, 'padding-right': 0}
  });
  
  for (var ses in sessions) {
    if (sessions.hasOwnProperty(ses)) {
      var sesObj = sessions[ses];

      var inner_table_style = { chars: { 'top': '' , 'top-mid': '' , 'top-left': '' , 'top-right': ''
         , 'bottom': '' , 'bottom-mid': '' , 'bottom-left': '' , 'bottom-right': ''
         , 'left': ' ' , 'left-mid': '─' , 'mid': '─' , 'mid-mid': '┼'
         , 'right': ' ' , 'right-mid': '─' , 'middle': '│' },
         style: {'padding-left': 0, 'padding-right': 0}
      };
      var table_ses = new Table(inner_table_style);
      var table_eng = new Table(inner_table_style);
      var table_trn = new Table(inner_table_style);

      for (var key in sesObj) {
        if (sesObj.hasOwnProperty(key) && sesObj[key] && (key !== '_events')) {
          if ((config.verbosity > 3) || !isFunction(sesObj[key])) {
            table_ses.push([key.toString(), sesObj[key].toString()]);
          }
        }
      }
      
      for (var key in sesObj.engine) {
        if (sesObj.engine.hasOwnProperty(key) && sesObj.engine[key] && (key !== '_events')) {
          if ((config.verbosity > 3) || !isFunction(sesObj.engine[key])) {
            table_eng.push([key.toString(), sesObj.engine[key].toString()]);
          }
        }
      }
      
      for (var key in sesObj.transport) {
        if (sesObj.transport.hasOwnProperty(key) && sesObj.transport[key] && (key !== '_events')) {
          if ((config.verbosity > 3) || !isFunction(sesObj[key])) {
            table_trn.push([key.toString(), sesObj.transport[key].toString()]);
          }
        }
      }

      table.push([chalk.green(ses), chalk.white(table_ses.toString()), chalk.gray(table_trn.toString()), chalk.gray(table_eng.toString())]);
    }
  }
  console.log(table.toString() + '\n');
}




/*
 *
 */
function printUsage() {
  var table = new Table({
    chars: { 'top': '' , 'top-mid': '' , 'top-left': '' , 'top-right': ''
           , 'bottom': '' , 'bottom-mid': '' , 'bottom-left': '' , 'bottom-right': ''
           , 'left': '' , 'left-mid': '' , 'mid': '' , 'mid-mid': ''
           , 'right': '' , 'right-mid': '' , 'middle': ' ' },
    style: { 'padding-left': 0, 'padding-right': 0 }
  });
  
  //table.push([chalk.white(''), chalk.gray()]);
  table.push([chalk.magenta('(s)list'),      chalk.grey(''),       chalk.white('List all instantiated sessions.')]);
  table.push([chalk.magenta('(v)erbosity'),  chalk.grey('[0-7]'),  chalk.white('Print or change the console\'s verbosity.')]);
  table.push([chalk.magenta('(m)anuvr'),     chalk.grey(''),       chalk.white('Our logo is so awesome...')]);
  table.push([chalk.magenta('(q)uit'),       chalk.grey(''),       chalk.white('Cleanup and exit the program.')]);
  console.log(chalk.white.bold(
    "MHB Debug Console   v" + packageJSON.version+"\n========================================================================"
  ));
  console.log(table.toString());
}


var sampleObject = {
  "messageId": 8,
  "flag": 0,
  "args": []
}




function quit() {
  // Write a config file if the conf is dirty.
  saveConfig(function(err) {
    if (err) {
      console.log('Failed to save config prior to exit. Changes will be lost.');
    }
    if (current_log_file) {
      fs.close(current_log_file, function(err) {
        if (err) {
          console.log('Failed to close the log file. It will be closed when our process ends in a moment.');
        }
        process.exit();  // An hero...
      });
    }
    else {
      process.exit();  // An hero...
    }
  });
}



function promptUserForDirective() {
  prompt.get([{
    name: 'directive',
    description: 'Directive> '.magenta
  }], function(prompt_err, result) {
    if (prompt_err) {
      console.log(error('\nno. die. ' + prompt_err));
      process.exit(1);
    } else {
      var args      = result.directive.toString().split(' ');
      var directive = args.shift();
      
      switch (directive) {
        case 'slist': // Print a list of instantiated sessions.
        case 's': 
          listSessions();
          break;
        case 'verbosity': // Set or print the current log verbosity.
        case 'v': 
          if (args.length > 0) {
            config.verbosity = args[0];
          }
          console.log('Console verbosity is presently ' + chalk.green(config.verbosity)+'.');
          break;
        case 'test': // 
          console.log(util.inspect(sampleObject));
          sessions.actor0.emit('fromClient', 'engine', 'send', sampleObject);
          break;
        case 'desync0': // Print a list of instantiated transports.
          sessions.actor0.emit('fromClient', 'engine', 'badsync', '');
          break;
        case 'desync1': // Print a list of instantiated transports.
          sessions.actor1.emit('fromClient', 'engine', 'badsync', '');
          break;
        case 'manuvr':
        case 'm': 
          logo();
          break;
        case 'history': // Print a history of our directives.
          break;
        case 'nodestack': // Tell node to print a trace of this process.
          console.trace();
          break;
        case 'quit': // Return 0 for no-error-on-exit.
        case 'exit':
        case 'q': 
          quit();
          break;
        default: // Show user help and usage info.
          //console.log(result);
          printUsage();
          break;
      }
    }

    console.log("\n");
    promptUserForDirective();
  });
}



/****************************************************************************************************
 * Execution begins below this block.                                                                *
 ****************************************************************************************************/

console.log(chalk.white(packageJSON.name + '  v' + packageJSON.version));
prompt.start(); // Start prompt running.


// Kick off the interaction by prompting the user.
promptUserForDirective();
