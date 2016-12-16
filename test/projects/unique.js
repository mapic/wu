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
var api = supertest(domain);

module.exports = function () {
    describe(endpoints.projects.slug.unique, function () {
        it("should respond with status code 401 when not authenticated", function (done) {
            api.post(endpoints.projects.slug.unique)
                .send({})
                .expect(httpStatus.UNAUTHORIZED)
                .end(done);
        });

        it('should respond with status code 200', function (done) {
            token(function (err, access_token) {
                api.post(endpoints.projects.slug.unique)
                    .send({access_token: access_token , slug : "its-a-slug" , createdByClient : 'admin' , uuid : '' }) // ?? should send slug?
                    .expect(httpStatus.OK)
                    .end(function (err, res) {
                        console.log("***************************--------------------->");
                        if (err) return done(err);
                        var result = helpers.parse(res.text);
                        expect(result.uniqueSlug).to.be.true;
                        done();
                    });
            });
        });

    });
};