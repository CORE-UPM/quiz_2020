const Sequelize = require("sequelize");
const Op = Sequelize.Op;
const {models} = require("../models");
const cloudinary = require('cloudinary');
const fs = require('fs');
const attHelper = require("../helpers/attachments");

const moment = require('moment');

const paginate = require('../helpers/paginate').paginate;


// Options for the files uploaded to Cloudinary
const cloudinary_upload_options = {
    async: false,
    folder: "/core/quiz2020/attachments",
    resource_type: "auto",
    tags: ['core', 'iweb', 'cdps', 'quiz2020']
};


// Autoload el quiz asociado a :quizId
exports.load = (req, res, next, quizId) => {

    const options = {
        include: [
            models.tip,
            models.attachment,
            {model: models.user, as: 'author'}
        ]
    };

    // For logged in users: include the favourites of the question by filtering by
    // the logged in user with an OUTER JOIN.
    if (req.loginUser) {
        options.include.push({
            model: models.user,
            as: "fans",
            where: {id: req.loginUser.id},
            required: false  // OUTER JOIN
        });
    }

    models.quiz.findByPk(quizId, options)
    .then(quiz => {
        if (quiz) {
            req.quiz = quiz;
            next();
        } else {
            throw new Error('There is no quiz with id=' + quizId);
        }
    })
    .catch(error => next(error));
};


// MW - Un usuario no puede crear mas de 50 quizzes al dia.
exports.limitPerDay = (req, res, next) => {

    const LIMIT_PER_DAY = 50;

    const yesterday = moment().subtract(1, 'days')

    // console.log("ayer = ", yesterday.calendar());

    let countOptions = {
        where: {
            authorId: req.loginUser.id,
            createdAt: {$gte: yesterday}
        }
    };

    models.quiz.count(countOptions)
    .then(count => {
        if (count < LIMIT_PER_DAY) {
            next();
        } else {
            req.flash('error', `Maximun ${LIMIT_PER_DAY} new quizzes per day.`);
            res.redirect('/goback');
        }
    });
};


// MW that allows actions only if the user logged in is admin or is the author of the quiz.
exports.adminOrAuthorRequired = (req, res, next) => {

    const isAdmin  = !!req.loginUser.isAdmin;
    const isAuthor = req.quiz.authorId === req.loginUser.id;

    if (isAdmin || isAuthor) {
        next();
    } else {
        console.log('Prohibited operation: The logged in user is not the author of the quiz, nor an administrator.');
        res.send(403);
    }
};


// GET /quizzes
exports.index = (req, res, next) => {

    let countOptions = {
        where: {},
        include: []
    };

    const searchfavourites = req.query.searchfavourites || "";

    let title = "Quizzes";

    // Search:
    const search = req.query.search || '';
    if (search) {
        const search_like = "%" + search.replace(/ +/g,"%") + "%";

        countOptions.where = {question: { [Op.like]: search_like }};
    }

    // If there exists "req.user", then only the quizzes of that user are shown
    if (req.user) {
        countOptions.where.authorId = req.user.id;

        if (req.loginUser && req.loginUser.id === req.user.id) {
            title = "My Quizzes";
        } else {
            title = "Quizzes of " + req.user.username;
        }
    }

    // Filter: my favourite quizzes:
    if (req.loginUser) {
        if (searchfavourites) {
            countOptions.include.push({
                model: models.user,
                as: "fans",
                where: {id: req.loginUser.id},
                attributes: ['id']

            });
        } else {

            // NOTE:
            // It should be added the options ( or similars )
            // to have a lighter query:
            //    where: {id: req.loginUser.id},
            //    required: false  // OUTER JOIN
            // but this does not work with SQLite. The generated
            // query fails when there are several fans of the same quiz.

            countOptions.include.push({
                model: models.user,
                as: "fans",
                attributes: ['id']
            });
        }
    }

    models.quiz.count(countOptions)
    .then(count => {

        // Pagination:

        const items_per_page = 10;

        // The page to show is given in the query
        const pageno = parseInt(req.query.pageno) || 1;

        // Create a String with the HTMl used to render the pagination buttons.
        // This String is added to a local variable of res, which is used into the application layout file.
        res.locals.paginate_control = paginate(count, items_per_page, pageno, req.url);

        const findOptions = {
            ...countOptions,
            offset: items_per_page * (pageno - 1),
            limit: items_per_page
        };

        findOptions.include.push(models.attachment);
        findOptions.include.push({
            model: models.user,
            as: 'author'
        });

        return models.quiz.findAll(findOptions);
    })
    .then(quizzes => {

        // Mark favourite quizzes:
        if (req.loginUser) {
            quizzes.forEach(quiz => {
                quiz.favourite = quiz.fans.some(fan => {
                    return fan.id == req.loginUser.id;
                });
            });
        }

        res.render('quizzes/index.ejs', {
            quizzes,
            search,
            searchfavourites,
            title,
            attHelper
        });
    })
    .catch(error => next(error));
};


// GET /quizzes/:quizId
exports.show = (req, res, next) => {

    const {quiz} = req;

    new Promise((resolve, reject) => {

        // Only for logger users:
        //   if this quiz is one of my fovourites, then I create
        //   the attribute "favourite = true"
        if (req.loginUser) {
            resolve(
                req.quiz.getFans({where: {id: req.loginUser.id}})
                .then(fans => {
                    if (fans.length > 0) {
                        req.quiz.favourite = true;
                    }
                })
            );
        } else {
            resolve();
        }
    })
    .then(() => {
        res.render('quizzes/show', {
            quiz,
            attHelper
        });
    })
    .catch(error => next(error));
};


// GET /quizzes/new
exports.new = (req, res, next) => {

    const quiz = {
        question: "",
        answer: ""
    };

    res.render('quizzes/new', {quiz});
};

// POST /quizzes/create
exports.create = (req, res, next) => {

    const {question, answer} = req.body;

    const authorId = req.loginUser && req.loginUser.id || 0;

    const quiz = models.quiz.build({
        question,
        answer,
        authorId
    });

    // Saves only the fields question and answer into the DDBB
    quiz.save({fields: ["question", "answer", "authorId"]})
    .then(quiz => {
        req.flash('success', 'Quiz created successfully.');

        if (!req.file) {
            req.flash('info', 'Quiz without attachment.');
            res.redirect('/quizzes/' + quiz.id);
            return;
        }

        // Save the attachment into Cloudinary or local file system:

        let upload_options;
        if (!process.env.CLOUDINARY_URL) {
            req.flash('info', 'Attrachment files are saved into the local file system.');
            upload_options = {urlPrefix: req.protocol + "://" + req.headers.host };
        } else {
            req.flash('info', 'Attrachment files are saved at Cloudinary.');
            upload_options = cloudinary_upload_options;
        }

        return attHelper.uploadResource(req.file.path, upload_options)
        .then(uploadResult => {

            // Create the new attachment into the data base.
            return models.attachment.create({
                public_id: uploadResult.public_id,
                url: uploadResult.url,
                filename: req.file.originalname,
                mime: req.file.mimetype
            })
            .then(attachment => {
                return quiz.setAttachment(attachment);
            })
            .then(() => {
                req.flash('success', 'Quiz attachment saved successfully.');
            })
            .catch(error => { // Ignoring validation errors
                req.flash('error', 'Failed to save file: ' + error.message);
                attHelper.deleteResource(uploadResult.public_id);
            });
        })
        .catch(error => {
            req.flash('error', 'Failed to save attachment: ' + error.message);
        })
        .then(() => {
            res.redirect('/quizzes/' + quiz.id);
        });
    })
    .catch(Sequelize.ValidationError, error => {
        req.flash('error', 'There are errors in the form:');
        error.errors.forEach(({message}) => req.flash('error', message));
        res.render('quizzes/new', {quiz});
    })
    .catch(error => {
        req.flash('error', 'Error creating a new Quiz: ' + error.message);
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


// GET /quizzes/:quizId/edit
exports.edit = (req, res, next) => {

    const {quiz} = req;

    res.render('quizzes/edit', {quiz});
};


// PUT /quizzes/:quizId
exports.update = (req, res, next) => {

    const {quiz, body} = req;

    quiz.question = body.question;
    quiz.answer = body.answer;

    quiz.save({fields: ["question", "answer"]})
    .then(quiz => {
        req.flash('success', 'Quiz edited successfully.');

        if (req.body.keepAttachment) return; // Don't change the attachment.

        // The attachment can be changed if more than 1 minute has passed since the last change:
        if (quiz.attachment) {

            const now = moment();
            const lastEdition = moment(quiz.attachment.updatedAt);

            if (lastEdition.add(1,"m").isAfter(now)) {
                req.flash('error', 'Attached file can not be modified until 1 minute has passed.');
                return
            }
        }

        // There is no attachment: Delete old attachment.
        if (!req.file) {
            req.flash('info', 'This quiz has no attachment.');
            if (quiz.attachment) {
                attHelper.deleteResource(quiz.attachment.public_id);
                quiz.attachment.destroy();
            }
            return;
        }

        // Save the new attachment into Cloudinary or local file system:

        let upload_options;
        if (!process.env.CLOUDINARY_URL) {
            req.flash('info', 'Attachment files are saved into the local file system.');
            upload_options = {urlPrefix: req.protocol + "://" + req.headers.host };
        } else {
            req.flash('info', 'Attachment files are saved at Cloudinary.');
            upload_options = cloudinary_upload_options;
        }

        return attHelper.uploadResource(req.file.path, upload_options)
        .then(function (uploadResult) {

            // Remenber the public_id of the old attachment.
            const old_public_id = quiz.attachment ? quiz.attachment.public_id : null;

            // Update the attachment into the data base.
            return quiz.getAttachment()
            .then(function (attachment) {
                if (!attachment) {
                    attachment = models.attachment.build();
                }
                attachment.public_id = uploadResult.public_id;
                attachment.url = uploadResult.url;
                attachment.filename = req.file.originalname;
                attachment.mime = req.file.mimetype;
                return attachment.save();
            })
            .then(function (attachment) {
                if (old_public_id) {
                    attHelper.deleteResource(old_public_id);
                }
                return quiz.setAttachment(attachment);
            })
            .then(function (attachment) {
                req.flash('success', 'Attachment updated successfully.');
            })
            .catch(function (error) {
                req.flash('error', 'Failed updating new attachment: ' + error.message);
                attHelper.deleteResource(uploadResult.public_id);
            });
        })
        .catch(function (error) {
            req.flash('error', 'Failed saving the new attachment: ' + error.message);
        });
    })
    .then(function () {
        res.redirect('/quizzes/' + req.quiz.id);
    })
    .catch(Sequelize.ValidationError, error => {
        req.flash('error', 'There are errors in the form:');
        error.errors.forEach(({message}) => req.flash('error', message));
        res.render('quizzes/edit', {quiz});
    })
    .catch(error => {
        req.flash('error', 'Error editing the Quiz: ' + error.message);
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


// DELETE /quizzes/:quizId
exports.destroy = (req, res, next) => {

    const attachment = req.quiz.attachment;

    // Delete the attachment at Cloudinary or local file system (result is ignored)
    if (attachment) {

        if (!process.env.CLOUDINARY_URL) {
            req.flash('info', 'Attachment files are saved into the local file system.');
        } else {
            req.flash('info', 'Attachment files are saved at Cloudinary.');
        }

        attHelper.deleteResource(attachment.public_id);
    }

    req.quiz.destroy()
    .then(() => {
        return attachment && attachment.destroy();
    })
    .then(() => {
        req.flash('success', 'Quiz deleted successfully.');
        res.redirect('/goback')
    })
    .catch(error => {
        req.flash('error', 'Error deleting the Quiz: ' + error.message);
        next(error)
    });
};


// GET /quizzes/:quizId/play
exports.play = (req, res, next) => {

    const {quiz, query} = req;

    const answer = query.answer || '';

    new Promise(function (resolve, reject) {

        // Only for logger users:
        //   if this quiz is one of my fovourites, then I create
        //   the attribute "favourite = true"
        if (req.loginUser) {
            resolve(
                req.quiz.getFans({where: {id: req.loginUser.id}})
                .then(fans => {
                    if (fans.length > 0) {
                        req.quiz.favourite = true
                    }
                })
            );
        } else {
            resolve();
        }
    })
    .then(() => {
        res.render('quizzes/play', {
            quiz,
            answer,
            attHelper
        });
    })
    .catch(error => next(error));
};


// GET /quizzes/:quizId/check
exports.check = (req, res, next) => {

    const {quiz, query} = req;

    const answer = query.answer || "";
    const result = answer.toLowerCase().trim() === quiz.answer.toLowerCase().trim();

    res.render('quizzes/result', {
        quiz,
        result,
        answer
    });
};
