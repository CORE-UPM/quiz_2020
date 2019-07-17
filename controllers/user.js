"use strict";

const Sequelize = require("sequelize");
const {models} = require("../models");
const attHelper = require("../helpers/attachments");

const moment = require('moment');

const paginate = require('../helpers/paginate').paginate;
const authentication = require('../helpers/authentication');


// Autoload the user with id equals to :userId
exports.load = async (req, res, next, userId) => {

    try {
        const user = await models.user.findByPk(userId, {
            include: [{model: models.attachment, as: "photo"}]
        });
        if (user) {
            req.user = user;
            next();
        } else {
            req.flash('error', 'There is no user with id=' + userId + '.');
            throw new Error('No exist userId=' + userId);
        }
    } catch (error) {
        next(error);
    }
};


// GET /users
exports.index = async (req, res, next) => {

    try {
        const count = await models.user.count();

        // Pagination:

        const items_per_page = 10;

        // The page to show is given in the query
        const pageno = parseInt(req.query.pageno) || 1;

        // Create a String with the HTMl used to render the pagination buttons.
        // This String is added to a local variable of res, which is used into the application layout file.
        res.locals.paginate_control = paginate(count, items_per_page, pageno, req.url);

        const findOptions = {
            offset: items_per_page * (pageno - 1),
            limit: items_per_page,
            order: ['username'],
            include: [{model: models.attachment, as: "photo"}]
        };

        const users = await models.user.findAll(findOptions);
        res.render('users/index', {
            users,
            attHelper
        });
    } catch (error) {
        next(error);
    }
};

// GET /users/:userId
exports.show = (req, res, next) => {

    const {user} = req;

    res.render('users/show', {
        user,
        attHelper
    });
};


// GET /users/new
exports.new = (req, res, next) => {

    const user = {
        username: "",
        password: ""
    };

    res.render('users/new', {user});
};


// POST /users
exports.create = async (req, res, next) => {

    const {username, password} = req.body;

    let user = models.user.build({username, password});

    try {
        // Create the token field:
    user.token = authentication.createToken();

    // Save into the data base
        user = await user.save({fields: ["username", "token", "password", "salt"]});
        req.flash('success', 'User created successfully.');

        try {
            if (!req.file) {
                req.flash('info', 'User without photo.');
                return;
            }

            // Create the user photo
            await createUserPhoto(req, user);

        } catch (error) {
            req.flash('error', 'Failed to save photo: ' + error.message);
        } finally {
            if (req.loginUser) {
                res.redirect('/users/' + user.id);
            } else {
                res.redirect('/login'); // Redirection to the login page
            }
        }
    } catch (error) {
        if (error instanceof Sequelize.UniqueConstraintError) {
            req.flash('error', `User "${username}" already exists.`);
            res.render('users/new', {user});
        } else if (error instanceof Sequelize.ValidationError) {
            req.flash('error', 'There are errors in the form:');
            error.errors.forEach(({message}) => req.flash('error', message));
            res.render('users/new', {user});
        } else {
            req.flash('error', 'Error creating a new User: ' + error.message);
            next(error);
        }
    } finally {
        // delete the file uploaded to ./uploads by multer.
        if (req.file) {
            attHelper.deleteLocalFile(req.file.path);
        }
    }
};

// Aux function to upload req.file to cloudinary, create an attachment with it, and
// associate it with the given user.
// This function is called from the create an update middlewares. DRY.
const createUserPhoto = async (req, user) => {

    // Save the attachment into Cloudinary
    const uploadResult = await attHelper.uploadResource(req);

    let attachment;
    try {
        // Create the new attachment into the data base.
        attachment = await models.attachment.create({
            public_id: uploadResult.public_id,
            url: uploadResult.url,
            filename: req.file.originalname,
            mime: req.file.mimetype
        });
        await user.setPhoto(attachment);
        req.flash('success', 'Photo saved successfully.');
    } catch (error) { // Ignoring validation errors
        req.flash('error', 'Failed linking photo: ' + error.message);
        attHelper.deleteResource(uploadResult.public_id);
        attachment && attachment.destroy();
    }
};


// GET /users/:userId/edit
exports.edit = (req, res, next) => {

    const {user} = req;

    res.render('users/edit', {user});
};


// PUT /users/:userId
exports.update = async (req, res, next) => {

    const {user, body} = req;

    // user.username  = body.user.username; // edition not allowed

    let fields_to_update = [];

    // ¿Cambio el password?
    if (req.body.password) {
        console.log('Updating password');
        user.password = body.password;
        fields_to_update.push('salt');
        fields_to_update.push('password');
    }

    try {
        await user.save({fields: fields_to_update});
        req.flash('success', 'User updated successfully.');

        try {
            if (req.body.keepPhoto) return; // Don't change the photo.

            // The photo can be changed if more than 1 minute has passed since the last change:
            if (user.photo) {

                const now = moment();
                const lastEdition = moment(user.photo.updatedAt);

                if (lastEdition.add(1,"m").isAfter(now)) {
                    req.flash('error', 'Photo file can not be modified until 1 minute has passed.');
                    return
                }
            }

            // Delete old photo.
            if (user.photo) {
                attHelper.deleteResource(user.photo.public_id);
                await user.photo.destroy();
                await user.setPhoto();
            }

            if (!req.file) {
                req.flash('info', 'This user has no photo.');
                return;
            }

            // Create the user photo
            await createUserPhoto(req, user);

        } catch (error) {
            req.flash('error', 'Failed saving the new photo: ' + error.message);
        } finally {
            res.redirect('/users/' + req.user.id);
        }
    } catch (error) {
        if (error instanceof Sequelize.ValidationError) {
            req.flash('error', 'There are errors in the form:');
            error.errors.forEach(({message}) => req.flash('error', message));
            res.render('users/edit', {user});
        } else {
            req.flash('error', 'Error editing the User: ' + error.message);
            next(error)
        }
    } finally {
        // delete the file uploaded to ./uploads by multer.
        if (req.file) {
            attHelper.deleteLocalFile(req.file.path);
        }
    }
};


// DELETE /users/:userId
exports.destroy = async (req, res, next) => {

    const photo = req.user.photo;

    // Delete the photo at Cloudinary or local file system (result is ignored)
    if (photo) {
        try {
            attHelper.deleteResource(photo.public_id);
        } catch (error) {}
    }

    try {
        await req.user.destroy();
        photo && await photo.destroy();

        // Deleting logged user.
        if (req.loginUser && req.loginUser.id === req.user.id) {
            // Close the user session
            req.logout()
            delete req.session.loginExpires;
        }

        req.flash('success', 'User deleted successfully.');
        res.redirect('/goback');
    } catch (error) {
        req.flash('error', 'Error deleting the User: ' + error.message);
        next(error)
    }
};


//-----------------------------------------------------------


// PUT /users/:id/token
// Create a saves a new user access token.
exports.createToken = async (req, res, next) => {

    req.user.token = authentication.createToken();

    try {
        const user = await req.user.save({fields: ["token"]});
        req.flash('success', 'User Access Token created successfully.');
        res.redirect('/users/' + user.id);
    } catch (error) {
        next(error);
    }
};

//-----------------------------------------------------------
