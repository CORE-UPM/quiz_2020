const Sequelize = require("sequelize");
const Op = Sequelize.Op;
const {models} = require("../models");
const attHelper = require("../helpers/attachments");

const paginate = require('../helpers/paginate').paginate;


// Autoload el quiz asociado a :quizId
exports.load = async (req, res, next, quizId) => {

    try {
        const quiz = await models.quiz.findByPk(quizId, {
            include: [
                models.attachment,
                {model: models.user, as: 'author'}
            ]
        });
        if (quiz) {
            req.quiz = quiz;
            next();
        } else {
            throw new Error('There is no quiz with id=' + quizId);
        }
    } catch (error) {
        next(error);
    }
};


// MW that allows actions only if the user logged in is admin or is the author of the quiz.
exports.adminOrAuthorRequired = (req, res, next) => {

    const isAdmin = !!req.loginUser.isAdmin;
    const isAuthor = req.quiz.authorId === req.loginUser.id;

    if (isAdmin || isAuthor) {
        next();
    } else {
        console.log('Prohibited operation: The logged in user is not the author of the quiz, nor an administrator.');
        res.send(403);
    }
};


// GET /quizzes
exports.index = async (req, res, next) => {

    let countOptions = {
        where: {}
    };

    let title = "Quizzes";

    // Search:
    const search = req.query.search || '';
    if (search) {
        const search_like = "%" + search.replace(/ +/g, "%") + "%";

        countOptions.where = {question: {[Op.like]: search_like}};
    }

    // If there exists "req.user", then only the quizzes of that user are shown
    if (req.user) {
        countOptions.where.authorId = req.user.id;

        if (req.loginUser && req.loginUser.id == req.user.id) {
            title = "My Quizzes";
        } else {
            title = "Quizzes of " + req.user.username;
        }
    }

    try {
        const count = await models.quiz.count(countOptions);

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
            limit: items_per_page,
            include: [
                models.attachment,
                {model: models.user, as: 'author'}
            ]
        };

        const quizzes = await models.quiz.findAll(findOptions);
        res.render('quizzes/index.ejs', {
            quizzes,
            search,
            attHelper,
            title
        });
    } catch (error) {
        next(error);
    }
};


// GET /quizzes/:quizId
exports.show = (req, res, next) => {

    const {quiz} = req;

    res.render('quizzes/show', {
        quiz,
        attHelper
    });
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
exports.create = async (req, res, next) => {

    const {question, answer} = req.body;
    const authorId = req.loginUser && req.loginUser.id || 0;

    let quiz = models.quiz.build({question, answer, authorId});

    try {
        // Saves only the fields question and answer into the DDBB
        quiz = await quiz.save({fields: ["question", "answer", "authorId"]});
        req.flash('success', 'Quiz created successfully.');

        try {
            if (!req.file) {
                req.flash('info', 'Quiz without attachment.');
                return;
            }

            // Checks that the CLOUDINAY_URL environmnet variable exists.
            if (!attHelper.checksCloudinaryEnv()) {
                return;
            }

            // Create the quiz attachment
            await createQuizAttachment(req, quiz);

        } catch (error) {
            req.flash('error', 'Failed to create attachment: ' + error.message);
        } finally {
            res.redirect('/quizzes/' + quiz.id);
        }
    } catch (error) {
        if (error instanceof Sequelize.ValidationError) {
            req.flash('error', 'There are errors in the form:');
            error.errors.forEach(({message}) => req.flash('error', message));
            res.render('quizzes/new', {quiz});
        } else {
            req.flash('error', 'Error creating a new Quiz: ' + error.message);
            next(error)
        }
    } finally {
        // delete the file uploaded to ./uploads by multer.
        if (req.file) {
            attHelper.deleteLocalFile(req.file.path);
        }
    }
};

// Aux function to upload req.file to cloudinary, create an attachment with it, and
// associate it with the gien quiz.
// This function is called from the create an update middleware. DRY.
const createQuizAttachment = async (req, quiz) => {

    // Save the attachment into Cloudinary
    const uploadResult = await attHelper.uploadResourceToCloudinary(req);

    let attachment;
    try {
        // Create the new attachment into the data base.
        attachment = await models.attachment.create({
            public_id: uploadResult.public_id,
            url: uploadResult.url,
            filename: req.file.originalname,
            mime: req.file.mimetype
        });
        await quiz.setAttachment(attachment);
        req.flash('success', 'Attachment saved successfully.');
    } catch (error) { // Ignoring validation errors
        req.flash('error', 'Failed linking attachment: ' + error.message);
        attHelper.deleteResource(uploadResult.public_id);
        attachment && attachment.destroy();
    }
};


// GET /quizzes/:quizId/edit
exports.edit = (req, res, next) => {

    const {quiz} = req;

    res.render('quizzes/edit', {quiz});
};


// PUT /quizzes/:quizId
exports.update = async (req, res, next) => {

    const {quiz, body} = req;

    quiz.question = body.question;
    quiz.answer = body.answer;

    try {
        await quiz.save({fields: ["question", "answer"]});
        req.flash('success', 'Quiz edited successfully.');

        try {
            if (req.body.keepAttachment) return; // Don't change the attachment.

            // Checks that the CLOUDINAY_URL environmnet variable exists.
            if (!attHelper.checksCloudinaryEnv()) {
                return;
            }

            // Delete old attachment.
            if (quiz.attachment) {
                attHelper.deleteResource(quiz.attachment.public_id);
                await quiz.attachment.destroy();
                await quiz.setAttachment();
            }

            if (!req.file) {
                req.flash('info', 'Quiz without attachment.');
                return;
            }

            // Create the quiz attachment
            await createQuizAttachment(req, quiz);

        } catch (error) {
            req.flash('error', 'Failed saving the new attachment: ' + error.message);
        } finally {
            res.redirect('/quizzes/' + req.quiz.id);
        }
    } catch (error) {
        if (error instanceof Sequelize.ValidationError) {
            req.flash('error', 'There are errors in the form:');
            error.errors.forEach(({message}) => req.flash('error', message));
            res.render('quizzes/edit', {quiz});
        } else {
            req.flash('error', 'Error editing the Quiz: ' + error.message);
            next(error);
        }
    } finally {
        // delete the file uploaded to ./uploads by multer.
        if (req.file) {
            attHelper.deleteLocalFile(req.file.path);
        }
    }
};


// DELETE /quizzes/:quizId
exports.destroy = async (req, res, next) => {

    const attachment = req.quiz.attachment;

    // Delete the attachment
    if (attachment) {
        try {
            // Checks that the CLOUDINAY_URL environmnet variable exists.
            if (attHelper.checksCloudinaryEnv()) {
                attHelper.deleteResource(attachment.public_id);
            }
        } catch(error) {}
    }

    try {
        await req.quiz.destroy();
        attachment && await attachment.destroy();

        req.flash('success', 'Quiz deleted successfully.');
        res.redirect('/goback');
    }  catch(error) {
        req.flash('error', 'Error deleting the Quiz: ' + error.message);
        next(error);
    }
};


// GET /quizzes/:quizId/play
exports.play = (req, res, next) => {

    const {quiz, query} = req;

    const answer = query.answer || '';

    res.render('quizzes/play', {
        quiz,
        answer,
        attHelper
    });
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
