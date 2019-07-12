
const express = require('express');
const router = express.Router();

const tokenApi = require('../api/token');

const quizApi = require('../api/quiz');
const userApi = require('../api/user');
const favouriteApi = require('../api/favourite');

//-----------------------------------------------------------

// Debug trace.
router.all('*', function(req, res, next) {

    console.log("=== API ===>", req.url);
    next();
});

// All routes require an user access token.
router.all('*', tokenApi.tokenRequired);

//-----------------------------------------------------------

// Autoload the objects associated to the given route parameter.
router.param('userId',       userApi.load);
router.param('quizId',       quizApi.load);

router.param('quizId_woi',   quizApi.load_woi);

//-----------------------------------------------------------

// Routes for the users resource.

router.get('/users',
    userApi.index);

router.get('/users/:userId(\\d+)',
    userApi.show);

router.get('/users/tokenOwner',
    userApi.loadToken,
    userApi.show);

//-----------------------------------------------------------

// Routes for the quizzes resource.

router.get('/quizzes',
    quizApi.index);

router.get('/quizzes/:quizId(\\d+)',
    quizApi.show);

router.get('/users/:userId(\\d+)/quizzes',
    quizApi.index);

router.get('/users/tokenOwner/quizzes',
    userApi.loadToken,
    quizApi.index);

//-----------------------------------------------------------

// Routes to manage favourites

router.put('/users/tokenOwner/favourites/:quizId_woi(\\d+)',
    userApi.loadToken,
    favouriteApi.add);

router.delete('/users/tokenOwner/favourites/:quizId_woi(\\d+)',
    userApi.loadToken,
    favouriteApi.del);

//-----------------------------------------------------------

// Route to play a random quiz.
router.get('/quizzes/random',
    quizApi.random);

// Route to check the answer of the given quiz.
router.get('/quizzes/:quizId_woi(\\d+)/check',
    quizApi.check);

//-----------------------------------------------------------

// Route to start playing random quizzes.
router.get('/quizzes/randomPlay/new',
    quizApi.randomPlayNew);

// Route to get the next random quiz to play.
router.get('/quizzes/randomPlay/next',
    quizApi.randomPlayNext);

// Route to check the answer of the current random quiz.
router.get('/quizzes/randomPlay/check',
    quizApi.randomPlayCheck);

//-----------------------------------------------------------

// Route to get 10 random quizzes, including answers.
// Returns 10 or less depending on the DDBB size.
// wa = with answers
router.get('/quizzes/random10wa',
    quizApi.random10wa);

//-----------------------------------------------------------

// If I am here, then the requested route is not defined.
router.all('*', function(req, res, next) {

    var err = new Error('Ruta API no encontrada');
    err.status = 404;
    next(err);
});

//-----------------------------------------------------------

// Error
router.use(function(err, req, res, next) {

    var emsg = err.message || "Error Interno";

    console.log(emsg);

    res.status(err.status || 500)
    .send({error: emsg})
    .end();
});

//-----------------------------------------------------------

module.exports = router;

//-----------------------------------------------------------
