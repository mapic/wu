// API: api.user.js

// database schemas
var Project     = require('../models/project');
var Clientel    = require('../models/client');  // weird name cause 'Client' is restricted name
var User    = require('../models/user');
var File    = require('../models/file');
var Layer   = require('../models/layer');
var Hash    = require('../models/hash');
var Role    = require('../models/role');
var Group   = require('../models/group');

// utils
var _       = require('lodash');
var fs      = require('fs-extra');
var gm      = require('gm');
var kue     = require('kue');
var fss     = require("q-io/fs");
var zlib    = require('zlib');
var uuid    = require('node-uuid');
var util    = require('util');
var utf8    = require("utf8");
var mime    = require("mime");
var exec    = require('child_process').exec;
var dive    = require('dive');
var async   = require('async');
var carto   = require('carto');
var crypto      = require('crypto');
var fspath  = require('path');
var request     = require('request');
var nodepath    = require('path');
var formidable  = require('formidable');
var nodemailer  = require('nodemailer');
var uploadProgress = require('node-upload-progress');
var mapnikOmnivore = require('mapnik-omnivore');
var errors = require('../shared/errors');
var httpStatus = require('http-status');

const noAccessMessage = {error : 'Unathorized access. Ask your colleague to give you more privileges.'};
const errorMessage = {error : 'Something went wrong. See https://github.com/mapic/mapic for more information or reporting issues.'};
const noUserMessage = {error : 'No such user exists.'};

// api
var api = module.parent.exports;

// exports
module.exports = api.user = { 

    listUsers : function (req, res) {

        if (!req.user) {
            res.status(400);
            return res.send(noAccessMessage);
        }

        // only super users allowed
        if (!req.user.access.super) {
            res.status(400);
            return res.send(noAccessMessage);
        }

        User.find()
        .exec(function (err, users) {
            if (err) return res.send(err);
            res.send(users);
        });

    },

    promote : function (req, res, next) {

        var options = req.body;
        var email = options.email;

        // not authenticated
        if (!req.user) {
            res.status(400);
            return res.send(noAccessMessage);
        }

        // only super users allowed
        if (!req.user.access.super) {
            res.status(400);
            return res.send(noAccessMessage);
        }

        User
        .findOne({'local.email' : email})
        .exec(function (err, user) {
            if (err) {
                res.status(400);
                return res.send(errorMessage);
            }
            if (!user) {
                res.status(400);
                return res.send(noUserMessage);
            }

            // mark super
            user.access.super = true;

            // save
            user.save(function (err) {
                if (err) {
                    res.status(400);
                    return res.send(errorMessage);
                }

                res.send(user);

            });

        });

    },


    ensureAdminUser : function (done) {

        // check for admin user
        User
        .findOne({username : 'mapic'})
        .exec(function (err, user) {

            // mapic-admin user exists
            if (!err && user) return done(null, {
                created : false,
                user : user,
            });

            // create mapic-admin user
            var user = new User();
            var password = uuid.v4();
            user.uuid = 'user-' + uuid.v4();
            user.local.email = 'localhost@mapic.io';
            user.local.password = user.generateHash(password);
            user.firstName = 'Mapic'
            user.lastName = 'Localhost'
            user.company = ''
            user.position = ''
            user.username = 'mapic';
            user.access.super = true;
            user.save(function (err, user) {
                if (err) return done(err);
                
                // mapic created!
                return done(null, {
                    created : true,
                    user : user, 
                    password : password,
                });
            });
        });

    },

    inviteToProjects : function (req, res, next) {
    
        var options = req.body || {};

        var edits = options.edit || [];
        var reads = options.read || [];
        var userUuid = options.user;
        var account = req.user;
        var ops = [];
        var changed_projects = [];

        // check
        if (!userUuid) {
            return next(api.error.code.missingRequiredRequestFields(errors.missing_information.errorMessage, ['user']));
        }

        if (_.isEmpty(edits) && _.isEmpty(reads)) {
            return next({
                message: errors.no_projects_provided.errorMessage,
                code: httpStatus.BAD_REQUEST
            });
        }
            
        ops.push(function (callback) {
            User
            .findOne({uuid : userUuid})
            .exec(callback);
        });

        ops.push(function (invited_user, callback) {

            if (!invited_user) {
                return callback({
                    message: errors.no_such_user.errorMessage,
                    code: httpStatus.NOT_FOUND
                });
            }
            // add to read (if not already in edit)

            // check that USER has access to invite to project

            async.each(edits, function (projectUuid, done) {

                Project
                .findOne({uuid : projectUuid})
                .exec(function (err, project) {
                    if (err || !project) return done(err || 'No such project.');

                    // check if isEditable by account
                    if (!project.isEditable(account.getUuid())) return done('No access.');

                    // add invited_user to edit
                    project.access.edit.addToSet(invited_user.getUuid());

                    // save
                    project.markModified('access');
                    project.save(function (err, updated_project) {

                        // remember for 
                        changed_projects.push({
                            project : updated_project.uuid,
                            access : updated_project.access
                        });
                        
                        // next                 
                        done(null);
                    })
                });


            }, function (err, changed_edit_projects) {
                
                async.each(reads, function (projectUuid, done) {
                    Project
                    .findOne({uuid : projectUuid})
                    .exec(function (err, project) {
                        if (err || !project) return done(err || 'No such project.');

                        // check if isEditable by account
                        if (!project.isEditable(account.getUuid())) return done('No access.');

                        // check if user is already editor
                        var isAlreadyEditor = _.includes(project.access.edit, invited_user.getUuid()) || project.createdBy == invited_user.getUuid();

                        if (isAlreadyEditor) return done('Can\'t add viewer that\'s already editor.');

                        // add invited_user to edit
                        project.access.read.addToSet(invited_user.getUuid());

                        project.markModified('access');
                        project.save(function (err, updated_project) {
                            
                            // remember for 
                            changed_projects.push({
                                project : updated_project.uuid,
                                access : updated_project.access
                            });
                            
                            // next                 
                            done(null);
                        })
                    });


                }, function (err, changed_read_projects) {

                    callback(null, changed_projects);

                });             

            });

        });

        async.waterfall(ops, function (err, projects) {
            if (err) {
                return next(err)
            }

            res.send({
                error : null,
                projects : projects
            });
            
        })

    },

    requestContact : function (req, res, next) {
        var params = req.body || {};
        var contact_uuid = params.contact;
        var request_id;
        var contact_email;
        var ops = [];

        if (!contact_uuid) {
            return next(api.error.code.missingRequiredRequestFields(errors.missing_information.errorMessage, ['contact']));
        }

        ops.push(function (callback) {

            request_id = api.utils.getRandomChars(10);

            var request_options = JSON.stringify({
                requester : req.user.getUuid(),
                contact : contact_uuid,
                timestamp : new Date().getTime()
            });

            // save request
            var invite_key = 'contactRequest:' + request_id;
            api.redis.tokens.set(invite_key, request_options, callback);
        });

        // add pending request
        ops.push(function (callback) {
            User
            .findOne({uuid : contact_uuid})
            .exec(function (err, user) {
                if (err || !user) {
                    return callback({
                        message: errors.no_such_user.errorMessage,
                        code: httpStatus.NOT_FOUND
                    });
                }

                contact_email = user.local.email;

                // add pending contact request
                user.status.contact_requests.addToSet(request_id);

                // save
                user.markModified('status');
                user.save(function (err) {
                    callback(err);
                });
            });
        });

        // send email to requested user
        ops.push(function (callback) {
            
            var link = api.config.portalServer.uri + 'api/user/acceptContactRequest/' + request_id;

            // send email
            api.email.sendContactRequestEmail({
                email : contact_email,
                requested_by : req.user.getName(),
                link : link
            });

            callback();
        });

        async.series(ops, function (err) {
            if (err) {
                return next(err);
            }

            res.send({
                error : err || null
            });
        });

    },


    acceptContactRequest : function (req, res) {

        // get client/project
        var path = req.originalUrl.split('/');
        var request_token = path[4];

        // check
        if (!request_token) return res.send('Nope!');

        // save request
        var invite_key = 'contactRequest:' + request_token;
        api.redis.tokens.get(invite_key, function (err, request_store) {

            var store = api.utils.parse(request_store);
            var requester_uuid = store.requester;
            var contact_uuid = store.contact;
            var timestamp = store.timestamp;


            User
            .findOne({uuid : requester_uuid})
            .exec(function (err, r_user) {
                if (err) console.log('no r_user', err);

                User
                .findOne({uuid : contact_uuid})
                .exec(function (err, c_user) {
                    if (err) console.log('no c_user', err);


                    r_user.contact_list.addToSet(c_user._id);
                    c_user.contact_list.addToSet(r_user._id);
                    r_user.save(function (err) {
                    });
                    c_user.save(function (err) {
                    });

                });
            });
        });

        res.render('../../views/acceptContact.ejs', {
            access_token : req.session.access_token || {}
        });
    },

    _addContacts : function (user_a, user_b, done) {
        User.findOne({uuid : user_a})
        .exec(function (err, user_a) {
            if (err) {
                done && done(err);
                return;
            }
            User.findOne({uuid : user_b})
            .exec(function (err, user_b) {
                if (err) {
                    done && done(err);
                    return;
                }
                user_a.contact_list.addToSet(user_b._id);
                user_b.contact_list.addToSet(user_a._id);
                user_a.save(function (err) {
                    if (err) {
                        done && done(err);
                        return;
                    }
                    user_b.save(function (err) {
                        if (err) {
                            done && done(err);
                            return;
                        }
                        done && done(err);
                    });
                });
            });
        });
    },

    // from shareable link flow
    getInviteLink : function (req, res, next) {
        var options = req.query || {};
        options.user = req.user;

        if (!options.user) {
            next({
                code: httpStatus.UNAUTHORIZED
            });
        }

        if (!options.access) {
            return next(api.error.code.missingRequiredRequestFields(errors.missing_information.errorMessage, ['access']));  
        }

        // create invite link
        api.user._createInviteLink({
            user : req.user,
            access : options.access,
            type : 'link'
        }, function (err, invite_link) {
            if (err) {
                return next(err);
            }

            res.send(invite_link);
        });
    },


    info : function (req, res, next) {
        // return info on logged-in user
        var user = req.user;
        res.send(user);
    },

    _createInviteLink : function (options, callback) {

        var user = options.user;
        var access = options.access;
        var email = options.email || false;
        var type = options.type;

        // create token and save in redis with options
        var token = api.utils.getRandomChars(7, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890');

        // var token_store = {
        //  access : access,
        //  invited_by : {
        //      uuid : user.uuid,
        //      firstName : user.firstName,
        //      lastName : user.lastName,
        //      company : user.company
        //  },
        //  token : token,
        //  timestamp : new Date().getTime(),
        // }

        var invite_options = JSON.stringify({
            email : email,
            access : access,
            token : token,
            invited_by : user.getUuid(),
            timestamp : new Date().getTime(),
            type : type
        });

        // save token to redis
        var redis_key = 'invite:token:' + token;
        api.redis.tokens.set(redis_key, invite_options, function (err) {
            var inviteLink = api.config.portalServer.uri + 'invite/' + token;
            callback(null, inviteLink);
        });
    },



    // invite users
    // sent from client (invite by email)
    invite : function (req, res, next) {
        var options = req.body || {};

        var emails = options.emails;
        var customMessage = options.customMessage || '';
        var access = options.access;
        var missingRequiredRequestFields = [];

        if (!emails || !emails.length) {
            missingRequiredRequestFields.push('emails');
        }

        if (!access) {
            missingRequiredRequestFields.push('access');
            missingRequiredRequestFields.push('access.edit');
            missingRequiredRequestFields.push('access.read');
        } else {
            if (!access.edit) {
                missingRequiredRequestFields.push('access.edit');
            }

            if (!access.read) {
                missingRequiredRequestFields.push('access.read');
            }
        }

        if (!_.isEmpty(missingRequiredRequestFields)) {
            return next(api.error.code.missingRequiredRequestFields(errors.missing_information.errorMessage, missingRequiredRequestFields));
        }

        var numProjects = access.edit.length + access.read.length;


        // send emails
        emails.forEach(function (email) {

            api.user._createInviteLink({
                user : req.user,
                access : access,
                email : email,
                type : 'email'
            }, function (err, invite_link) {

                // send email
                api.email.sendInviteEmail({
                    email : email,
                    customMessage : customMessage,
                    numProjects : numProjects,
                    invite_link : invite_link,
                    invited_by : req.user.getName()
                });

            });

        });

        return res.send({
            error : null
        });

    },


    create : function (req, res, next) {
        var options = req.body;
        var username = options.username;
        var firstname = options.firstname || options.firstName;
        var lastname = options.lastname || options.lastName;
        var email = options.email;
        var password = options.password;
        var missing = [];
        var ops = {};

        // check valid fields
        if (!username)  missing.push('username');
        if (!firstname) missing.push('firstname');
        if (!lastname)  missing.push('lastname');
        if (!email)     missing.push('email');
        if (!password)  missing.push('password');
        if (!_.isEmpty(missing)) return next(api.error.code.missingRequiredRequestFields(errors.missing_information.errorMessage, missing));


        // ensure unique username
        ops.check_username = function (callback) {
            api.user._checkUniqueUsername(username, callback);
        };

        // check unique email
        ops.check_email = function (callback) {
            api.user._checkUniqueEmail(email, callback);
        };

        // create user
        ops.create_user = function (callback) {
            api.user.createUserModel(options, callback);
        };

        // run ops
        async.series(ops, function (err, results) {
            if (err) return next(err);

            // return user
            var user = results.create_user;
            res.send(user);

            api.user._attemptAddContact(req, user, function (err) {
            });
        });

    },

    _attemptAddContact : function (req, user_a, callback) {
        if (!req.session) return callback('No req.session');
        if (!req.session.tokens) return callback('No req.session.tokens');
        var access_token = req.session.tokens.access_token;
        if (!access_token) return callback('No req.session.tokens.access_token');

        api.token._authenticate(access_token, function (err, user_b) {
            if (err) return callback(err);

            api.user._addContacts(user_a.uuid, user_b.uuid, callback);
        });

    },
    
    createUserModel : function (options, done) {
        var options = options || {};
        var user            = new User();
        user.uuid           = 'user-' + uuid.v4();
        user.local.email    = _.isString(options.email) ? options.email.toLowerCase() : options.email;
        user.local.password = user.generateHash(options.password);
        user.firstName      = options.firstname;
        user.lastName       = options.lastname;
        user.company        = options.company;
        user.position       = options.position;
        user.username       = _.isString(options.username) ? options.username.toLowerCase() : options.username;
        user.save(function (err, user) {
            done(err, user);
        });
    },


   


    _checkUniqueEmail : function (email, done) {
        if (_.isString(email)) {
            email = email.toLowerCase();
        }
        User
        .findOne({'local.email' : email})
        .exec(function (err, user) {
            if (err || user) return done(errors.email_taken);
            done(null);
        });
    },



    // called from passport.js (no req.user exists here)
    register : function (options, done) {

        var ops = [];
        var created_user;
        var token_store;
        var invited_by_user;

        // get token store from redis
        ops.push(function (callback) {
            var token = options.invite_token;
            var redis_key = 'invite:token:' + token;

            // get token
            api.redis.tokens.get(redis_key, callback);
        });

        // create new user
        ops.push(function (tokenJSON, callback) {

            var invite_only = api.config.portal.invite_only;

            if (invite_only && !tokenJSON) return callback('You don\'t have a valid invite. Please sign up on our beta-invite list on https://systemapic.com');

            var username = options.email.split('@')[0];
            api.user.ensureUniqueUsername(username, function (err, unique_username) {

                // parse token_store
                var token_store = tokenJSON ? api.utils.parse(tokenJSON) : false;

                // create the user
                var newUser             = new User();
                newUser.local.email     = options.email;
                newUser.local.password  = newUser.generateHash(options.password);
                newUser.uuid        = 'user-' + uuid.v4();
                newUser.company     = options.company;
                newUser.position    = options.position;
                newUser.firstName   = options.firstname;
                newUser.lastName    = options.lastname;
                newUser.invitedBy   = token_store ? token_store.invited_by : 'self';
                newUser.username    = unique_username;

                // save the user
                newUser.save(function(err) {
                    created_user = newUser;
                    callback(err);
                });

            });
            
        });

        // add to contact lists
        ops.push(function (callback) {

            if (!token_store) return callback(null);

            User
            .findOne({uuid : token_store.invited_by})
            .exec(function (err, user) {
                invited_by_user = user;

                // add newUser to contact list
                invited_by_user.contact_list.addToSet(created_user._id);
                invited_by_user.save(function (err) {
                    if (err) console.log('invited_by_yser: ', err);

                    // add inviter to newUser's contact list
                    created_user.contact_list.addToSet(user._id);
                    created_user.save(function (err) {
                        if (err) console.log('created_user invite err: ', err);
                        
                        // done
                        callback(null);
                    });
                });
            });
        });

        // add new user to project (edit)
        ops.push(function (callback) {

            if (!token_store) return callback(null);

            var edits = token_store.access.edit;
            async.each(edits, function (project_id, cb) {

                Project
                .findOne({uuid : project_id})
                .exec(function (err, project) {
                    if (err) return callback(err);
                    project.access.edit.addToSet(created_user.uuid);
                    project.save(function (err) {
                        cb(null);
                    });
                });
            }, callback);
        });

        // add new user to project (read)
        ops.push(function (callback) {

            if (!token_store) return callback(null);

            var reads = token_store.access.read;
            async.each(reads, function (project_id, cb) {
                Project
                .findOne({uuid : project_id})
                .exec(function (err, project) {
                    if (err) return callback(err);
                    project.access.read.addToSet(created_user.uuid);
                    project.save(function (err) {
                        cb(null);
                    });
                });
            }, callback);
        });
        

        ops.push(function (callback) {

            // send slack
            api.slack.registeredUser({
                user_name   : created_user.firstName + ' ' + created_user.lastName,
                user_company    : created_user.company,
                user_email  : created_user.local.email,
                user_position   : created_user.position,
                inviter_name    : invited_by_user ? invited_by_user.getName() : 'self',
                timestamp   : token_store ? token_store.timestamp : Date.now()
            });


            callback(null);
        });

        // done
        async.waterfall(ops, function (err, results) {
            if (err) return done(err);

            // done
            done(null, created_user);
        });
    
    },

    _createRole : function (options, done) {
        var permissions = options.permissions,
            members = options.members,
            project_id = options.project_id,
            ops = [];

        if (!permissions) return done('missingInformation');

        ops.push(function (callback) {
            // create the user
            var role = new Role();
            role.uuid = 'role-' + uuid.v4();

            permissions.forEach(function (p) {
                role.capabilities[p] = true;
            });

            // members
            members.forEach(function (m) {
                role.members.push(m.uuid);
            });

            // save the role
            role.save(function(err, doc) {
                callback(err, doc);
            });

        });

        ops.push(function (role, callback) {

            // add to project
            Project
            .findOne({uuid : project_id})
            .exec(function (err, project) {
                project.roles.push(role._id);
                project.markModified('roles');
                project.save(callback);
            });
        });
        

        async.waterfall(ops, function (err, results) {
            done(err);
        });


    },


    deleteUser : function (req, res, next) {
        
        var user_id = req.body.user_id || req.body.uuid;

        // only allow deleting of self
        if (req.user.uuid != user_id) return next(api.error.code.missingRequiredRequestFields(errors.missing_information.errorMessage, ['user_id']));

        User
            .findOne({uuid : user_id})
            .remove()
            .exec(function (err) {
                res.send({
                    err : err,
                    user_id : user_id,
                    success : _.isEmpty(err)
                });
            });

    },


    // user accepts invite (user must already exist)
    acceptInvite : function (req, res, next) {
        var user = req.user;
        var options = req.body || {};
        var missing = [];
        var ops = [];
        var invitation;

        // check if valid request
        if (!options.invite_token) {
            missing.push('invite_token');
        }
        
        if (!user) {
            missing.push('access_token');
        }

        if (!_.isEmpty(missing)) {
            return next(api.error.code.missingRequiredRequestFields(errors.missing_information.errorMessage, missing));
        }

        api.user._acceptInvite(user, options, function (err, invitation) {
            if (err) {
                return next(err);
            }
            res.send(invitation);
        })
    },

    _acceptInvite : function (user, options, done) {
        var missing = [];
        var ops = [];
        var invitation;

        options = options || {};

        // check if valid request
        if (!options.invite_token) {
            missing.push('invite_token');
        }

        if (!user) {
            missing.push('access_token');
        }

        if (!_.isEmpty(missing)) {
            return api.error.code.missingRequiredRequestFields(errors.missing_information.errorMessage, missing);
        }

        // get token store from redis
        ops.push(function (callback) {
            var invite_id = 'invite:token:' + options.invite_token;
            api.redis.tokens.get(invite_id, callback);
        });

        // add contacts
        ops.push(function (inviteJSON, callback) {
            // parse
            invitation = JSON.parse(inviteJSON);
            if (!invitation) return callback('Invitation is expired or does not exist.');

            var invited_by = invitation.invited_by;

            api.user._addContacts(invited_by, user.uuid, function (err) {
                callback(null, invitation);
            });
        });

        // get projects
        ops.push(function (invitation, callback) {
            
            // WTF! FIXME ASAP!
            // callback('TODO!');
            // return;

            var options = {}
            try {
                options.read = invitation.access.read;
                options.edit = invitation.access.edit;
            } catch (e) {
                return callback(e);
            }

            callback(null, options);
        });


        // give read access
        ops.push(function (projectAccess, callback) {
            if (projectAccess.read && _.isArray(projectAccess.read)) {
                async.each(projectAccess.read, function (project_id, cb) {
                    api.project.giveReadAccess({
                        user : user,
                        project_id : project_id
                    }, cb)
                }, function (err) {
                    callback(err, projectAccess);
                });
            } else {
                callback(null, projectAccess);
            }
        });

        // give edit access
        ops.push(function (projectAccess, callback) {
            if (projectAccess.edit && _.isArray(projectAccess.edit)) {          
                async.each(projectAccess.edit, function (project_id, cb) {
                    api.project.giveEditAccess({
                        user : user,
                        project_id : project_id
                    }, cb);
                }, callback);
            } else {
                callback(null, projectAccess);  
            }
        });


        // todo: add contacts

        // done
        async.waterfall(ops, function (err, results) {
            return done(err, invitation);
            // if (err) return next(err);
            // res.send(invitation);
        });
        
    },


    _processInviteToken : function (options, done) {
        var user = options.user,
            invite_token,
            ops = [];


        // return if no token
        if (!options.invite_token) return done(null);

        // get token store from redis
        ops.push(function (callback) {
            var redis_key = 'invite:token:' + options.invite_token;
            api.redis.tokens.get(redis_key, callback);
        });

        // find project for adding to roles
        ops.push(function (inviteJSON, callback) {
            
            // parse
            invite_token = JSON.parse(inviteJSON);

            if (!invite_token) return callback('Missing invite token.');

            Project
            .findOne({uuid : invite_token.project.id})
            .populate('roles')
            .exec(callback);

        });

        // add user to project roles
        ops.push(function (project, callback) {

            var a = invite_token.project.access_type;
            var permissions = invite_token.project.permissions;

            // create role
            api.user._createRole({
                permissions : permissions,
                members : [user],
                project_id : invite_token.project.id
            }, callback)

        });

        async.waterfall(ops, function (err, results) {
            if (err) return done(err);
            
            var project_json = {
                name : invite_token.project.name,
                id : invite_token.project.id
            };
            done(null, project_json);
        });

    },

    // validate request parameters for update user
    _validateUserUpdates : function (req) {
        var missingRequiredRequestFields = [];

        if (!req.body) {
            return api.error.code.missingRequiredRequestFields(errors.missing_information.errorMessage, ['body']);
        }

        if (!req.user) {
            return {
                code: httpStatus.UNAUTHORIZED
            };
        }

        if (!req.body.uuid) {
            missingRequiredRequestFields.push('uuid');
        }

        if (!_.isEmpty(missingRequiredRequestFields)) {
            return api.error.code.missingRequiredRequestFields(errors.missing_information.errorMessage, missingRequiredRequestFields);
        }

        if (req.body.uuid !== req.user.uuid) {
            return api.error.code.noAccess();
        }

        return false;
    },

    // update user  
    update : function (req, res, next) {
        var error = api.user._validateUserUpdates(req);
        var ops = [];

        if (error) {
            return next(error);
        }


        ops.push(function (callback) {
            User
            .findOne({uuid : req.user.uuid})
            .exec(callback);
        });

        ops.push(function (user, callback) {
            if (!user) {
                return callback({
                    message: errors.no_such_user.errorMessage,
                    code: httpStatus.NOT_FOUND
                });
            }

            api.user._update({
                options : req.body,
                user : user
            }, callback);
        });

        async.waterfall(ops, function (err, result) {
            if (err) {
                return next(err);
            }

            if (!result.user) {
                return next({
                    message: errors.no_such_user.errorMessage,
                    code: httpStatus.NOT_FOUND
                });
            }

            res.send(result);
        });
    },


    _update : function (options, callback) {
        if (!options) {
            return callback(api.error.code.missingRequiredRequestFields(errors.missing_information.errorMessage, ['options']));
        }

        var user = options.user;
        var options = options.options;
        var ops = [];
        var updates = {};

        // valid fields
        var valid = [
            'company',
            'position',
            'phone',
            'firstName',
            'lastName'
        ];

        updates = _.pick(options, valid);

        _.extend(user, updates);

        ops.push(function (callback) {
            _.extend(user, updates);
            user.validate(function (err) {
                validationErrors = err;
                if (validationErrors && validationErrors.errors && !_.isEmpty(_.keys(validationErrors.errors))) {
                    return callback({
                        code: httpStatus.BAD_REQUEST,
                        message: errors.invalid_fields.errorMessage,
                        errors: validationErrors.errors
                    });
                }
                callback(null);
            });
        });

        // enqueue updates for valid fields
        ops.push(function (callback) {
            user.update({ $set: updates })
                .exec(function (err, result) {
                    if (err) {
                        callback(err);
                    }

                    callback(null, {
                        updated: _.keys(updates)
                    });
                });
        });

        ops.push(function (params, callback) {
            User.findOne({uuid: user.uuid})
                .exec(function (err, res) {
                    if (err) {
                        return callback(err);
                    }

                    params.user = res;
                    callback(null, params);
                });
        });

        // do updates
        async.waterfall(ops, callback);

    },

    _enqueueUpdate : function (job) {
        if (!job) return;

        var queries = job.queries;
        var options = job.options;
        var field = job.field;
        var user = job.user;

        // create update op
        queries[field] = function(callback) {   
            user[field] = options[field];
            user.markModified(field);
            user.save(callback);
        };
        return queries;
    },

    updateUsername : function (req, res, next) {

        var username = req.body.username;
        var uuid = req.body.uuid;

        console.log('### updateUsername:')
        console.log('username:', username);
        console.log('uuid:', uuid);


        if (!username || !uuid) return next('Missing data.');

        console.log('checking user')


        User
        .findOne({uuid : uuid}) 
        .exec(function (err, user) {
            console.log('checked:', err, user);

            if (err || !user) return next('No user or other err.');

            // edit username
            user.username = username;

            // save
            user.save(function (err) {
                console.log('saved: ', err);
                if (err) {
                    res.status(400);
                    return res.send('Error');
                }

                console.log('saved user:', user);

                res.send(user);

            });


        });


    },


    // check unique email
    checkUniqueEmail : function (req, res, next) {
        if (!req.body) {
            return next(api.error.code.missingRequiredRequestFields(errors.missing_information.errorMessage, ['body']));
        }

        var email = req.body.email;
        var unique = false;

        if (!email) {
            return next(api.error.code.missingRequiredRequestFields(errors.missing_information.errorMessage, ['email']));
        }

        if (_.isString(email)) {
            email = email.toLowerCase();
        }
        User.findOne({'local.email' : email}, function (err, result) {
            if (err) {
                err.message = errors.checkingEmailError.errorMessage;
                return next(err);
            }

            if (!result) unique = true; 

            res.send({
                unique : unique
            });
        });
    },

    ensureUniqueUsername : function (username, done, n) {

        var n = n || 0;

        User
        .find()
        .exec(function (err, users) {

            // check if exists already
            var unique = _.isEmpty(_.find(users, function (u) {
                return u.username == username;
            }));

            if (!unique) {
                
                // must create another username
                var new_username = username + api.utils.getRandomChars(3, '0123456789');

                // flood safe
                if (n>10) return done('too many attempts.');

                // check again
                return api.user.ensureUniqueUsername(new_username, done, n++);
            }

            // return
            done(err, username);
        });
    },

    _checkUniqueUsername : function (username, done) {
        if (_.isString(username)) {
            username = username.toLowerCase();
        }

        User
        .findOne({username : username}) 
        .exec(function (err, user) {
            if (err || user) return done(errors.username_taken);
            done(null);
        });
    },

    // check unique username
    checkUniqueUsername : function (req, res, next) {
        if (!req.body) {
            return next(api.error.code.missingRequiredRequestFields(errors.missing_information.errorMessage, ['body']));
        }

        var username = req.body.username;

        if (!username) {
            return next(api.error.code.missingRequiredRequestFields(errors.missing_information.errorMessage, ['username']));
        }

        User
        .findOne({username : username}) 
        .exec(function (err, user) {

            if (err) {
                err.message = errors.checking_user_name.errorMessage;
                return next(err);
            }

            res.send({ unique : _.isEmpty(user) });
        });

    },

    getAll : function (options, done) {
        if (!options) return done('No options.');

        var user = options.user;
        var ops = {};

        // if phantomjs bot
        if (user.isSuper()) {
            
            ops.project_users = function (callback) {

                User
                .find()
                .exec(callback);
            };  

        } else {

            ops.project_users = function (callback) {

                // find users from editable projects
                api.user._getProjectUsers({
                    user : user

                }, function (err, users) {
                    callback(err, users);
                });

            };  
        }
        
        async.series(ops, done);
    },

    _getProjectUsers : function (options, done) {

        var user = options.user;
        var userOnInviteList = [];
        var ops = [];

        ops.push(function (callback) {
            Project
            .find()
            .or([   
                {'access.edit' : user.getUuid()}, 
                // {'access.read' : user.getUuid()}, 
                {createdBy : user.getUuid()}
            ])
            .exec(callback);
        });

        ops.push(function (projects, callback) {
            projects.forEach(function (p) {

                // get edits
                p.access.edit.forEach(function (edit_user) {
                    userOnInviteList.push(edit_user);
                });

                // get reads
                p.access.read.forEach(function (read_user) {
                    userOnInviteList.push(read_user);
                });
            });

            // get all users on list
            User
            .find({uuid : {$in : userOnInviteList}})
            .exec(callback);

        });

        async.waterfall(ops, function (err, users) {
            done(err, users);
        });

    },

    _getUserByUuid : function (userUuid, done) {
        User
        .find({uuid : userUuid})
        .exec(done);
    },

    _getUserProjects : function (userUuid, done) {

        // get user
        api.user._getUserByUuid(userUuid, function (err, user) {
            if (err) return done(err);

            var userProjects = [];

            // get all projects
            api.project._getAll(function (err, projects) {  
                if (err) return done(err);

                // filter projects that has roles with user as member
                projects.forEach(function (project) {
                    project.roles.forEach(function (role) {
                        if (role.members.indexOf(userUuid) >= 0) userProjects.push(project);
                    });         
                });

                done(null, userProjects);
            });
        });
    },

    _getRoles : function (options, done) {

        var user = options.user;
        var uuid = user.uuid;

        Role
        .find({members : uuid})
        .exec(function (err, roles) {
            done(err, roles);
        })

    },

    _getSingle : function (options, done) {
        return api.user.getAccount(options, done);
    },
    getAccount : function (options, done) {
        var userUuid = options.user.uuid;

        User
        .findOne({uuid : userUuid})
        .lean()
        .populate('files')
        .populate('contact_list')
        .exec(done);
    },

    _getAll : function (options, done) {
        User
        .find()
        .lean()
        .populate('files')
        .exec(done);
    },

    _getAllFiltered : function (options, done) {
        if (!options) return done('No options.');

        // get all role members in all projects that account has edit_user access to
        var user = options.user;
        var ops = [];

        ops.push(function (callback) {
            // get account's projects
            api.project.getAll({
                user: user,
                cap_filter : 'edit_user'
            }, callback);
        });

        ops.push(function (projects, callback) {
            // get all roles of all projects
            var allRoles = [];
            _.each(projects, function (project) {
                _.each(project.roles, function (role) {
                    allRoles.push(role);
                });
            });
            callback(null, allRoles)
        });

        ops.push(function (roles, callback) {
            var allUsers = [];
            _.each(roles, function (role) {
                _.each(role.members, function (member) {
                    allUsers.push(member);
                });
            });
            callback(null, allUsers);
        });
        
        // get user models
        ops.push(function (users, callback) {
            User
            .find()
            .lean()
            .populate('files')
            .or([
                { uuid : { $in : users }},      // roles
                { createdBy : user.getUuid()},  // createdBy self
                { uuid : user.getUuid()}        // self
            ])
            .exec(callback);
        });

        async.waterfall(ops, function (err, users) {
            done(err, users);
        });
    }
};
