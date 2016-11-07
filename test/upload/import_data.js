var assert = require('assert');
var mongoose = require('mongoose');
var async = require('async');
var fs = require('fs');
var crypto = require('crypto');
var supertest = require('supertest');
var httpStatus = require('http-status');
var path = require('path');
var chai = require('chai');
var expect = chai.expect;

// configs
var config = require('../../config.js').serverConfig;
var User = require('../../models/user');
var Project = require('../../models/project');
var Layer = require('../../models/layer');
var File = require('../../models/file');
var helpers = require('../helpers');
var token = helpers.token;
var expected = require('../../shared/errors');
var httpStatus = require('http-status');
var endpoints = require('../endpoints.js');
var testData = require('../shared/upload/import_data.json');
var tmp = {};

// api
var domain = (process.env.MAPIC_DOMAIN == 'localhost') ? 'https://172.17.0.1' : 'https://' + process.env.MAPIC_DOMAIN;
var api = supertest(domain);

// Avoids DEPTH_ZERO_SELF_SIGNED_CERT error for self-signed certs
// See https://github.com/systemapic/pile/issues/38
process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

module.exports = function () {

    describe('Shapefile', function () {
        this.slow(10000);
        this.timeout(10000);

        before(function(callback) {
            async.series([helpers.create_project], callback);
        });
        after(function(callback) {
            async.series([helpers.delete_project], callback);
        });
        
        it('upload shapefile.polygon.zip', function (done) {
            token(function (err, access_token) {
                api.post(endpoints.import.post)
                .type('form')
                .field('access_token', access_token)
                .field('data', fs.createReadStream(path.resolve(__dirname, '../open-data/shapefile.polygon.zip')))
                .expect(httpStatus.OK)
                .end(function (err, res) {
                    assert.ifError(err);
                    var result = helpers.parse(res.text);
                    assert.ok(result.file_id);
                    assert.ok(result.user_id);
                    assert.ok(result.upload_success);
                    assert.equal(result.filename, 'shapefile.polygon.zip');
                    assert.equal(result.status, 'Processing');
                    assert.ifError(result.error_code);
                    assert.ifError(result.error_text);
                    tmp.file_id = result.file_id;
                    done();
                });
            });
        });

        it('get status', function (done) {
            token(function (err, access_token) {
                api.get(endpoints.import.status)
                .query({file_id : tmp.file_id, access_token : access_token})
                .expect(httpStatus.OK)
                .end(function (err, res) {
                    assert.ifError(err);
                    var result = helpers.parse(res.text);
                    assert.ok(result.file_id);
                    assert.ok(result.user_id);
                    assert.ok(result.upload_success);
                    assert.equal(result.filename, 'shapefile.polygon.zip');
                    assert.equal(result.status, 'Processing');
                    assert.ifError(result.error_code);
                    assert.ifError(result.error_text);
                    done();
                });
            })
        });

        it('should be processed', function (done) {       
            this.timeout(11000);     
            this.slow(5000);

            token(function (err, access_token) {
                var processingInterval = setInterval(function () {
                    api.get(endpoints.import.status)
                    .query({ file_id : tmp.file_id, access_token : access_token})
                    .end(function (err, res) {
                        assert.ifError(err);
                        var status = helpers.parse(res.text);
                        // return when import done
                        if (status.processing_success) {
                            clearInterval(processingInterval);
                            done();
                        }
                    });
                }, 500);
            });

        });

        it('should be processed without errors', function (done) {
            token(function (err, access_token) {
                api.get(endpoints.import.status)
                .query({file_id : tmp.file_id, access_token : access_token})
                .expect(httpStatus.OK)
                .end(function (err, res) {
                    assert.ifError(err);
                    var status = helpers.parse(res.text);
                    assert.ifError(err);
                    assert.ok(status.upload_success);
                    assert.ifError(status.error_code);
                    assert.ifError(status.error_text);
                    assert.equal(status.user_id, helpers.test_user.uuid);
                    assert.equal(status.data_type, 'vector');
                    assert.ok(status.processing_success);
                    assert.equal(status.status, 'Done');
                    assert.equal(status.rows_count, 13);
                    done();
                });
            })
        });

        it("200 & download as file", function (done) {
            token(function (err, access_token) {
                if (err) return done(err);
                api.get(endpoints.import.download)
                .query({file_id: tmp.file_id, access_token: access_token})
                .expect(httpStatus.OK)
                .end(function (err, res) {
                    if (err) return done(err);
                    var result = helpers.parse(res.text);
                    expect(result.file.type).to.be.equal('postgis');
                    expect(result.file.originalName).to.be.equal('shapefile.polygon.zip');
                    expect(result.file.name).to.be.equal('shapefile.polygon');
                    done();
                });
            });
        });
    }); 

    describe('Cleanup', function () {
        this.slow(500);
        var relatedLayer = testData.relatedLayer;
        var relatedProject = testData.relatedProject;
        before(function (done) {
            var ops = [];
            ops.push(function (callback) {
                relatedLayer.data = {
                    postgis: {
                        table_name: tmp.file_id
                    }
                };
                helpers.create_layer_by_parameters(relatedLayer, function (err, res) {
                    if (err) return callback(err);
                    relatedLayer = res;
                    callback(null, relatedLayer);
                });
            });
            ops.push(function (options, callback) {
                relatedProject.layers = [options];
                helpers.create_project_by_info(relatedProject, function (err, res) {
                    if (err) return callback(err);
                    relatedProject = res;
                    callback(null, relatedProject);
                });
            });
            async.waterfall(ops, done);
        });

        after(function (done) {
            var ops = [];
            ops.push(function (callback) {
                helpers.delete_project_by_id(relatedProject.uuid, callback);
            });
            ops.push(function (options, callback) {
                helpers.delete_layer_by_id(relatedLayer.uuid, callback);
            });
            async.waterfall(ops, done);     
        });

        it('should be able to delete file correctly', function (done) {
            var ops = [];
            
            ops.push(function (callback) {
                token(function (err, access_token) {
                    api.post(endpoints.data.delete)
                    .send({file_id : tmp.file_id, access_token : access_token})
                    .expect(httpStatus.OK)
                    .end(function (err, res) {
                        if (err) return callback(err);
                        var result = helpers.parse(res.text);
                        expect(result.success).to.be.true;
                        callback(null, result);
                    });
                });
            });

            ops.push(function (options, callback) {
                Project.findOne({uuid: relatedProject.uuid})
                .exec(function (err, updatedProject) {
                    if (err) return callback(err);
                    expect(updatedProject.layers).to.be.empty;
                    callback(null, updatedProject);
                });
            });

            ops.push(function (options, callback) {
                Layer.find({uuid: relatedLayer.uuid})
                .exec(function (err, updatedLayer) {
                    if (err) return callback(err);
                    expect(updatedLayer).to.be.empty;
                    callback(null, updatedLayer);
                });
            });

            ops.push(function (options, callback) {
                File.find({uuid: tmp.file_id})
                .exec(function (err, result) {
                    if (err) return callback(err);
                    expect(result).to.be.empty;
                    callback(null, result);
                });
            });
            async.waterfall(ops, done); 

        });

    });

};
