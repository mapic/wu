// app / models / layers.js
// load the things we need
var mongoose = require('mongoose');
var timestamps = require('mongoose-times');
// var Schema = mongoose.Schema;

// define the schema for our layers model
var layerSchema = mongoose.Schema({

    uuid        : String,   // layer uuid
    title       : String,
    description : String,   // html
    copyright   : String,
    legend      : String,   // html
    maxZoom     : String,
    minZoom     : String,   // which zoom levels layer is active for, todo later..
    zIndex      : Number,   // number
    bounds      : String,   // bounds for layer
    tms         : Boolean,  
    attribution : String,
    accessToken : String,   // some layers have access tokens, like mapbox
    opacity     : String,   
    active_mask : String,
    metadata    : String, // json string with loads of meta
    tooltip     : String,  // json string with cartocss tooltips
    legends     : String,  // json string with cartocss legends
    file        : String,     // file uuid that layer is connected to, if any
    style       : String,
    filter      : String,
    filter_mask : Boolean,
    tileType    : String, // tiletype, eg. 'aerial', 'hybrid'
    satellite_position : String,
    options     : String, // JSON of custom options
    layer_type  : String, // eg. defo_raster
    defo_rasters : [String],
    custom_zindex : Number,

    // data source for layer
    // mutually exclusive
    data : {
        geojson7946 : {
            geojson     : String,   // json
            style       : String,   // styling, as json or function 
            popup       : String,   // html string, content of properties.popup
        },
        geojson     : String,       // file uuid, file saved on server - needs to be if over 4MB (mongodb limit)
        topojson    : String,       // file uuid ... // simply request, check auth, serve file.
        cartoid     : String,
        raster      : String,
        rastertile  : String,       // server raster path: raster/hubble2/hubble
        vectortile  : String,       // server vector tile: vector/bigassvector/bigvector
        mapbox      : String,       // mapbox id: rawger.geography-class
        cartodb     : String,       // cartodb id: 
        osm         : String,       // osm id?
        norkart     : String,
        google      : String,
        cube        : String,
        graph       : String,
        wms         : {
            source  : String,       // source url
            layers  : String,       // layers
            meta    : String, 
            options : String,       // extra options
        },
        tile_service : String,

        postgis : {
            sql                 : String,
            cartocss            : String,
            cartocss_version    : String,
            geom_column         : String,
            file_id             : String,
            database_name       : String,
            table_name          : String,
            data_type           : String,
            geom_type           : String,
            raster_band         : Number,
            layer_id            : String,
            metadata            : String,
        },
    }, 
}, 
{ 
    usePushEach: true 
});


// timestamps plugin
layerSchema.plugin(timestamps); // adds created and lastUpdated fields automatically

// create the model for users and expose it to our app
module.exports = mongoose.model('Layer', layerSchema);