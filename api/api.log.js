var winston = require('winston');
var _ = require('lodash');
var fs = require('fs-extra');

// api
var api = module.parent.exports;


var logPath = api.config.path.log || '/data/logs/';
fs.ensureDirSync(logPath);

// logger
var winston_logger = new (winston.Logger)({
	
	transports: [

		// all console.log's
		new winston.transports.File({ 
			filename: logPath + 'wu.log',
			name : 'info',
			level : 'info',
			prettyPrint : true,
			json : true,
			maxsize : 10000000 // 10MB
		}),
		
		// console.errors
		new winston.transports.File({
			filename: logPath + 'wu.error.log',
			name : 'error',
			level : 'error',
			eol : '\n\n',
			prettyPrint : true,
			json : true,
			maxsize : 10000000 // 10MB
		})

	]
});

// exports
module.exports = api.log = { 
	winston : winston_logger
};