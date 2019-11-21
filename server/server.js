// server.js
var express  = require('express.io');
var mongoose = require('mongoose');
var flash    = require('connect-flash');
var path     = require('path');
var compress = require('compression');
var favicon  = require('serve-favicon');
var cors     = require('cors');
var morgan   = require('morgan');
var session  = require('express-session');
var multipart = require('connect-multiparty');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser'); 
var clientSession = require('client-sessions');
var fs = require('fs');
var _ = require('lodash');
var sleep = require('sleep'); 

// api
var api = require('../api/api');
var config = api.config;
var port = config.port;

// cookie session options
var sessionOptions = {
	cookieName: 'session',
	secret: 'eg[isfd-8yF9-7w2335df{}+Ijsli;;to8', 
	duration: 3 * 24 * 60 * 60 * 1000, // 3d
	activeDuration: 60 * 60 * 10000, // 10h
	cookie: {
		path: '/', 
		ephemeral: false, // when true, cookie expires when the browser closes
		httpOnly: true, // when true, cookie is not accessible from javascript
		secureProxy : true,
	}
};

// socket enabled server
var app = express().http().io();

// connect to our database
connect_to_mongo(function (err) {

	// set up our express application
	app.use(bodyParser.urlencoded({limit: '2000mb', extended : true}));
	app.use(bodyParser.json({limit:'2000mb'}));
	app.set('view engine', 'ejs'); // set up ejs for templating
	app.use(multipart()); // for resumable.js uploads

	
	// use cookie session
	app.use(clientSession(sessionOptions));

	// socket auth middleware
	app.io.use(socket_auth_middleware);

	// set favicon
	app.use(favicon(__dirname + '/../public/images/favicon.ico'));

	// enable compression
	app.use(compress());

	// enable cors
	app.use(cors());

	// static files
	var staticPath = '../public';
	app.use(express.static(path.join(__dirname, staticPath)));
	app.use(express.static(process.cwd() + '../views/debug'));

	// catch route errors
	app.use(function(err, req, res, next){ 
		err.status === 400 ? res.render('../../views/index.ejs') : next(err);
	});

	// load our routes and pass in our app
	require('../routes/routes.js')(app);

	// load our socket api
	require('../routes/socket.routes.js')(app);

	// when mongoose is ready
	mongoose.connection.on('open', function (ref) {

		// launch 
		var server = app.listen(port);
		console.log('The magic happens @ ', port);

	  	// create admin user
		api.user.ensureAdminUser(function (err, options) {
			if (err) return console.log('There was an error creating mapic-admin user.', err);
			if (options.created) {
				console.log('User mapic-admin has been created. Log in to the portal with these credentials:')
				console.log('Email:', options.user.local.email);
				console.log('Password:', options.password);
			}
		});
	});

});

// helper fn
function connect_to_mongo (done) {
	console.log('Attempting to connect to MongoDB with', config.mongo.url);
	mongoose.connect(config.mongo.url, function (err) {
		if (!err) return done();
		console.log('Failed to connect to MongoDB:', err.message);
		sleep.sleep(2);
		return connect_to_mongo(done);
	});
}


console.report = function (msg, event, user) {
	console.log(msg);
	api.slack.userEvent({
		user : user || 'pre-auth',
		event : event || 'error',
		description : msg
	})
}

// helper fn
function socket_auth_middleware (socket, next) {
	try {
		if (!socket || !socket.headers || !socket.headers.cookie) {
			console.report('Socket error #1: No socket...', 'error');
			return next(new Error('No socket, fatal.'));
		}
		var c = socket.headers.cookie;
		var session_cookie_raw = _.find(c.split('; '), function (sc) { return _.includes(sc, 'session'); });
		if (!session_cookie_raw) {
			console.report('Socket error #2: No session...', 'error');
			return next(new Error('No session.'));
		}
		var session_cookie = session_cookie_raw.split('=')[1];
		if (!session_cookie) {
			console.report('Socket error #3: No session...', 'error');
			return next(new Error('No session.'));
		}
		var decoded_cookie = clientSession.util.decode(sessionOptions, session_cookie);
		if (!decoded_cookie) {
			console.report('Socket error #4: Invalid access token...', 'error');
			return next(new Error('Invalid access token.'));
		}
		var tokens = decoded_cookie.content ? decoded_cookie.content.tokens : false;
		if (!tokens || !tokens.access_token) {
			console.report('Socket error #5: Invalid access token...', 'error');
			return next(new Error('Invalid access token.')); // public will fail here, returns 500...
		}

		// authenticate 
		api.token._authenticate(tokens.access_token, function (err, user) {
			if (err) console.report('Socket error #6: ' + err, 'error');
			if (err) return next(err);

			// all good
			socket.session = socket.session || {};
			socket.session.user_id = user._id;
			console.report('Socket auth OK.', 'success', user.username);
			next();
		});

	// catch other errors
	} catch (e) {
		console.report('Socket error #7:' + e);
		console.log(e);
		next(new Error('Something went wrong.'));
	}
}
