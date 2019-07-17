const Sequelize = require("sequelize");
const Op = Sequelize.Op;
const {models} = require("../models");
const attHelper = require("../helpers/attachments");

const moment = require('moment');

const paginate = require('../helpers/paginate').paginate;


// Autoload el quiz asociado a :quizId
exports.load = async (req, res, next, quizId) => {

    try {
        const quiz = await models.Quiz.findByPk(quizId, {
            include: [
                {model: models.Attachment, as: 'attachment'},
                {
                    model: models.User,
                    as: 'author',
                    include: [{
                        model: models.Attachment,
                        as: "photo"
                    }]
                }
            ]
        });
        if (quiz) {
            req.load = {...req.load, quiz};
            next();
        } else {
            throw new Error('There is no quiz with id=' + quizId);
        }
    } catch (error) {
        next(error);
    }
};


// MW - Un usuario no puede crear mas de 50 quizzes al dia.
exports.limitPerDay = async (req, res, next) => {

    const LIMIT_PER_DAY = 50;

    const yesterday = moment().subtract(1, 'days')

    // console.log("ayer = ", yesterday.calendar());

    let countOptions = {
        where: {
            authorId: req.loginUser.id,
            createdAt: {$gte: yesterday}
        }
    };

    try {
        const count = await models.Quiz.count(countOptions);

        if (count < LIMIT_PER_DAY) {
            next();
        } else {
            req.flash('error', `Maximun ${LIMIT_PER_DAY} new quizzes per day.`);
            res.redirect('/goback');
        }
    } catch (error) {
        next(error);
    }
};


// MW that allows actions only if the user logged in is admin or is the author of the quiz.
exports.adminOrAuthorRequired = (req, res, next) => {

    const isAdmin = !!req.loginUser.isAdmin;
    const isAuthor = req.load.quiz.authorId === req.loginUser.id;

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
    let findOptions = {
        where: {}
    };

    let title = "Quizzes";

    // Search:
    const search = req.query.search || '';
    if (search) {
        const search_like = "%" + search.replace(/ +/g, "%") + "%";

        countOptions.where.question = {[Op.like]: search_like};
        findOptions.where.question = { [Op.like]: search_like };
    }

    // If there exists "req.load.user", then only the quizzes of that user are shown
    if (req.load && req.load.user) {
        countOptions.where.authorId = req.load.user.id;
        findOptions.where.authorId = req.load.user.id;

        if (req.loginUser && req.loginUser.id == req.load.user.id) {
            title = "My Quizzes";
        } else {
            title = "Quizzes of " + req.load.user.username;
        }
    }

    try {
        const count = await models.Quiz.count(countOptions);

        // Pagination:

        const items_per_page = 10;

        // The page to show is given in the query
        const pageno = parseInt(req.query.pageno) || 1;

        // Create a String with the HTMl used to render the pagination buttons.
        // This String is added to a local variable of res, which is used into the application layout file.
        res.locals.paginate_control = paginate(count, items_per_page, pageno, req.url);

        findOptions.offset = items_per_page * (pageno - 1);
        findOptions.limit = items_per_page;
        findOptions.include = [
                {model: models.Attachment, as: 'attachment'},
                {
                    model: models.User,
                    as: 'author',
                    include: [{
                        model: models.Attachment,
                        as: "photo"
                    }]
                }
            ];

        const quizzes = await models.Quiz.findAll(findOptions);
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

    const {quiz} = req.load;

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

    let quiz = models.Quiz.build({question, answer, authorId});

    try {
        // Saves only the fields question and answer into the DDBB
        quiz = await quiz.save({fields: ["question", "answer", "authorId"]});
        req.flash('success', 'Quiz created successfully.');

        try {
            if (!req.file) {
                req.flash('info', 'Quiz without attachment.');
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
    const uploadResult = await attHelper.uploadResource(req);

    let attachment;
    try {
        // Create the new attachment into the data base.
        attachment = await models.Attachment.create({
            resource: uploadResult.resource,
            url: uploadResult.url,
            filename: req.file.originalname,
            mime: req.file.mimetype
        });
        await quiz.setAttachment(attachment);
        req.flash('success', 'Attachment saved successfully.');
    } catch (error) { // Ignoring validation errors
        req.flash('error', 'Failed linking attachment: ' + error.message);
        attHelper.deleteResource(uploadResult.resource);
        attachment && attachment.destroy();
    }
};


// GET /quizzes/:quizId/edit
exports.edit = (req, res, next) => {

    const {quiz} = req.load;

    res.render('quizzes/edit', {quiz});
};


// PUT /quizzes/:quizId
exports.update = async (req, res, next) => {

    const {body} = req;
    const {quiz} = req.load;

    quiz.question = body.question;
    quiz.answer = body.answer;

    try {
        await quiz.save({fields: ["question", "answer"]});
        req.flash('success', 'Quiz edited successfully.');

        try {
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

            // Delete old attachment.
            if (quiz.attachment) {
                attHelper.deleteResource(quiz.attachment.resource);
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
            res.redirect('/quizzes/' + quiz.id);
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

    const attachment = req.load.quiz.attachment;

    // Delete the attachment
    if (attachment) {
        try {
            attHelper.deleteResource(attachment.resource);
        } catch (error) {
        }
    }

    try {
        await req.load.quiz.destroy();
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

    const {query} = req;
        const {quiz} = req.load;

    const answer = query.answer || '';

    res.render('quizzes/play', {
        quiz,
        answer,
        attHelper
    });
};


// GET /quizzes/:quizId/check
exports.check = (req, res, next) => {

    const {query} = req;
        const {quiz} = req.load;

    const answer = query.answer || "";
    const result = answer.toLowerCase().trim() === quiz.answer.toLowerCase().trim();

    res.render('quizzes/result', {
        quiz,
        result,
        answer
    });
};
