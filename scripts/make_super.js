
// libs
var async    = require('async');
var colors   = require('colors');
var uuid     = require('node-uuid');
var mongoose = require('mongoose');
var _        = require('lodash');
var fs       = require('fs');
var prompt   = require('prompt');

// database schemas
var Project  = require('../models/project');
var Clientel = require('../models/client'); // weird name cause 'Client' is restricted name
var User     = require('../models/user');
var File     = require('../models/file');
var Layer    = require('../models/layer');
var Hash     = require('../models/hash');
var Role     = require('../models/role');
var Group    = require('../models/group');

// config
var config  = require('../config.js').serverConfig;

// connect to our database
mongoose.connect(config.mongo.url); 

// abort fn
function abort() {
    console.log('Aborted:', arguments);
    process.exit(1);
}


// args
var userEmail = process.argv[2];

if (!userEmail) {
    abort('No email.');
}

User
.findOne({'local.email' : userEmail})
.exec(function (err, user) {
    if (err || !user) return abort('No such user', err);

    // mark super
    user.access.super = true;

    // save
    user.save(function (err) {
        if (err) return abort(err);

        // success
        console.log('User', user.local.email, 'is now super!');
        process.exit(0);
    });

});

