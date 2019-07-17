var express = require('express');
var router = express.Router();

const multer = require('multer');
const upload = multer({
    dest: './uploads/',
    limits: {fileSize: 20 * 1024 * 1024}});

const quizController = require('../controllers/quiz');
const userController = require('../controllers/user');
const sessionController = require('../controllers/session');
const favouriteController = require('../controllers/favourite');

//-----------------------------------------------------------

// Routes for the resource /login

// autologout
router.all('*',sessionController.checkLoginExpires);

// login form
router.get('/login', sessionController.new);

// create login session
router.post('/login',
    sessionController.create,
    sessionController.createLoginExpires);

// logout - close login session
router.delete('/login', sessionController.destroy);

//-----------------------------------------------------------

// History: Restoration routes.

// Redirection to the saved restoration route.
function redirectBack(req, res, next) {
    const url = req.session.backURL || "/";
    delete req.session.backURL;
    res.redirect(url);
}

router.get('/goback', redirectBack);

// Save the route that will be the current restoration route.
function saveBack(req, res, next) {
    req.session.backURL = req.url;
    next();
}

// Restoration routes are GET routes that do not end in:
//   /new, /edit, /play, /check, /login or /:id.
router.get(
    [
        '/',
        '/author',
        '/users',
        '/users/:id(\\d+)/quizzes',
        '/quizzes'
    ],
    saveBack);

//-----------------------------------------------------------

/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('index');
});

// Author page.
router.get('/author', (req, res, next) => {
    res.render('author');
});


// Autoload for routes using :quizId
router.param('quizId', quizController.load);
router.param('userId', userController.load);


// Routes for the resource /users
router.get('/users',
    sessionController.loginRequired,
    userController.index);
router.get('/users/:userId(\\d+)',
    sessionController.loginRequired,
    userController.show);

if (!!process.env.QUIZ_OPEN_REGISTER) {
    router.get('/users/new',
        userController.new);
    router.post('/users',
        upload.single('photo'),
      userController.create);
} else {
    router.get('/users/new',
        sessionController.loginRequired,
        sessionController.adminRequired,
        userController.new);
    router.post('/users',
        sessionController.loginRequired,
        sessionController.adminRequired,
        upload.single('photo'),
      userController.create);
}

router.get('/users/:userId(\\d+)/edit',
    sessionController.loginRequired,
    sessionController.adminOrMyselfRequired,
    userController.edit);
router.put('/users/:userId(\\d+)',
    sessionController.loginRequired,
    sessionController.adminOrMyselfRequired,
    upload.single('photo'),
    userController.update);
router.delete('/users/:userId(\\d+)',
    sessionController.loginRequired,
    sessionController.adminOrMyselfRequired,
    userController.destroy);


router.put('/users/:userId(\\d+)/token',
    sessionController.loginRequired,
    sessionController.adminOrMyselfRequired,
    userController.createToken);   // generar un nuevo token


router.get('/users/:userId(\\d+)/quizzes',
    sessionController.loginRequired,
    quizController.index);

// Routes for the resource /quizzes
router.get('/quizzes',
    quizController.index);
router.get('/quizzes/:quizId(\\d+)',
    sessionController.loginRequired,
    quizController.adminOrAuthorRequired,
    quizController.show);
router.get('/quizzes/new',
    sessionController.loginRequired,
    quizController.limitPerDay,
    quizController.new);
router.post('/quizzes',
    sessionController.loginRequired,
    upload.single('image'),
    quizController.create);
router.get('/quizzes/:quizId(\\d+)/edit',
    sessionController.loginRequired,
    quizController.adminOrAuthorRequired,
    quizController.edit);
router.put('/quizzes/:quizId(\\d+)',
    sessionController.loginRequired,
    quizController.adminOrAuthorRequired,
    upload.single('image'),
    quizController.update);
router.delete('/quizzes/:quizId(\\d+)',
    sessionController.loginRequired,
    quizController.adminOrAuthorRequired,
    quizController.destroy);

router.get('/quizzes/:quizId(\\d+)/play',  quizController.play);
router.get('/quizzes/:quizId(\\d+)/check', quizController.check);


// Routes for the resource favourites of a user
router.put('/users/:userId(\\d+)/favourites/:quizId(\\d+)',
    sessionController.loginRequired,
    sessionController.adminOrMyselfRequired,
    favouriteController.add);
router.delete('/users/:userId(\\d+)/favourites/:quizId(\\d+)',
    sessionController.loginRequired,
    sessionController.adminOrMyselfRequired,
    favouriteController.del);


module.exports = router;
