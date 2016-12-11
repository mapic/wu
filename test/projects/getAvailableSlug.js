var supertest = require('supertest');
var chai = require('chai');
var expect = chai.expect;
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

        it('should respond with available slug of a project', function (done) {
            token(function (err, access_token) {
                api.post(endpoints.projects.slug.available)
                    .send({access_token: access_token , project_name : "Project Name ZZZ" , created_by_username : "admin" })
                    .expect(httpStatus.OK)
                    .end(function (err, res) {
                        if (err) return done(err);
                        var result = helpers.parse(res.text);
                        expect(result.slug).to.be.equal("project-name-zzz");
                        done();
                    });
            });
        });

    });
};
