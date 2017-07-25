// api
var api = module.parent.exports;

// config
var config = require('../config.js').serverConfig;

// redis stores
var redisLayers = require('redis').createClient(config.redis.layers.port, config.redis.layers.host);
redisLayers.on('error', function (err) {console.log('Redis error: ', err);});
var redisStats = require('redis').createClient(config.redis.stats.port, config.redis.stats.host);
redisStats.on('error', function (err) {console.log('Redis error: ', err);});
var redisTemp = require('redis').createClient(config.redis.temp.port, config.redis.temp.host);
redisTemp.on('error', function (err) {console.log('Redis error: ', err);});

function redisLayersAuth () {
    redisLayers.auth(config.redis.layers.auth, function (err) {
        if (err) {
            console.log('redisLayers auth error: ', err);
            console.log('Retrying...')
            setTimeout(redisLayersAuth, 500);
        } else {    
            console.log('Redis Layers authenticated OK')
        }
    });
}
function redisStatsAuth () {
    redisStats.auth(config.redis.stats.auth, function (err) {
        if (err) {
            console.log('redisStats auth error: ', err);
            console.log('Retrying...')
            setTimeout(redisStatsAuth, 500);
        } else {    
            console.log('Redis Stats authenticated OK')
        }
    });
}
function redisTempAuth () {
    redisTemp.auth(config.redis.temp.auth, function (err) {
        if (err) {
            console.log('redisTemp auth error: ', err);
            console.log('Retrying...')
            setTimeout(redisTempAuth, 500);
        } else {    
            console.log('Redis Temp authenticated OK')
        }
    });
}


// auth with automatic retry
redisLayersAuth();
redisStatsAuth();
redisTempAuth();

// exports
module.exports = api.redis = { 
	layers : redisLayers,
	tokens : redisLayers, // todo: create own instance for this?
	stats : redisStats,
	temp : redisTemp
};
