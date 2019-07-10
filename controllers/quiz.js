const Sequelize = require("sequelize");
const {models} = require("../models");


// GET /quizzes
exports.index = (req, res, next) => {

    models.Quiz.findAll()
    .then(quizzes => {
        res.render('quizzes/index.ejs', {quizzes});
    })
    .catch(error => next(error));
};


// GET /quizzes/:quizId
exports.show = (req, res, next) => {

    const quizId = Number(req.params.quizId);

    models.Quiz.findByPk(quizId)
    .then(quiz => {
        if (!quiz) {
            throw new Error('There is no quiz with id=' + quizId);
        }

        res.render('quizzes/show', {quiz});
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

    const quiz = models.Quiz.build({
        question,
        answer
    });

    // Saves only the fields question and answer into the DDBB
    quiz.save({fields: ["question", "answer"]})
    .then(quiz => res.redirect('/quizzes/' + quiz.id))
    .catch(Sequelize.ValidationError, error => {
        console.log('There are errors in the form:');
        error.errors.forEach(({message}) => console.log(message));
        res.render('quizzes/new', {quiz});
    })
    .catch(error => next(error));
};


// GET /quizzes/:quizId/edit
exports.edit = (req, res, next) => {

    const quizId = Number(req.params.quizId);

    models.Quiz.findByPk(quizId)
    .then(quiz => {
        if (quiz) {
            res.render('quizzes/edit', {quiz});
        } else {
            throw new Error('There is no quiz with id=' + quizId);
        }
    })
    .catch(error => next(error));
};


// PUT /quizzes/:quizId
exports.update = (req, res, next) => {

    const quizId = Number(req.params.quizId);

    models.Quiz.findByPk(quizId)
    .then(quiz => {
        if (!quiz) {
            throw new Error('There is no quiz with id=' + quizId);
        }

        quiz.question = req.body.question;
        quiz.answer = req.body.answer;

        return quiz.save({fields: ["question", "answer"]})
        .then(quiz => res.redirect('/quizzes/' + quiz.id))
        .catch(Sequelize.ValidationError, error => {
            console.log('There are errors in the form:');
            error.errors.forEach(({message}) => console.log(message));
            res.render('quizzes/edit', {quiz});
        });
    })
    .catch(error => next(error));
};


// DELETE /quizzes/:quizId
exports.destroy = (req, res, next) => {

    const quizId = Number(req.params.quizId);

    models.Quiz.findByPk(quizId)
    .then(quiz => {
        if (!quiz) {
            throw new Error('There is no quiz with id=' + quizId);
        }

        return quiz.destroy()
    })
    .then(() => res.redirect('/quizzes'))
    .catch(error => next(error));
};


// GET /quizzes/:quizId/play
exports.play = (req, res, next) => {

    const quizId = Number(req.params.quizId);

    models.Quiz.findByPk(quizId)
    .then(quiz => {
        if (!quiz) {
            throw new Error('There is no quiz with id=' + quizId);
        }

        const answer = req.query.answer || '';

        res.render('quizzes/play', {
            quiz,
            answer
        });
    })
    .catch(error => next(error));
};


// GET /quizzes/:quizId/check
exports.check = (req, res, next) => {

    const quizId = Number(req.params.quizId);

    models.Quiz.findByPk(quizId)
    .then(quiz => {
        if (!quiz) {
            throw new Error('There is no quiz with id=' + quizId);
        }

        const answer = req.query.answer || "";
        const result = answer.toLowerCase().trim() === quiz.answer.toLowerCase().trim();

        res.render('quizzes/result', {
            quiz,
            result,
            answer
        })
    })
    .catch(error => next(error));
};
