var assert = require('assert');
var mongoose = require('mongoose');
var async = require('async');
var fs = require('fs');
var crypto = require('crypto');
var request = require('request');
var supertest = require('supertest');

// configs
var User = require('../models/user');
var config = require('../config.js').serverConfig;
var helpers = require('./helpers');
var token = helpers.token;

// api
var domain = (process.env.MAPIC_DOMAIN == 'localhost') ? 'https://172.17.0.1' : 'https://' + process.env.MAPIC_DOMAIN;
var api = supertest(domain);

// Avoids DEPTH_ZERO_SELF_SIGNED_CERT error for self-signed certs
// See https://github.com/systemapic/pile/issues/38
process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

describe('Authentication', function () {
   
    it('should be created', function (done) {
        helpers.create_user(done);
    });

    it('should be found', function (done) {
        User.findOne({uuid : helpers.test_user.uuid}).exec(done);
    });

    it('should have correct details', function (done) {
        User.findOne({uuid : helpers.test_user.uuid})
        .exec(function (err, userModel) {
            assert.ifError(err);
            assert.equal(userModel.local.email, helpers.test_user.email);
            assert.equal(userModel.firstName, helpers.test_user.firstName);
            assert.equal(userModel.lastName, helpers.test_user.lastName);
            assert.ok(userModel._id);
            done();
        });
    });

    after(function (done) {
        helpers.delete_user(done);
    });

});
