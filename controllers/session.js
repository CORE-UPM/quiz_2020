const {models} = require("../models");

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

// GitHub Authentication values are provided using environment variables.
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

// Twitter Authentication values are provided using environment variables.
const TWITTER_CONSUMER_KEY = process.env.TWITTER_CONSUMER_KEY;
const TWITTER_CONSUMER_SECRET = process.env.TWITTER_CONSUMER_SECRET;

// Google Authentication values are provided using environment variables.
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

// Linkedid Authentication values are provided using environment variables.
const LINKEDIN_API_KEY = process.env.LINKEDIN_API_KEY;
const LINKEDIN_SECRET_KEY = process.env.LINKEDIN_SECRET_KEY;

// Base URL of the Callback URL
const CALLBACK_BASE_URL = process.env.CALLBACK_BASE_URL || "http://localhost:3000";


const GitHubStrategy = GITHUB_CLIENT_ID && GITHUB_CLIENT_SECRET && require('passport-github2').Strategy;
const TwitterStrategy = TWITTER_CONSUMER_KEY && TWITTER_CONSUMER_SECRET && require('passport-twitter').Strategy;
const GoogleStrategy = GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && require('passport-google-oauth20').Strategy;
const LinkedinStrategy = LINKEDIN_API_KEY && LINKEDIN_SECRET_KEY && require('passport-linkedin-oauth2').Strategy;


// This variable contains the maximum inactivity time allowed without
// making requests.
// If the logged user does not make any new request during this time,
// then the user's session will be closed.
// The value is in milliseconds.
// 5 minutes.
const maxIdleTime = 5*60*1000;



// Middleware to create req.session.loginExpires, which is the current inactivity time
// for the user session.
exports.createLoginExpires = (req, res, next) => {

    req.session.loginExpires = Date.now() + maxIdleTime;

    res.redirect("/goback");
};


// Middleware used to check the inactivity time.
// If the inactivity time has been exceeded, then the user session is destroyed.
exports.checkLoginExpires = (req, res, next) => {

    if (req.session.loginExpires) { // There exist a user session
        if (req.session.loginExpires < Date.now()) { // Expired

            delete req.session.loginExpires;

            req.logout(); // Passport logout

            // Delete req.loginUser from the views
            delete res.locals.loginUser;

            req.flash('info', 'User session has expired.');
        } else { // Not expired. Reset value.
            req.session.loginExpires = Date.now() + maxIdleTime;
        }
    }
    // Continue with the request
    next();
};


// Middleware: Login required.
//
// If the user is logged in previously then there will exists
// the req.loginUser object, so I continue with the others
// middlewares or routes.
// If req.loginUser does not exist, then nobody is logged,
// so I redirect to the login screen.
//
exports.loginRequired = function (req, res, next) {
    if (req.loginUser) {
        next();
    } else {
        req.flash("info", "Login required: log in and retry.");
        res.redirect('/login');
    }
};


// MW that allows to pass only if the logged useer in is admin.
exports.adminRequired = (req, res, next) => {

    const isAdmin = !!req.loginUser.isAdmin;

    if (isAdmin) {
        next();
    } else {
        console.log('Prohibited route: the logged in user is not an administrator.');
        res.send(403);
    }
};

// MW that allows to pass only if the logged in user is:
// - admin
// - or is the user to be managed.
exports.adminOrMyselfRequired = (req, res, next) => {

    const isAdmin = !!req.loginUser.isAdmin;
    const isMyself = req.load.user.id === req.loginUser.id;

    if (isAdmin || isMyself) {
        next();
    } else {
        console.log('Prohibited route: it is not the logged in user, nor an administrator.');
        res.send(403);
    }
};


/*
 * Serialize user to be saved into req.session.passport.
 * It only saves the id of the user.
 */
passport.serializeUser((user, done) => {

    done(null, user.id);
});


/*
 * Deserialize req.session.passport to create the user.
 * Find the user with the serialized id.
 */
passport.deserializeUser(async (id, done) => {

    try {
        const user = await models.User.findByPk(id);
        done(null, user);
    } catch (error) {
        done(error);
    }
});


/*
 * Configure Passport: local strategy.
 *
 * Searches a user with the given username, and checks that the password is correct.
 *
 * If the authentication is correct, then it invokes done(null, user).
 * If the authentication is not correct, then it invokes done(null, false).
 * If there is an error, then it invokes done(error).
 */
passport.use(new LocalStrategy(
    async (username, password, done) => {

        try {
            const user = await models.User.findOne({where: {username}});
            if (user && user.verifyPassword(password)) {
                done(null, user);
            } else {
                done(null, false);
            }
        } catch (error) {
            done(error);
        }
    }
));


// Use the GitHubStrategy within Passport.
//   Strategies in Passport require a `verify` function, which accept
//   credentials (in this case, an accessToken, refreshToken, and GitHub
//   profile), and invoke a callback with a user object.
GitHubStrategy && passport.use(new GitHubStrategy({
        clientID: GITHUB_CLIENT_ID,
        clientSecret: GITHUB_CLIENT_SECRET,
        callbackURL: `${CALLBACK_BASE_URL}/auth/github/callback`
    },
    async (accessToken, refreshToken, profile, done) => {
        try {
            // The returned GitHub profile represent the logged-in user.
            // I must associate the GitHub account with a user record in the database,
            // and return that user.
            const [user, created] = await models.User.findOrCreate({
                where: {
                    accountTypeId: models.User.accountTypeId("github"),
                    profileId: profile.id
                },
                defaults: {
                    profileName: profile.username
                }
            });
            done(null, user);
        } catch(error) {
            done(error, null);
        }
    }
));


// Use the TwitterStrategy within Passport (OAuth 1).
//   Strategies in Passport require a `verify` function, which accept
//   credentials (in this case, an token, tokenSecret, and Twitter
//   profile), and invoke a callback with a user object.
TwitterStrategy && passport.use(new TwitterStrategy({
        consumerKey: TWITTER_CONSUMER_KEY,
        consumerSecret: TWITTER_CONSUMER_SECRET,
        callbackURL: `${CALLBACK_BASE_URL}/auth/twitter/callback`
    },
    async (token, tokenSecret, profile, done) => {
        try {
            // The returned Twitter profile represent the logged-in user.
            // I must associate the Twitter account with a user record in the database,
            // and return that user.
            const [user, created] = await models.User.findOrCreate({
                where: {
                    accountTypeId: models.User.accountTypeId("twitter"),
                    profileId: profile.id
                },
                defaults: {
                    profileName: profile.username
                }
            });
            done(null, user);
        } catch(error) {
            done(error, null);
        }
    }
));


// Use the GoogleStrategy within Passport.
//   Strategies in Passport require a `verify` function, which accept
//   credentials (in this case, an accessToken, refreshToken, and GitHub
//   profile), and invoke a callback with a user object.
GoogleStrategy && passport.use(new GoogleStrategy({
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: `${CALLBACK_BASE_URL}/auth/google/callback`
    },
    async (accessToken, refreshToken, profile, done) => {
        try {
            // The returned Google profile represent the logged-in user.
            // I must associate the Google account with a user record in the database,
            // and return that user.
            const [user, created] = await models.User.findOrCreate({
                where: {
                    accountTypeId: models.User.accountTypeId("google"),
                    profileId: profile.id
                },
                defaults: {
                    profileName: profile.displayName.replace(/ /g,"")
                }
            });
            done(null, user);
        } catch(error) {
            done(error, null);
        }
    }
));


// Use the LinkedinStrategy within Passport.
//   Strategies in Passport require a `verify` function, which accept
//   credentials (in this case, an accessToken, refreshToken, and Linkedin
//   profile), and invoke a callback with a user object.
LinkedinStrategy && passport.use(new LinkedinStrategy({
        clientID: LINKEDIN_API_KEY,
        clientSecret: LINKEDIN_SECRET_KEY,
        callbackURL: `${CALLBACK_BASE_URL}/auth/linkedin/callback`,
        scope: ['r_emailaddress', 'r_liteprofile'],
        state: true
    },
    async (accessToken, refreshToken, profile, done) => {
        try {
            // The returned Linkedin profile represent the logged-in user.
            // I must associate the Linkedin account with a user record in the database,
            // and return that user.
            const [user, created] = await models.User.findOrCreate({
                where: {
                    accountTypeId: models.User.accountTypeId("linkedin"),
                    profileId: profile.id
                },
                defaults: {
                    profileName: profile.displayName.replace(/ /g,"")
                }
            });
            done(null, user);
        } catch(error) {
            done(error, null);
        }
    }
));


// GET /login   -- Login form
exports.new = (req, res, next) => {

    res.render('session/new', {
        loginWithGitHub: !!GitHubStrategy,
        loginWithTwitter: !!TwitterStrategy,
        loginWithGoogle: !!GoogleStrategy,
        loginWithLinkedin: !!LinkedinStrategy
    });
};


// POST /login   -- Create the session if the user authenticates successfully
exports.create = passport.authenticate(
    'local',
    {
        failureRedirect: '/login',
        successFlash: 'Welcome!',
        failureFlash: 'Authentication has failed. Retry it again.'
    }
);


// GET /auth/github   -- authenticate at GitHub
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  The first step in GitHub authentication will involve redirecting
//   the user to github.com.  After authorization, GitHub will redirect the user
//   back to this application at /login/github/callback
exports.authGitHub = GitHubStrategy && passport.authenticate('github', {scope: ['user']});


// GET /auth/github/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function will be called,
//   which, in this example, will redirect the user to the home page.

exports.authGitHubCB = GitHubStrategy && passport.authenticate(
    'github',
    {
        failureRedirect: '/auth/github',
        successFlash: 'Welcome!',
        failureFlash: 'Authentication has failed. Retry it again.'
    }
);


// GET /auth/twitter   -- authenticate at GitHub
exports.authTwitter = TwitterStrategy && passport.authenticate('twitter');

// GET /auth/twitter/callback
exports.authTwitterCB = TwitterStrategy && passport.authenticate(
    'twitter',
    {
        failureRedirect: '/auth/twitter',
        successFlash: 'Welcome!',
        failureFlash: 'Authentication has failed. Retry it again.'
    }
);


// GET /auth/google   -- authenticate at Google
exports.authGoogle = GoogleStrategy && passport.authenticate('google', {scope: ['profile']});

// GET /auth/google/callback
exports.authGoogleCB = GoogleStrategy && passport.authenticate(
    'google',
    {
        failureRedirect: '/auth/google',
        successFlash: 'Welcome!',
        failureFlash: 'Authentication has failed. Retry it again.'
    }
);


// GET /auth/linkedin   -- authenticate at Linkedin
exports.authLinkedin = LinkedinStrategy && passport.authenticate('linkedin');

// GET /auth/google/callback
exports.authLinkedinCB = LinkedinStrategy && passport.authenticate(
    'linkedin',
    {
        failureRedirect: '/auth/linkedin',
        successFlash: 'Welcome!',
        failureFlash: 'Authentication has failed. Retry it again.'
    }
);


// DELETE /login   --  Close the session
exports.destroy = (req, res, next) => {

    delete req.session.loginExpires;

    req.logout();  // Passport logout

    res.redirect("/goback");
};
