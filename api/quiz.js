const {models} = require('../models');
const Sequelize = require('sequelize');

const js2xmlparser = require("js2xmlparser");

const addPagenoToUrl = require('../helpers/paginate').addPagenoToUrl;

//-----------------------------------------------------------


// Autoload el quiz asociado a :quizId.
// Includes author, fans and attachment.
exports.load = async (req, res, next, quizId) => {

    try {
        const quiz = await models.Quiz.findByPk(quizId, {
            attributes: {exclude: ['createdAt', 'updatedAt', 'deletedAt']},
            include: [
                {
                    model: models.Attachment,
                    as: 'attachment',
                    attributes: ['filename', 'mime', 'url']
                },
                {
                    model: models.User,
                    as: 'author',
                    attributes: ['id', 'isAdmin', 'username', 'githubId', 'githubUsername'],
                    include: [{
                        model: models.Attachment,
                        as: 'photo',
                        attributes: ['filename', 'mime', 'url']
                    }]
                },
                {
                    model: models.User,
                    as: "fans",
                    attributes: ['id'],
                    through: {attributes: []}
                }]
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


// Autoload el quiz asociado a :quizId
// Without includes.
exports.load_woi = async (req, res, next, quizId) => {

    try {
        const quiz = await models.Quiz.findByPk(quizId, {
            attributes: {exclude: ['createdAt', 'updatedAt', 'deletedAt']}
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

//-----------------------------------------------------------

// GET /api/quizzes
exports.index = async (req, res, next) => {

    let countOptions = {
        where: {},
        include: []
    };

    // Search quizzes which question field contains the value given in the query.
    const search = req.query.search || '';
    if (search) {
        const search_like = "%" + search.replace(/ +/g, "%") + "%";

        countOptions.where.question = {[Sequelize.Op.like]: search_like};
    }

    // User quizzes: If there exists "req.load.user", then only the quizzes of that user are shown
    if (req.load && req.load.user) {
        countOptions.where.authorId = req.load.user.id;
    }

    // Filter my favourite quizzes:
    // Lists all the quizzes or my favourite quizzes.
    const searchfavourites = !!req.query.searchfavourites;
    if (searchfavourites) {
        countOptions.include.push({
            model: models.User,
            as: "fans",
            where: {id: req.load.token.userId},
            attributes: ['id'],
            through: {attributes: []}
        });
    } else {

        // NOTE:
        // It should be added the options ( or similars )
        // to have a lighter query:
        //    where: {id: req.load.token.userId},
        //    required: false  // OUTER JOIN
        // but this does not work with SQLite. The generated
        // query fails when there are several fans of the same quiz.

        countOptions.include.push({
            model: models.User,
            as: "fans",
            attributes: ['id'],
            through: {attributes: []}
        });
    }


    // Pagination:

    const items_per_page = 10;

    // The page to show is given in the query
    const pageno = parseInt(req.query.pageno) || 1;

    let totalItems = 0;

    try {
        const count = await models.Quiz.count(countOptions);

        totalItems = count;

        const findOptions = {
            ...countOptions,
            attributes: {exclude: ['answer', 'createdAt', 'updatedAt', 'deletedAt']},
            offset: items_per_page * (pageno - 1),
            limit: items_per_page
        };

        findOptions.include.push({
            model: models.Attachment,
            as: 'attachment',
            attributes: ['filename', 'mime', 'url']
        });

        findOptions.include.push({
            model: models.User,
            as: 'author',
            attributes: ['id', 'isAdmin', 'username', 'githubId', 'githubUsername'],
            include: [{
                model: models.Attachment,
                as: 'photo',
                attributes: ['filename', 'mime', 'url']
            }]
        });

        let quizzes = await models.Quiz.findAll(findOptions);

        quizzes = quizzes.map(quiz => ({
            id: quiz.id,
            question: quiz.question,
            author: quiz.author,
            attachment: quiz.attachment,
            favourite: quiz.fans.some(fan => fan.id == req.load.token.userId)
        }));

        let nextUrl = "";
        const totalPages = Math.ceil(totalItems / items_per_page);
        if (pageno < totalPages) {
            let nextPage = pageno + 1;

            // In production (Heroku) I will use https.
            let protocol = process.env.NODE_ENV === 'production' ? "https" : req.protocol;
            nextUrl = addPagenoToUrl(`${protocol}://${req.headers["host"]}${req.baseUrl}${req.url}`, nextPage)
        }

        const format = (req.params.format || 'json').toLowerCase();

        switch (format) {
            case 'json':

                res.json({
                    quizzes,
                    pageno,
                    nextUrl
                });
                break;

            case 'xml':

                var options = {
                    typeHandlers: {
                        "[object Null]": function(value) {
                            return js2xmlparser.Absent.instance;
                        }
                    }
                };

                res.set({
                    'Content-Type': 'application/xml'
                }).send(
                    js2xmlparser.parse("quizzes", {quiz: quizzes}, options)
                );
                break;

            default:
                console.log('No supported format \".' + format + '\".');
                res.sendStatus(406);
        }

    } catch (error) {
        next(error);
    }
};

//-----------------------------------------------------------


// GET /quizzes/:quizId
exports.show = (req, res, next) => {

    const {quiz, token} = req;

    //   if this quiz is one of my favourites, then I create
    //   the attribute "favourite = true"

    const format = (req.params.format || 'json').toLowerCase();

    const data = {
        id: quiz.id,
        question: quiz.question,
        author: quiz.author && quiz.author.get({plain:true}),
        attachment: quiz.attachment && quiz.attachment.get({plain:true}),
        favourite: quiz.fans.some(fan => fan.id == token.userId)
    };

    switch (format) {
        case 'json':

            res.json(data);
            break;

        case 'xml':

            var options = {
                typeHandlers: {
                    "[object Null]": function (value) {
                        return js2xmlparser.Absent.instance;
                    }
                }
            };

            res.set({
                'Content-Type': 'application/xml'
            }).send(
                js2xmlparser.parse("quiz", data, options)
            );
            break;

        default:
            console.log('No supported format \".' + format + '\".');
            res.sendStatus(406);
    }
};

//-----------------------------------------------------------

// GET /quizzes/random
exports.random = async (req, res, next) => {

    const {token} = req;

    try {
        const quizId = await randomQuizId([]);

        if (quizId) {
            const quiz = await models.Quiz.findByPk(quizId, {
                attributes: {exclude: ['createdAt', 'updatedAt', 'deletedAt']},
                include: [
                    {
                        model: models.Attachment,
                        as: 'attachment',
                        attributes: ['filename', 'mime', 'url']
                    },
                    {
                        model: models.User,
                        as: 'author',
                        attributes: ['id', 'isAdmin', 'username', 'githubId', 'githubUsername'],
                        include: [{
                            model: models.Attachment,
                            as: 'photo',
                            attributes: ['filename', 'mime', 'url']
                        }]
                    },
                    {
                        model: models.User,
                        as: "fans",
                        attributes: ['id'],
                        through: {attributes: []}
                    }]
            });
            if (!quiz) {
                throw new Error('There is no quiz with id=' + quizId);
            }

            // If this quiz is one of my favourites, then I create
            // the attribute "favourite = true"

            res.json({
                id: quiz.id,
                question: quiz.question,
                author: quiz.author,
                attachment: quiz.attachment,
                favourite: quiz.fans.some(fan => fan.id == token.userId)
            });
        } else {
            res.json({nomore: true});
        }
    } catch (error) {
        next(error);
    }
};


// GET /quizzes/:quizId_woi/check
exports.check = (req, res, next) => {

    const {quiz, query} = req;

    const answer = query.answer || "";

    const result = answer.toLowerCase().trim() === quiz.answer.toLowerCase().trim();

    res.json({
        quizId: quiz.id,
        answer,
        result
    });
};

//-----------------------------------------------------------


exports.randomPlayNew = (req, res, next) => {

    req.session.randomPlay = {
        currentQuizId: 0,
        resolved: []
    };

    randomPlayNextQuiz(req, res, next);
};


exports.randomPlayNext = (req, res, next) => {

    randomPlayNextQuiz(req, res, next);
};


const randomPlayNextQuiz = async (req, res, next) => {

    if (!req.session.randomPlay) {
        req.session.randomPlay = {
            currentQuizId: 0,
            resolved: []
        };
    }

    try {
        let quizId;
        // volver a mostrar la misma pregunta que la ultima vez que pase por aqui y no conteste:
        if (req.session.randomPlay.currentQuizId) {
            quizId = req.session.randomPlay.currentQuizId;
        } else {
            // elegir una pregunta al azar no repetida:
            quizId = await randomQuizId(req.session.randomPlay.resolved);
        }

        if (!quizId) {
            const score = req.session.randomPlay.resolved.length;
            delete req.session.randomPlay;
            res.json({nomore: true, score});
        } else {
            const quiz = await models.Quiz.findByPk(quizId, {
                attributes: {exclude: ['createdAt', 'updatedAt', 'deletedAt']},
                include: [
                    {
                        model: models.Attachment,
                        as: 'attachment',
                        attributes: ['filename', 'mime', 'url']
                    },
                    {
                        model: models.User,
                        as: 'author',
                        attributes: ['id', 'isAdmin', 'username', 'githubId', 'githubUsername'],
                        include: [{
                            model: models.Attachment,
                            as: 'photo',
                            attributes: ['filename', 'mime', 'url']
                        }]
                    },
                    {
                        model: models.User,
                        as: "fans",
                        attributes: ['id'],
                        through: {attributes: []}
                    }
                ]
            });
            if (!quiz) {
                throw new Error('There is no quiz with id=' + quizId);
            }

            const score = req.session.randomPlay.resolved.length;

            req.session.randomPlay.currentQuizId = quizId;

            // If this quiz is one of my favourites, then I create
            // the attribute "favourite = true"

            res.json({
                quiz: {
                    id: quiz.id,
                    question: quiz.question,
                    author: quiz.author,
                    attachment: quiz.attachment,
                    favourite: quiz.fans.some(fan => fan.id == req.load.token.userId)
                },
                score
            });
        }
    } catch(error) {
        next(error);
    }
};


// GET /quizzes/randomPlay/check/
exports.randomPlayCheck = async (req, res, next) => {

    if (!req.session.randomPlay ||
        (req.session.randomPlay.currentQuizId === 0)) {
        res.sendStatus(409);
        return;
    }

    const quizId = req.session.randomPlay.currentQuizId;

    try {
        const quiz = await models.Quiz.findByPk(quizId);

        if (quiz) {

            const answer = req.query.answer || "";

            const result = answer.toLowerCase().trim() === quiz.answer.toLowerCase().trim();

            if (result) {
                req.session.randomPlay.currentQuizId = 0;

                // Evitar que me hagan llamadas a este metodo manualmente con una respuesta acertada para
                // que se guarde muchas veces la misma respuesta en resolved, y asi conseguir que score
                // se incremente indebidamente.
                if (req.session.randomPlay.resolved.indexOf(quiz.id) == -1) {
                    req.session.randomPlay.resolved.push(quiz.id);
                }
            }

            const score = req.session.randomPlay.resolved.length;

            if (!result) {
                delete req.session.randomPlay;
            }

            res.json({
                answer,
                quizId: quiz.id,
                result,
                score
            });

        } else {
            throw new Error('There is no quiz with id=' + quizId);
        }
    } catch (error) {
        next(error);
    }
};

//-----------------------------------------------------------

// GET /quizzes/random10wa
exports.random10wa = async (req, res, next) => {

    try {
        const {token} = req;

        let quizIds = [];
        let quizzes = [];

        const count = await models.Quiz.count();

        for (let i = 0; i < 10 && i < count; i++) {
            const whereOpt = {'id': {[Sequelize.Op.notIn]: quizIds}};

            const qarr = await models.Quiz.findAll({
                where: whereOpt,
                attributes: {exclude: ['createdAt', 'updatedAt', 'deletedAt']},
                include: [
                    {
                        model: models.Attachment,
                        as: 'attachment',
                        attributes: ['filename', 'mime', 'url']
                    },
                    {
                        model: models.User,
                        as: 'author',
                        attributes: ['id', 'isAdmin', 'username', 'githubId', 'githubUsername'],
                        include: [{
                            model: models.Attachment,
                            as: 'photo',
                            attributes: ['filename', 'mime', 'url']
                        }]
                    },
                    {
                        model: models.User,
                        as: "fans",
                        attributes: ['id'],
                        through: {attributes: []}
                    }
                ],
                offset: Math.floor(Math.random() * (count - i)),
                limit: 1
            });

            if (!qarr.length) break;

            const quiz = qarr[0]

            quizIds.push(quiz.id);
            quizzes.push(quiz);
        }

        // If this quiz is one of my favourites, then I create
        // the attribute "favourite = true"

        res.json(quizzes.map(quiz => ({
            id: quiz.id,
            question: quiz.question,
            answer: quiz.answer,
            author: quiz.author,
            attachment: quiz.attachment,
            favourite: quiz.fans.some(fan => fan.id == token.userId)
        })));
    } catch (error) {
        next(error);
    }
};

//-----------------------------------------------------------

/**
 * Returns a promise to get a random quizId.
 * Excludes the ids given in the parameter.
 *
 * @param exclude Array of ids to exclude.
 *
 * @return A promise
 */
const randomQuizId = async exclude => {

    const whereOpt = {'id': {[Sequelize.Op.notIn]: exclude}};

    const count = await models.Quiz.count({where: whereOpt});


    const quizzes = await models.Quiz.findAll({
        where: whereOpt,
        offset: Math.floor(Math.random() * count),
        limit: 1
    });
    return quizzes.length ? quizzes[0].id : 0;
};

//-----------------------------------------------------------
