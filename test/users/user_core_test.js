var userUpdate = require('./update');
var userUniqueEmail = require('./uniqueEmail');
var userUniqueUsername = require('./uniqueUsername');
var userInvite = require('./invite');
var userRequestContact = require('./requestContact');
var userGetInviteLink = require('./getInviteLink');
var userInviteToProject = require('./inviteToProjects');
var userResetPassword = require('./resetPassword');
var userSetPassword = require('./setPassword');
var userToken = require('./token');
var userTokenCheck = require('./tokenCheck');
var userTokenRefresh = require('./tokenRefresh');
var userAcceptInvite = require('./acceptInvite');
var helpers = require('../helpers');
var createUser = require('./create');

// Avoids DEPTH_ZERO_SELF_SIGNED_CERT error for self-signed certs
// See https://github.com/systemapic/pile/issues/38
process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

describe('User', function () {
    beforeEach(function(done) { helpers.create_user(done); });
    afterEach(function(done) { helpers.delete_user(done); });
    this.slow(500);

    userUpdate();
    userUniqueEmail();
    userUniqueUsername();
    userInvite();
    userRequestContact();
    userGetInviteLink();
    userInviteToProject();
    userResetPassword();
    userSetPassword();
    userToken();
    userTokenRefresh();
    userTokenCheck();
    userAcceptInvite();
    createUser();
});
