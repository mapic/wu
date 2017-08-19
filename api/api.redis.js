// api
var api = module.parent.exports;

// config
var config = require('../config.js').serverConfig;

// redis store
var redis = require('redis').createClient(config.redis.port, config.redis.host);
redis.on('error', function (err) {console.log('Redis error: ', err);});

function redis_auth () {
    redis.auth(config.redis.auth, function (err) {
        if (err) {
            console.log('redis auth error: ', err);
            console.log('Retrying...')
            setTimeout(redis_auth, 500);
        } else {    
            console.log('Redis authenticated OK')
        }
    });
}


// auth with automatic retry
redis_auth();

// exports
module.exports = api.redis = { 
	layers : redis,
	tokens : redis, 
	stats : redis,
	temp : redis
};
