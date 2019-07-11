const Sequelize = require("sequelize");
const {models} = require("../models");

const cloudinary = require('cloudinary');
const fs = require('fs');
const attHelper = require("../helpers/attachments");

const paginate = require('../helpers/paginate').paginate;


// Options for the files uploaded to Cloudinary
const cloudinary_upload_options = {
    async: false,
    folder: "/core/quiz2020/photos",
    resource_type: "auto",
    tags: ['core', 'quiz2020']
};


// Autoload the user with id equals to :userId
exports.load = (req, res, next, userId) => {

    models.user.findByPk(userId, {
        include: [ {model: models.attachment, as: "photo"} ]
    })
    .then(user => {
        if (user) {
            req.user = user;
            next();
        } else {
            req.flash('error', 'There is no user with id=' + userId + '.');
            throw new Error('No exist userId=' + userId);
        }
    })
    .catch(error => next(error));
};


// GET /users
exports.index = (req, res, next) => {

    models.user.count()
    .then(count => {

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
            include: [ {model: models.attachment, as: "photo"} ]
        };

        return models.user.findAll(findOptions);
    })
    .then(users => {
        res.render('users/index', {
            users,
            attHelper
        });
    })
    .catch(error => next(error));
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

    res.render('users/new', {
        user,
        attHelper
    });
};


// POST /users
exports.create = (req, res, next) => {

    const {username, password} = req.body;

    const user = models.user.build({
        username,
        password
    });

    // Save into the data base
    user.save({fields: ["username", "password", "salt"]})
    .then(user => { // Render the users page
        req.flash('success', 'User created successfully.');

        if (!req.file) {
            req.flash('info', 'User without photo.');
            if (req.loginUser) {
                res.redirect('/users/' + user.id);
            } else {
                res.redirect('/login'); // Redirection to the login page
            }
            return;
        }

        // Save the photo into Cloudinary or local file system:

        let upload_options;
        if (!process.env.CLOUDINARY_URL) {
            req.flash('info', 'Photo files are saved into the local file system.');
            upload_options = {urlPrefix: req.protocol + "://" + req.headers.host };
        } else {
            req.flash('info', 'Photo files are saved at Cloudinary.');
            upload_options = cloudinary_upload_options;
        }

        return attHelper.uploadResource(req.file.path, upload_options)
        .then(uploadResult => {

            // Create the new photo into the data base.
            return models.attachment.create({
                public_id: uploadResult.public_id,
                url: uploadResult.url,
                filename: req.file.originalname,
                mime: req.file.mimetype
            })
            .then(attachment => {
                return user.setPhoto(attachment);
            })
            .then(() => {
                req.flash('success', 'Photo saved successfully.');
            })
            .catch(error => { // Ignoring validation errors
                req.flash('error', 'Failed to save file: ' + error.message);
                attHelper.deleteResource(uploadResult.public_id);
            });
        })
        .catch(error => {
            req.flash('error', 'Failed to save photo: ' + error.message);
        })
        .then(() => {
            if (req.loginUser) {
                res.redirect('/users/' + user.id);
            } else {
                res.redirect('/login'); // Redirection to the login page
            }
        });
    })
    .catch(Sequelize.UniqueConstraintError, error => {
        req.flash('error', `User "${username}" already exists.`);
        res.render('users/new', {user, attHelper});
    })
    .catch(Sequelize.ValidationError, error => {
        req.flash('error', 'There are errors in the form:');
        error.errors.forEach(({message}) => req.flash('error', message));
        res.render('users/new', {user, attHelper});
    })
    .catch(error => {
        req.flash('error', 'Error creating a new User: ' + error.message);
        next(error);
    })
    .finally(() => {
        // delete the file uploaded to ./uploads by multer.
        if (req.file) {
            fs.unlink(req.file.path, err => {
                if (err) {
                    console.log(`Error deleting file: ${req.file.path} >> ${err}`);
                }
            });
        }
    });
};


// GET /users/:userId/edit
exports.edit = (req, res, next) => {

    const {user} = req;

    res.render('users/edit', {
        user,
        attHelper
    });
};


// PUT /users/:userId
exports.update = (req, res, next) => {

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

    user.save({fields: fields_to_update})
    .then(user => {
        req.flash('success', 'User updated successfully.');

        if (req.body.keepPhoto) return; // Don't change the photo.

        // There is no photo: Delete old photo.
        if (!req.file) {
            req.flash('info', 'This user has no photo.');
            if (user.photo) {
                attHelper.deleteResource(user.photo.public_id);
                user.photo.destroy();
            }
            return;
        }

        // Save the new attachment into Cloudinary or local file system:

        let upload_options;
        if (!process.env.CLOUDINARY_URL) {
            req.flash('info', 'Photo files are saved into the local file system.');
            upload_options = {urlPrefix: req.protocol + "://" + req.headers.host };
        } else {
            req.flash('info', 'Photo files are saved at Cloudinary.');
            upload_options = cloudinary_upload_options;
        }

        return attHelper.uploadResource(req.file.path, upload_options)
        .then(function (uploadResult) {

            // Remenber the public_id of the old photo.
            const old_public_id = user.photo ? user.photo.public_id : null;

            // Update the attachment into the data base.
            return user.getPhoto()
            .then(attachment => {
                if (!attachment) {
                    attachment = models.attachment.build();
                }
                attachment.public_id = uploadResult.public_id;
                attachment.url = uploadResult.url;
                attachment.filename = req.file.originalname;
                attachment.mime = req.file.mimetype;
                return attachment.save();
            })
            .then(attachment => {
                if (old_public_id) {
                    attHelper.deleteResource(old_public_id);
                }
                return user.setPhoto(attachment)
            })
            .then(attachment => {
                req.flash('success', 'Photo updated successfully.');
            })
            .catch(error => { // Ignoring image validation errors
                req.flash('error', 'Failed updating new photo: ' + error.message);
                attHelper.deleteResource(uploadResult.public_id);
            });
        })
        .catch(function (error) {
            req.flash('error', 'Failed saving the new photo: ' + error.message);
        });
    })
    .then(function () {
        res.redirect('/users/' + req.user.id);
    })
    .catch(Sequelize.ValidationError, error => {
        req.flash('error', 'There are errors in the form:');
        error.errors.forEach(({message}) => req.flash('error', message));
        res.render('users/edit', {user, attHelper});
    })
    .catch(error => {
        req.flash('error', 'Error editing the User: ' + error.message);
        next(error)
    })
    .finally(() => {
        // delete the file uploaded to ./uploads by multer.
        if (req.file) {
            fs.unlink(req.file.path, err => {
                if (err) {
                    console.log(`Error deleting file: ${req.file.path} >> ${err}`);
                }
            });
        }
    });
};


// DELETE /users/:userId
exports.destroy = (req, res, next) => {

    // Delete the photo at Cloudinary or local file system (result is ignored)
    if (req.user.photo) {

        if (!process.env.CLOUDINARY_URL) {
            req.flash('info', 'Photo files are saved into the local file system.');
        } else {
            req.flash('info', 'Photo files are saved at Cloudinary.');
        }

        attHelper.deleteResource(req.user.photo.public_id);
    }

    req.user.destroy()
    .then(() => {

        // Deleting logged user.
        if (req.loginUser && req.loginUser.id === req.user.id) {
            // Close the user session
            req.logout()
            delete req.session.loginExpires;
        }

        req.flash('success', 'User deleted successfully.');
        res.redirect('/goback');
    })
    .catch(error => {
        req.flash('error', 'Error deleting the User: ' + error.message);
        next(error)
    });
};
