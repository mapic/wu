// app/models/user.js
// load the things we need
var mongoose = require('mongoose');
var bcrypt   = require('bcrypt-nodejs');
var timestamps = require('mongoose-times');

// define the schema for our user model
var userSchema = mongoose.Schema({

       
        // id.mapic.io
        // ===========
        // uuid        : String, // both places
        firstName   : String,
        lastName    : String,
        company     : String,
        position    : String,
        phone       : String,
        mobile      : String,
        createdBy   : String,
        invitedBy   : String,
        username    : String,
        email       : String,
        avatar      : String,
        token       : String, // tile server auth token
        access_token : String,
        status : {
            // temp status notifications
            contact_requests : [String]
        },
        state : {
            lastProject : [String]  // projectUuid of last opened project
        },

        contact_list : [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        local : {
                email        : String,      // login name
                password     : String
        },
        facebook : {
                id           : String,
                token        : String,
                email        : String,
                name         : String
        },
        twitter : {
                id           : String,
                token        : String,
                displayName  : String,
                username     : String
        },
        google : {
                id           : String,
                token        : String,
                email        : String,
                name         : String
        },



        // locally
        // =======
        uuid : String,
        postgis_database : String,

        access : {
            super : { type : Boolean, default : false},

            // just debug keys
            account_type : { type: String, default: 'free' },
            storage_quota : { type: Number, default: '200000000' }, // 200MB
            remaining_quota : { type: Number, default: '200000000' },
            private_projects : { type: Boolean, default: true },
        },

        // list of files that belong to user (todo: move to file only? why is this here?)
        files : [{ type: mongoose.Schema.Types.ObjectId, ref: 'File' }],
       
});

// methods ======================
// generating a hash
userSchema.methods.generateHash = function(password) {
    var hashed = bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
    return hashed;
};

// checking if password is valid
userSchema.methods.validPassword = function(password) {
    return bcrypt.compareSync(password, this.local.password);
};

userSchema.methods.getUuid = function () {
    return this.uuid;
};

userSchema.methods.getName = function () {
    return this.firstName + ' ' + this.lastName;
};

userSchema.methods.canCreatePrivateProject = function () {
    return this.access.private_projects;
};

userSchema.methods.getEmail = function () {
    return this.local.email;
};

userSchema.methods.isBot = function () {
    // return this.local.email == 'bot@systemapic.com' && this.access.account_type == 'bot';
    return this.local.email == 'bot@systemapic.com';
};
userSchema.methods.isSuper = function () {
    return this.access.super;
};

// timestamps plugin
userSchema.plugin(timestamps);    // adds created and lastUpdated fields automatically

// create the model for users and expose it to our app
module.exports = mongoose.model('User', userSchema);