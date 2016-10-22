var supertest = require('supertest');
var chai = require('chai');
var expect = chai.expect;
// var api = supertest('https://' + process.env.SYSTEMAPIC_DOMAIN);
var helpers = require('../helpers');
var token = helpers.token;
var httpStatus = require('http-status');
var expected = require('../../shared/errors');
var endpoints = require('../endpoints.js');
var Project = require('../../models/project');
var _ = require('lodash');
var forge = require('node-forge');

// api
var domain = (process.env.MAPIC_DOMAIN == 'localhost') ? 'https://172.17.0.1' : 'https://' + process.env.MAPIC_DOMAIN;
var api = supertest(domain);

module.exports = function () {

    describe(endpoints.projects.create, function () {
        
        var test_project = {};

        after(function (done) {
            helpers.delete_project_by_id(test_project.uuid, done);
        });

        // test 1
        it('should be able to create empty project and get valid project in response', function (done) {
            this.slow(10000);
            token(function (err, access_token) {
                test_project.name = 'mocha-project-' + forge.util.bytesToHex(forge.random.getBytesSync(5));
                api.post(endpoints.projects.create)
                    .send({
                        access_token: access_token,
                        name: test_project.name       
                    })
                    .expect(httpStatus.OK)
                    .end(function (err, res) {
                        if (err) return done(err);
                        var project = helpers.parse(res.text).project;
                        expect(project).to.exist;
                        expect(project.uuid).to.exist;
                        expect(project.name).to.be.equal(test_project.name);
                        test_project.uuid = project.uuid;
                        done();
                    });
            });
        });


        // test 2
        it("should respond with status code 401 when not authenticated", function (done) {
            api.post(endpoints.projects.create)
                .send({
                    name: test_project.name
                })
                .expect(httpStatus.UNAUTHORIZED)
                .end(done);
        });


        // test 3
        it('should respond with status code 400 and specific error message if empty body', function (done) {
            token(function (err, access_token) {
                api.post(endpoints.projects.create)
                    .send({access_token: access_token})
                    .expect(httpStatus.BAD_REQUEST)
                    .end(function (err, res) {
                        if (err) return done(err);
                        var result = helpers.parse(res.text);
                        expect(result.error.message).to.be.equal(expected.missing_information.errorMessage);
                        expect(result.error.code).to.be.equal(httpStatus.BAD_REQUEST);
                        expect(result.error.errors.missingRequiredFields).to.be.an.array;
                        expect(result.error.errors.missingRequiredFields).to.include('name');
                        done();
                    });
            });
        });


        // test 4
        it('should respond with status code 400 and specific error message if no project name', function (done) {
            token(function (err, access_token) {
                api.post(endpoints.projects.create)
                    .send({
                        access_token: access_token
                    })
                    .expect(httpStatus.BAD_REQUEST)
                    .end(function (err, res) {
                        if (err) return done(err);
                        var result = helpers.parse(res.text);
                        expect(result.error.message).to.be.equal(expected.missing_information.errorMessage);
                        expect(result.error.code).to.be.equal(httpStatus.BAD_REQUEST);
                        expect(result.error.errors.missingRequiredFields).to.be.an.array;
                        expect(result.error.errors.missingRequiredFields).to.include('name');
                        done();
                    });
            });
        });

        // test 5
        it('should respond with status code 400 and specific error message if project with specific name already exist', function (done) {
            token(function (err, access_token) {
                api.post(endpoints.projects.create)
                    .send({
                        name: test_project.name,
                        access_token: access_token
                    })
                    .expect(httpStatus.BAD_REQUEST)
                    .end(function (err, res) {
                        if (err) return done(err);
                        var result = helpers.parse(res.text);
                        expect(result.error.message).to.be.equal(expected.project_with_such_name_already_exist.errorMessage);
                        expect(result.error.code).to.be.equal(httpStatus.BAD_REQUEST);
                        done();
                    });
            });
        });

    });
};