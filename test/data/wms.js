var supertest = require('supertest');
var chai = require('chai');
var expect = chai.expect;
// var api = supertest('https://' + process.env.SYSTEMAPIC_DOMAIN);
var helpers = require('../helpers');
var token = helpers.token;
var expected = require('../../shared/errors');
var httpStatus = require('http-status');
var format = require('util').format;
var endpoints = require('../endpoints.js');

// api
var domain = (process.env.MAPIC_DOMAIN == 'localhost') ? 'https://172.17.0.1' : 'https://' + process.env.MAPIC_DOMAIN;
var api = supertest(domain);

// Avoids DEPTH_ZERO_SELF_SIGNED_CERT error for self-signed certs
// See https://github.com/systemapic/pile/issues/38
process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

module.exports = function () {
    describe(endpoints.data.layers, function () {
        this.slow(500);

        // prepare & cleanup
        before(helpers.createProject);
        after(helpers.deleteProject);

        

        // test 1
        it('should add WMS layer to project (?)', function (done) {
            // api.post(endpoints.data.layers)
            // .send({})
            // .expect(httpStatus.UNAUTHORIZED)
            // .end(done);
        });


    });

};