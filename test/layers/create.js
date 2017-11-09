var supertest = require('supertest');
var chai = require('chai');
var expect = chai.expect;
var _ = require('lodash');
var async = require('async');
// var api = supertest('https://' + process.env.SYSTEMAPIC_DOMAIN);
var helpers = require('../helpers');
var token = helpers.token;
var httpStatus = require('http-status');
var Layer = require('../../models/layer');
var endpoints = require('../endpoints.js');
var testData = require('../shared/layers/create.json');


// api
var domain = (process.env.MAPIC_DOMAIN == 'localhost') ? 'https://172.17.0.1' : 'https://' + process.env.MAPIC_DOMAIN;
var api = supertest(domain);


module.exports = function () {
    describe(endpoints.layers.create, function () {


        // variables: todo: move to shared fiel
        var newLayer = testData.newLayer;
        var graph_layer;

        // test 1
        it('should respond with status code 401 when not authenticated', function (done) {
            api.post(endpoints.layers.create)
                .send({})
                .expect(httpStatus.UNAUTHORIZED)
                .end(done);
        });


        // test 2
        it('should respond with status code 200 and create new layer', function (done) {
            token(function (err, access_token) {
                if (err) return done(err);
                newLayer.access_token = access_token;
                api.post(endpoints.layers.create)
                    .send(newLayer)
                    .expect(httpStatus.OK)
                    .end(function (err, res) {
                        if (err) return done(err);
                        var result = helpers.parse(res.text);
                        expect(_.size(result.uuid)).to.be.equal(42);
                        expect(result.title).to.be.equal(newLayer.title);
                        expect(result.description).to.be.equal(newLayer.description);
                        newLayer.uuid = result.uuid;
                        done();
                    });
            });
        });

        // create graph layer
        it('should create M.Layer.Graph layer with GeoJSON only', function (done) {
            token(function (err, access_token) {
                if (err) return done(err);

                graph_layer = {
                    title : 'Test graph layer',
                    description : 'M.Layer.Graph',
                    data : {
                        graph : JSON.stringify({
                            geojson : {
                                "type": "FeatureCollection",
                                "features": [
                                    {
                                      "type": "Feature",
                                      "properties": {},
                                      "geometry": {
                                        "type": "Polygon",
                                        "coordinates": [
                                          [
                                            [
                                              9.940030574798584,
                                              60.80274413521606
                                            ],
                                            [
                                              9.939515590667725,
                                              60.80225216196818
                                            ],
                                            [
                                              9.940491914749146,
                                              60.80176541503904
                                            ],
                                            [
                                              9.942712783813475,
                                              60.80148801831777
                                            ],
                                            [
                                              9.943206310272215,
                                              60.802000938670645
                                            ],
                                            [
                                              9.940030574798584,
                                              60.80274413521606
                                            ]
                                          ]
                                        ]
                                      }
                                    }
                                ]
                            },
                        })
                    }
                };

                graph_layer.access_token = access_token;
                api.post(endpoints.layers.create)
                .send(graph_layer)
                .expect(httpStatus.OK)
                .end(function (err, res) {
                    if (err) return done(err);
                    var result = helpers.parse(res.text);
                    expect(_.size(result.uuid)).to.be.equal(42);
                    expect(result.title).to.be.equal(graph_layer.title);
                    expect(result.description).to.be.equal(graph_layer.description);
                    result.uuid = graph_layer.uuid;
                    expect(result.data.graph).to.be.equal(graph_layer.data.graph);
                    done();
                });
            });
        });



        // create graph layer
        it('should create M.Layer.Graph layer with GeoJSON and CSV data', function (done) {
            token(function (err, access_token) {
                if (err) return done(err);

                graph_layer = {
                    title : 'Test graph layer',
                    description : 'M.Layer.Graph',
                    data : {
                        graph : JSON.stringify({
                            csv : [{
                                title : 'Water',
                                data : [ [ 'a', 'b', 'c' ], [ 'a', 'b', 'c' ] ] // see https://www.npmjs.com/package/csv-string
                            }],
                            geojson : {
                                "type": "FeatureCollection",
                                "features": [
                                    {
                                      "type": "Feature",
                                      "properties": {},
                                      "geometry": {
                                        "type": "Polygon",
                                        "coordinates": [
                                          [
                                            [
                                              9.940030574798584,
                                              60.80274413521606
                                            ],
                                            [
                                              9.939515590667725,
                                              60.80225216196818
                                            ],
                                            [
                                              9.940491914749146,
                                              60.80176541503904
                                            ],
                                            [
                                              9.942712783813475,
                                              60.80148801831777
                                            ],
                                            [
                                              9.943206310272215,
                                              60.802000938670645
                                            ],
                                            [
                                              9.940030574798584,
                                              60.80274413521606
                                            ]
                                          ]
                                        ]
                                      }
                                    }
                                ]
                            },
                        })
                    }
                };

                graph_layer.access_token = access_token;
                api.post(endpoints.layers.create)
                .send(graph_layer)
                .expect(httpStatus.OK)
                .end(function (err, res) {
                    if (err) return done(err);
                    var result = helpers.parse(res.text);
                    expect(_.size(result.uuid)).to.be.equal(42);
                    expect(result.title).to.be.equal(graph_layer.title);
                    expect(result.description).to.be.equal(graph_layer.description);
                    expect(result.data.graph).to.be.equal(graph_layer.data.graph);
                    graph_layer.uuid = result.uuid;
                    done();
                });
            });
        });

        it('should parse CSV data properly', function (done) {
            var CSV = require('csv-string');
            var arr = CSV.parse('a,b,c\na,b,c');
            var parsed = [ [ 'a', 'b', 'c' ], [ 'a', 'b', 'c' ] ];
            expect(arr).to.be.an('array');
            expect(arr).to.deep.equal(parsed);
            done();
        });

        after(function (done) {
            async.series([
            function (callback) {
                Layer
                .findOne({uuid: newLayer.uuid})
                .remove()
                .exec(callback);
            },
            function (callback) {
                Layer
                .findOne({uuid: graph_layer.uuid})
                .remove()
                .exec(callback);
            },  
            ], done);
        });
    });
};