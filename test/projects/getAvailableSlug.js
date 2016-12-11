var supertest = require('supertest');
var chai = require('chai');
var expect = chai.expect;
// var api = supertest('https://' + process.env.SYSTEMAPIC_DOMAIN);
var helpers = require('../helpers');
var token = helpers.token;
var httpStatus = require('http-status');
var endpoints = require('../endpoints.js');

// api
var domain = (process.env.MAPIC_DOMAIN == 'localhost') ? 'https://172.17.0.1' : 'https://' + process.env.MAPIC_DOMAIN;
console.log(domain);
var api = supertest(domain);

module.exports = function () {
    describe(endpoints.projects.slug.available, function () {
        it("should respond with status code 401 when not authenticated", function (done) {
            api.post(endpoints.projects.slug.available)
                .send({})
                .expect(httpStatus.UNAUTHORIZED)
                .end(done);
        });

    });
};
