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

// api
var api = require('../api/api');
var config = api.config;
var port = config.port;

// socket enabled server
var app = express().http().io();

// connect to our database
var sessionStore = mongoose.connect(config.mongo.url); 

// set up our express application
app.use(bodyParser.urlencoded({limit: '2000mb', extended : true}));
app.use(bodyParser.json({limit:'2000mb'}));
app.set('view engine', 'ejs'); // set up ejs for templating
app.use(multipart()); // for resumable.js uploads

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

// launch 
var server = app.listen(port);

console.log('The magic happens @ ', port);

// helper fn
function socket_auth_middleware (socket, next) {
	try {
	if (!socket || !socket.headers || !socket.headers.cookie) return next(new Error('No socket, fatal.'));
	var c = socket.headers.cookie;
	var session_cookie_raw = _.find(c.split('; '), function (sc) {
		return _.includes(sc, 'session');
	});
	if (!session_cookie_raw) return next(new Error('No session.'));
	var session_cookie = session_cookie_raw.split('=')[1];
	if (!session_cookie) return next(new Error('No session.'));
	var decoded_cookie = clientSession.util.decode(sessionOptions, session_cookie);
	if (!decoded_cookie) return next(new Error('Invalid access token.'));
	var tokens = decoded_cookie.content ? decoded_cookie.content.tokens : false;
	if (!tokens || !tokens.access_token) return next(new Error('Invalid access token.')); // public will fail here, returns 500...
	api.token._authenticate(tokens.access_token, function (err, user) {
		if (err) return next(err);
		socket.session = socket.session || {};
		socket.session.user_id = user._id;
		next();
	});
	} catch (e) {
		next(new Error('Something went wrong.'));
	}
}