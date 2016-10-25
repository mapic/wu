var helpers = require('../helpers');
var projectUpdate = require('./update');
var projectCreate = require('./create');
var projectUnique = require('./unique');
var projectDelete = require('./delete');
var getPublic = require('./getPublic');
var getPrivate = require('./getPrivate');
var getProjectLayers = require('./getProjectLayers');
var setAccess = require('./setAccess');

// Avoids DEPTH_ZERO_SELF_SIGNED_CERT error for self-signed certs
// See https://github.com/systemapic/pile/issues/38
process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

describe('Project', function () {
    this.slow(500);
    before(function(done) { helpers.create_user(done); });
    after(function(done) { helpers.delete_user(done); });

    projectUpdate();
    projectCreate();
    projectDelete();
    projectUnique();
    getProjectLayers();
	getPublic();
	getPrivate();
    setAccess();
});
