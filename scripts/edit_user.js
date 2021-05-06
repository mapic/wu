
// libs
var async 	 = require('async');
var colors 	 = require('colors');
var crypto       = require('crypto');
var uuid 	 = require('node-uuid');
var mongoose 	 = require('mongoose');
var _ 		 = require('lodash');
var fs 		 = require('fs');

// database schemas
var Project 	 = require('../models/project');
var Clientel 	 = require('../models/client');	// weird name cause 'Client' is restricted name
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

const PREV_USERNAME = 'frano';
const NEW_USERNAME = 'edi';

User
.findOne({username : PREV_USERNAME})
.exec(function (err, user) {
	console.log(err, user);
	if (!user) return console.log('No such user:', PREV_USERNAME)

		
	user.username = NEW_USERNAME;

	user.save(function (err) {
		console.log(err);
	})


});