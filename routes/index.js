var express = require('express');
var router = express.Router();

const quizController = require('../controllers/quiz');
const userController = require('../controllers/user');
const sessionController = require('../controllers/session');

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


// Authenticate with OAuth 2.0 at Github
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    router.get('/auth/github',
        sessionController.authGitHub);
    router.get('/auth/github/callback',
        sessionController.authGitHubCB,
        sessionController.createLoginExpires);
}

// Authenticate with OAuth 1.0 at Twitter
if (process.env.TWITTER_CONSUMER_KEY && process.env.TWITTER_CONSUMER_SECRET) {
    router.get('/auth/twitter',
        sessionController.authTwitter);
    router.get('/auth/twitter/callback',
        sessionController.authTwitterCB,
        sessionController.createLoginExpires);
}

// Authenticate with OAuth 2.0 at Twitter
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    router.get('/auth/google',
        sessionController.authGoogle);
    router.get('/auth/google/callback',
        sessionController.authGoogleCB,
        sessionController.createLoginExpires);
}

// Authenticate with OAuth 2.0 at Linkedin
if (process.env.LINKEDIN_API_KEY && process.env.LINKEDIN_SECRET_KEY) {
    router.get('/auth/linkedin',
        sessionController.authLinkedin);
    router.get('/auth/linkedin/callback',
        sessionController.authLinkedinCB,
        sessionController.createLoginExpires);
}

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
router.get('/users',                    userController.index);
router.get('/users/:userId(\\d+)',      userController.show);
router.get('/users/new',                userController.new);
router.post('/users',                   userController.create);
router.get('/users/:userId(\\d+)/edit', userController.isLocalRequired, userController.edit);
router.put('/users/:userId(\\d+)',      userController.isLocalRequired, userController.update);
router.delete('/users/:userId(\\d+)',   userController.destroy);


// Routes for the resource /quizzes
router.get('/quizzes',                     quizController.index);
router.get('/quizzes/:quizId(\\d+)',       quizController.show);
router.get('/quizzes/new',                 quizController.new);
router.post('/quizzes',                    quizController.create);
router.get('/quizzes/:quizId(\\d+)/edit',  quizController.edit);
router.put('/quizzes/:quizId(\\d+)',       quizController.update);
router.delete('/quizzes/:quizId(\\d+)',    quizController.destroy);

router.get('/quizzes/:quizId(\\d+)/play',  quizController.play);
router.get('/quizzes/:quizId(\\d+)/check', quizController.check);


module.exports = router;
