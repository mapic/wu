
// libs
var async 	 = require('async');
var colors 	 = require('colors');
var crypto   = require('crypto');
var uuid 	 = require('node-uuid');
var mongoose = require('mongoose');
var _ 		 = require('lodash');
var fs 		 = require('fs');
var prompt 	 = require('prompt');

// database schemas
var Project  = require('../models/project');
var Clientel = require('../models/client');	// weird name cause 'Client' is restricted name
var User  	 = require('../models/user');
var File 	 = require('../models/file');
var Layer 	 = require('../models/layer');
var Hash 	 = require('../models/hash');
var Role 	 = require('../models/role');
var Group 	 = require('../models/group');

// config
var config  = require('../config.js').serverConfig;                                                                            

// connect to our database
mongoose.connect(config.mongo.url); 


var deleteUser = process.argv[2];

if (!deleteUser) {
	console.log('Usage: node delete_user.js email@domain.com');
	return process.exit(0);
}

User
.findOne({'local.email' : deleteUser})
.exec(function (err, u) {

	if (err) {
		console.log('Error retreiving user!');
		return process.exit(0);
	}

	if (!u) {
		console.log('No such user exists!');
		return process.exit(0);
	}


	console.log('User to delete:'.red, u.getName(), u.getEmail());

	var yesno = require('yesno');
	yesno.ask('Are you sure you want to continue?', true, function(ok) {
	    if(ok) {
			User
			.remove({'local.email' : deleteUser})
			.exec(function (err, user) {
				console.log('User [' + deleteUser + '] deleted!'.red);
				process.exit(0);
			});  

	    } else {
	        console.log('Aborting!'.red);
			return process.exit(0);
	    }
	});

})

