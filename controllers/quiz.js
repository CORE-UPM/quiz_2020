const Sequelize = require("sequelize");
const Op = Sequelize.Op;
const {models} = require("../models");

const paginate = require('../helpers/paginate').paginate;

// Autoload el quiz asociado a :quizId
exports.load = async (req, res, next, quizId) => {

    try {
        const quiz = await models.Quiz.findByPk(quizId);
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


// GET /quizzes
exports.index = async (req, res, next) => {

    let countOptions = {};
    let findOptions = {};

    // Search:
    const search = req.query.search || '';
    if (search) {
        const search_like = "%" + search.replace(/ +/g,"%") + "%";

        countOptions.where = {question: { [Op.like]: search_like }};
        findOptions.where = {question: { [Op.like]: search_like }};
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

        const quizzes = await models.Quiz.findAll(findOptions);
        res.render('quizzes/index.ejs', {
            quizzes,
            search
        });
    } catch (error) {
        next(error);
    }
};


// GET /quizzes/:quizId
exports.show = (req, res, next) => {

    const {quiz} = req.load;

    res.render('quizzes/show', {quiz});
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

    let quiz = models.Quiz.build({
        question,
        answer
    });

    try {
        // Saves only the fields question and answer into the DDBB
        quiz = await quiz.save({fields: ["question", "answer"]});
        req.flash('success', 'Quiz created successfully.');
        res.redirect('/quizzes/' + quiz.id);
    } catch (error) {
        if (error instanceof Sequelize.ValidationError) {
            req.flash('error', 'There are errors in the form:');
            error.errors.forEach(({message}) => req.flash('error', message));
            res.render('quizzes/new', {quiz});
        } else {
            req.flash('error', 'Error creating a new Quiz: ' + error.message);
            next(error);
        }
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
        res.redirect('/quizzes/' + quiz.id);
    } catch (error) {
        if (error instanceof Sequelize.ValidationError) {
            req.flash('error', 'There are errors in the form:');
            error.errors.forEach(({message}) => req.flash('error', message));
            res.render('quizzes/edit', {quiz});
        } else {
            req.flash('error', 'Error editing the Quiz: ' + error.message);
            next(error);
        }
    }
};


// DELETE /quizzes/:quizId
exports.destroy = async (req, res, next) => {

    try {
        await req.load.quiz.destroy();
        req.flash('success', 'Quiz deleted successfully.');
        res.redirect('/goback');
    } catch (error) {
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
            answer
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

//GET /quizzes/randomplay
    exports.randomPlay = async (req, res, next) => {

        req.session.randomPlayResolved = req.session.randomPlayResolved || [];
        req.session.randomPlayLastQuizId = req.session.randomPlayLastQuizId || 0;
        console.log(req.session.randomPlayResolved);

        let quiz;
        if(req.session.randomPlayLastQuizId){

            quiz = await models.Quiz.findByPk(req.session.randomPlayLastQuizId);
        } else{

            const total = await models.Quiz.count();

            const quedan = total - req.session.randomPlayResolved.length;
    
            quiz = await models.Quiz.findOne({
                where: {'id': {[Sequelize.Op.notIn]: req.session.randomPlayResolved}},
                offset: Math.floor(Math.random() * quedan)
            });
        }
 

        const score = req.session.randomPlayResolved.length;

        if(quiz){
            req.session.randomPlayLastQuizId = quiz.id;
            res.render("quizzes/random_play", {quiz, score});
        } else {
            delete req.session.randomPlayResolved;
            delete req.session.randomPlayLastQuizId;
            res.render("quizzes/random_nomore", {score});
        }
        
    }

//GET /quizzes/randomcheck/:quizId(\d+)
    exports.randomCheck = async (req, res, next) => {

        req.session.randomPlayResolved = req.session.randomPlayResolved || [];
        req.session.randomPlayLastQuizId = req.session.randomPlayLastQuizId || 0;
        console.log(req.session.randomPlayResolved);
        console.log(req.session.randomPlayLastQuizId);


        const answer = req.query.answer || "";
        const result = answer.toLowerCase().trim() === req.load.quiz.answer.toLowerCase().trim();

        if(result){
            if(req.session.randomPlayResolved.indexOf(req.load.quiz.id) === -1 ){
                req.session.randomPlayResolved.push(req.load.quiz.id);
            }
            
            const score = req.session.randomPlayResolved.length;
            delete req.session.randomPlayLastQuizId;
            res.render("quizzes/random_result.ejs",{score, answer, result});

        }else {
            console.log(req.session.randomPlayResolved.length);
            const score = req.session.randomPlayResolved.length;
            delete req.session.randomPlayLastQuizId;
            delete req.session.randomPlayResolved;
            res.render("quizzes/random_result.ejs", {score, answer, result})
        }
    }
