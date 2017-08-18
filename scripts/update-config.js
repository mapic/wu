var fs = require("fs");
var crypto = require("crypto");

// set config folder
// var CONFIG_FOLDER       = '/config/';
var ENGINE_CONFIG_PATH  = "/mapic/engine/engine.config.js";

// check if folder exists
// if (!fs.existsSync(CONFIG_FOLDER)) {
//     console.log(CONFIG_FOLDER, 'does not exist. Quitting!');
//     process.exit(1);
// }

var MAPIC_DOMAIN = process.env.MAPIC_DOMAIN;
var redisPassString = process.env.MAPIC_REDIS_AUTH;
var mongoPassString = process.env.MAPIC_MONGO_AUTH;

console.log('redisPassString', redisPassString);
console.log('mongoPassString', mongoPassString);
console.log('MAPIC_DOMAIN: ', MAPIC_DOMAIN);


// engine
var engineConfig = require(ENGINE_CONFIG_PATH);
engineConfig.serverConfig.mongo.url =  'mongodb://' + mongo_config.user + ':' + mongoPassString + '@mongo/' + mongo_config.database;
engineConfig.serverConfig.redis.layers.auth = redisPassString;
engineConfig.serverConfig.redis.stats.auth = redisPassString;
engineConfig.serverConfig.redis.temp.auth = redisPassString;

var domain_split = MAPIC_DOMAIN.split('.').reverse();
var MAPIC_ROOT_DOMAIN = domain_split[1] + '.' + domain_split[0];
var MAPIC_SUBDOMAIN = domain_split.reverse()[0];
var MAPIC_BASE_URL = 'https://' + MAPIC_DOMAIN;

engineConfig.serverConfig.portalServer.uri = 'https://' + MAPIC_DOMAIN + '/';
engineConfig.clientConfig.servers.portal = 'https://' + MAPIC_DOMAIN + '/';
engineConfig.clientConfig.servers.subdomain = 'https://{s}.' + MAPIC_ROOT_DOMAIN + '/';
engineConfig.clientConfig.servers.tiles.uri = 'https://{s}.' + MAPIC_ROOT_DOMAIN + '/v2/tiles/';
engineConfig.clientConfig.servers.tiles.subdomains = [
    'tiles-a-' + MAPIC_SUBDOMAIN, 
    'tiles-b-' + MAPIC_SUBDOMAIN, 
    'tiles-c-' + MAPIC_SUBDOMAIN, 
    'tiles-d-' + MAPIC_SUBDOMAIN 
];
engineConfig.clientConfig.servers.cubes.uri = 'https://{s}.' + MAPIC_ROOT_DOMAIN + '/v2/cubes/';
engineConfig.clientConfig.servers.cubes.subdomains = engineConfig.clientConfig.servers.tiles.subdomains;
engineConfig.clientConfig.servers.proxy.uri = 'https://{s}.' + MAPIC_ROOT_DOMAIN + '/v2/tiles/';
engineConfig.clientConfig.servers.proxy.subdomains = [
    'proxy-a-' + MAPIC_SUBDOMAIN, 
    'proxy-b-' + MAPIC_SUBDOMAIN, 
    'proxy-c-' + MAPIC_SUBDOMAIN, 
    'proxy-d-' + MAPIC_SUBDOMAIN 
];
engineConfig.clientConfig.servers.utfgrid.uri = 'https://{s}.' + MAPIC_ROOT_DOMAIN + '/v2/tiles/';
engineConfig.clientConfig.servers.utfgrid.subdomains = [
    'grid-a-' + MAPIC_SUBDOMAIN, 
    'grid-b-' + MAPIC_SUBDOMAIN, 
    'grid-c-' + MAPIC_SUBDOMAIN, 
    'grid-d-' + MAPIC_SUBDOMAIN 
];

var engineJsonStr = 'module.exports = ' + JSON.stringify(engineConfig, null, 2);
fs.writeFileSync(ENGINE_CONFIG_PATH , engineJsonStr, 'utf-8');
console.log('mapic/engine config updated!');
