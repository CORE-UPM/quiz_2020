const Sequelize = require("sequelize");
const {models} = require("../models");
const url = require('url');


// This variable contains the maximum inactivity time allowed without
// making requests.
// If the logged user does not make any new request during this time,
// then the user's session will be closed.
// The value is in milliseconds.
// 5 minutes.
const maxIdleTime = 5*60*1000;


// Middleware used to destroy the user's session if the inactivity time
// has been exceeded.
exports.checkLoginExpires = (req, res, next) => {

    if (req.session.loginUser ) { // There exista user's session
        if ( req.session.loginUser.expires < Date.now() ) { // Expired
            delete req.session.loginUser; // Logout
            req.flash('info', 'User session has expired.');
        } else { // Not expired. Reset value.
            req.session.loginUser.expires = Date.now() + maxIdleTime;
        }
    }
    // Continue with the request
    next();
};


/*
 * User authentication: Checks that the user is registered.
 *
 * Return a Promise that searches a user with the given login, and checks that
 * the password is correct.
 * If the authentication is correct, then the promise is satisfied and returns
 * an object with the User.
 * If the authentication fails, then the promise is also satisfied, but it
 * returns null.
 */
const authenticate = (username, password) => {

    return models.user.findOne({where: {username}})
    .then(user => {
        if (user && user.verifyPassword(password)) {
            return user;
        } else {
            return null;
        }
    });
};



// GET /login   -- Login form
exports.new = (req, res, next) => {

    res.render('session/new');
};


// POST /login   -- Create the session if the user authenticates successfully
exports.create = (req, res, next) => {

    const {username, password}  = req.body;

    authenticate(username, password)
    .then(user => {
        if (user) {
            // Create req.session.loginUser and save id and username fields.
            // The existence of req.session.loginUser indicates that the session exists.
            // I also save the moment when the session will expire due to inactivity.
            req.session.loginUser = {
                id: user.id,
                username: user.username,
                isAdmin: user.isAdmin,
                expires: Date.now() + maxIdleTime
            };

            res.redirect("/goback");
        } else {
            req.flash('error', 'Authentication has failed. Retry it again.');
            res.render('session/new');
        }
    })
    .catch(error => {
        req.flash('error', 'An error has occurred: ' + error);
        next(error);
    });
};


// DELETE /login   --  Close the session
exports.destroy = (req, res, next) => {

    delete req.session.loginUser;

    res.redirect("/goback");
};
