// API: api.upload.js
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

// resumable.js
var r = require('../tools/resumable-node')('/data/tmp/');

// postgres
var pg = require('pg');


// api
var api = module.parent.exports;

// exports
module.exports = api.postgis = { 

	
	createDatabase : function (options, done) {
		console.log('createDatabase options: ', options);

		var user = options.user,
		    userUuid = options.user.uuid,
		    userName = '"' + options.user.firstName + ' ' + options.user.lastName + '"',
		    pg_db = api.utils.getRandomChars(10),
		    CREATE_DB_SCRIPT_PATH = '../scripts/postgis/create_database.sh'; // todo: put in config
		
		// create database script
		var command = [
			CREATE_DB_SCRIPT_PATH, 	// script
			pg_db, 			// database name
			userName,		// username
			userUuid		// userUuid
		].join(' ');

		// create database in postgis
		exec(command, {maxBuffer: 1024 * 50000}, function (err) {
			if (err) return done(err);

			// save pg_db name to user
			User
			.findOne({uuid : userUuid})
			.exec(function (err, usr) {
				usr.postgis_database = pg_db;
				usr.save(function (err) {
					options.user = usr; // add updated user
					done(null, options);
				});
			});
		});
	},

	ensureDatabaseExists : function (options, done) {
		var userUuid = options.user.uuid;

		User
		.findOne({uuid : userUuid})
		.exec(function (err, user) {
			if (err) return done(err);

			// if already exists, return
			if (user.postgis_database) return done(null, options);

			// doesn't exist, must create
			api.postgis.createDatabase(options, function (err, opts) {
				if (err) return done(err);

				// all good
				done(null, opts);
			});
		});
	},


	import : function (options, done) {

		var ops = [];

		// ensure database exists
		ops.push(function (callback) {
			api.postgis.ensureDatabaseExists(options, callback);
		});

		// import according to type
		ops.push(function (options, callback) {

			// get which type of data
			var geotype = api.postgis._getGeotype(options);

			// if no geotype, something's wrong
			if (!geotype) return callback('api.upload.organizeImport err 4: invalid geotype!');

			// send to appropriate api.postgis.import_
			if (geotype == 'shapefile') 	return api.postgis.importShapefile(options, callback);
			if (geotype == 'geojson') 	return api.postgis.importGeojson(options, callback);
			if (geotype == 'raster') 	return api.postgis.importRaster(options, callback);

			// not type caught, err
			callback('Not a valid geotype. Must be Shapefile, GeoJSON or Raster.');

		});


		async.waterfall(ops, function (err, results) {
			console.log('api.postgis.import done', err, results);

			done && done(err, results);
		});

	},


	importGeojson : function (options, done) {
		console.log('importGeosjon', options);

		// need to convert to ESRI shapefile (ouch!) first..
		var geojsonPath = options.files[0],
		    geojsonBasename = api.postgis._getBasefile(geojsonPath),
		    shapefileFolder = '/data/tmp/' + api.utils.getRandom(5) + '/',
		    shapefileBasename = geojsonBasename + '.shp',
		    shapefilePath = shapefileFolder + shapefileBasename,
		    ops = [];

		// create dir
		ops.push(function (callback) {
			fs.ensureDir(shapefileFolder, callback);
		});

		// convert to shape
		ops.push(function (callback) {
			var cmd = [
				'ogr2ogr',
				'-f',
				'"ESRI Shapefile"',
				shapefilePath,
				geojsonPath
			].join(' ');

			exec(cmd, callback);
		});


		ops.push(function (callback) {

			// get content of dir
			fs.readdir(shapefileFolder, function (err, files) {
				if (err) return callback(err);
				
				// add path to files, and add to options
				options.files = [];
				files.forEach(function (file) {
					options.files.push(shapefileFolder + file);
				});

				callback(null);
			});
		});


		ops.push(function (callback) {

			// do shapefile import
			api.postgis.importShapefile(options, callback);

		});

		// run ops
		async.series(ops, done);


	},
	
	importRaster : function (options, done) {

		var clientName 	= options.clientName,
		    raster 	= options.files[0],
		    fileUuid 	= 'raster_' + api.utils.getRandom(10),
		    pg_db 	= options.user.postgis_database;

		var IMPORT_RASTER_SCRIPT_PATH = '../scripts/postgis/import_raster.sh'; // todo: put in config
		
		// create database script
		var cmd = [
			IMPORT_RASTER_SCRIPT_PATH, 	// script
			raster,
			fileUuid,
			pg_db
		].join(' ');

		console.log('importRaster cmd: ', cmd);

		// import to postgis
		console.time('import took');
		exec(cmd, {maxBuffer: 1024 * 50000}, function (err) {
			console.timeEnd('import took');

			done(err, 'Raster imported successfully.');
		});

	},

	importShapefile : function (options, done) {

		var files 	= options.files,
		    shape 	= api.geo.getTheShape(files)[0],
		    fileUuid 	= 'shape_' + api.utils.getRandom(10),
		    pg_db 	= options.user.postgis_database;

		var IMPORT_SHAPEFILE_SCRIPT_PATH = '../scripts/postgis/import_shapefile.sh'; // todo: put in config
		
		// create database script
		var cmd = [
			IMPORT_SHAPEFILE_SCRIPT_PATH, 	// script
			shape,
			fileUuid,
			pg_db
		].join(' ');

		console.log('importShapefile cmd: ', cmd);

		// import to postgis
		console.time('import took');
		exec(cmd, {maxBuffer: 1024 * 50000}, function (err) {
			console.timeEnd('import took');

			done(err, 'Shapefile imported successfully.');
		});
	},




	_getGeotype : function (options) {
		var files = options.files,
		    type = false;

		// only one file
		if (files.length == 1) {
			var ext = files[0].split('.').reverse()[0];
			if (ext == 'geojson') return 'geojson';
			if (ext == 'ecw') return 'raster';
			if (ext == 'jp2') return 'raster';
			if (ext == 'tif') return 'raster';
			if (ext == 'tiff') return 'raster';
		}

		// several files
		files.forEach(function (file) {
			var ext = file.split('.').reverse()[0];
			if (ext == 'shp') type = 'shapefile';
		});

		return type;
	},


	_getShapefile : function (shapes) {
		var shapefile;
		for (s in shapes) {
			if (shapes[s] && shapes[s].slice(-4) == '.shp') {
				var shapefile = shapes[s];
			}
		}
		return shapefile;
	},

	_getBasefile : function (file) {
		var filename = file.split('/').reverse()[0];
		return filename;
	},




}