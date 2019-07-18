const Sequelize = require("sequelize");
const {models} = require("../models");
const url = require('url');

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;


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

    if (req.session.loginExpires ) { // There exist a user session
        if ( req.session.loginExpires < Date.now() ) { // Expired

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


// GET /login   -- Login form
exports.new = (req, res, next) => {

    res.render('session/new');
};


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
    (username, password, done) => {

        models.user.findOne({where: {username}})
        .then(user => {
            if (user && user.verifyPassword(password)) {
                return done(null, user);
            } else {
                return done(null, false);
            }
        })
        .catch(done);
    }
));

/*
 * Serialize user to be saved into req.session.passport.
 * It only saves the id of the user.
 */
passport.serializeUser(function(user, done) {

    done(null, user.id);
});

/*
 * Deserialize req.session.passport to create the user.
 * Find the user with the serialized id.
 */
passport.deserializeUser(function (id, done) {

    models.user.findByPk(id)
    .then(user => done(null, user))
    .catch(done);
});


// POST /login   -- Create the session if the user authenticates successfully
exports.create = passport.authenticate(
    'local',
    {
        failureRedirect: '/login',
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
