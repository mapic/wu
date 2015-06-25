//API: api.socket.js
// database schemas
var Project 	= require('../models/project');
var Clientel 	= require('../models/client');	// weird name cause 'Client' is restricted name
var User  	= require('../models/user');
var File 	= require('../models/file');
var Layer 	= require('../models/layer');
var Hash 	= require('../models/hash');
var Role 	= require('../models/role');
var Group 	= require('../models/group');

// utils
var _ 		= require('lodash-node');
var fs 		= require('fs-extra');
var gm 		= require('gm');
var kue 	= require('kue');
var fss 	= require("q-io/fs");
var zlib 	= require('zlib');
var uuid 	= require('node-uuid');
var util 	= require('util');
var utf8 	= require("utf8");
var mime 	= require("mime");
var exec 	= require('child_process').exec;
var dive 	= require('dive');
var async 	= require('async');
var carto 	= require('carto');
var crypto      = require('crypto');
var fspath 	= require('path');
var mapnik 	= require('mapnik');
var request 	= require('request');
var nodepath    = require('path');
var formidable  = require('formidable');
var nodemailer  = require('nodemailer');
var uploadProgress = require('node-upload-progress');
var mapnikOmnivore = require('mapnik-omnivore');

// api
var api = module.parent.exports;

// exports
module.exports = api.socket = { 

	_processing : {},

	// send : function (options) {

	// },

	sendError : function (userId, err) {
		var sock = api.socket._getSocket(userId);

		// send to user
		sock && sock.emit('errorMessage', {
			error : err
		});
	},

	uploadDone : function (options) {
		// console.log('uploadDone'.yellow);

		// get socket
		var socket = api.socket.getSocket(options);

		// send to user
		socket && socket.emit('uploadDone', options.result);
	},

	processingProgress : function (options) {
		console.log('SOCKET: processingProgress');
		// console.log('processingProgress'.green, options);

		// get socket
		var socket = api.socket.getSocket(options);

		// send to user
		socket && socket.emit('processingProgress', options.result);
	},

	processingDone : function (options) {
		// console.log('processingDone'.yellow);
		console.log('SOCKET: processingDone');

		var userId = api.socket._getUserId(options);
		var sock = api.socket._getSocket(userId);

		// send to user
		sock && sock.emit('processingDone', options.result);
	},

	grindRasterDone : function (req, res) {
		// console.log('grindRasterDone', req.body);
		console.log('SOCKET: grindRasterDone');

		var fileUuid = req.body.fileUuid,
		    process = api.socket._getProcessing(fileUuid),
		    timeDiff = new Date().getTime() - process._timestamp,
		    userId = process.userId,
		    sock = api.socket._getSocket(userId),
		    error = req.body.error,
		    uniqueIdentifier = req.body.uniqueIdentifier;

		// console.log('grindDone: err?'.yellow, error);

		// send to user
		sock && sock.emit('processingDone', {
			processingDone : fileUuid,
			elapsed : timeDiff,
			error : error,
			size : process.size,
			uniqueIdentifier : uniqueIdentifier
		});

		// end connection
		res.end();
	},


	grindDone : function (req, res) {
		var fileUuid = req.body.fileUuid,
		    process = api.socket._getProcessing(fileUuid),
		    timeDiff = new Date().getTime() - process._timestamp,
		    userId = process.userId,
		    sock = api.socket._getSocket(userId),
		    error = req.body.error,
		    uniqueIdentifier = req.body.uniqueIdentifier;

		// console.log('grindDone: err?'.yellow, error);
		console.log('SOCKET: grindDone');

		// send to user
		sock && sock.emit('processingDone', {
			processingDone : fileUuid,
			elapsed : timeDiff,
			error : error,
			size : process.size,
			uniqueIdentifier : uniqueIdentifier
		});

		// end connection
		res.end();
	},





	getSocket : function (options) {
		var userId = api.socket._getUserId(options);
		var sock = api.socket._getSocket(userId);
		return sock;
	},

	_getUserId : function (options) {
		if (!options || !options.user) return false;
		return options.user._id;
	},

	_getSocket : function (userId) {
		var session = api.socket._getSession(userId);
		if (!session) return console.log('ERR 125: no session'.red);;
		var sock = api.app.io.sockets.sockets[session];
		if (!sock) return console.log('ERR 120: no sock'.red);
		return sock;
	},

	_getSession : function (userId) {
		var session = _.findKey(api.app.io.handshaken, function (s) {
			if (!s || !s.session || !s.session.passport) return false;
			return s.session.passport.user == userId;
		});
		return session;
	},

	setProcessing : function (process) {
		// console.log('setProce2sing'.green, process);
		// console.log('============== SETPROCESSING ==============');
		// console.log('============== SETPROCESSING ==============');
		// console.log('============== SETPROCESSING ==============');
		// console.log('============== fileUuid: ' + process.fileUuid + ' ==============');

		console.log('SOCKET: setProcessing');

		this._processing[process.fileUuid] = process;
		this._processing[process.fileUuid]._timestamp = new Date().getTime();
	},

	_getProcessing : function (id) {
		// console.log('GET processing'.green, process);
		// console.log('============== GETPROCESSING ==============');
		// console.log('============== GETPROCESSING ==============');
		// console.log('============== GETPROCESSING ==============');
		// console.log('============== id: ' + id + ' ==============');

		console.log('SOCKET: getProcessing');

		return this._processing[id];
	},

	
}
