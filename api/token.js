
const {models} = require("../models");


// Middleware: It is required to provide a token access in the request query.
//
// The user owner of the  access token provided in the query is searched, and
// the req.token object is created with these values:
//     userId: <owner user id>
//
exports.tokenRequired = (req, res, next) => {

    const token = req.query.token || "";

    if (token) {

        models.user.findOne({where: {token: token}})
        .then(user => {
            if (user) {
                req.token = {
                    userId: user.id
                };
                next();
            } else {
                // Authentication failure: invalid user access token.
                res.sendStatus(401);
            }
        });
    } else {
        // Authentication failure: access token must be provided in the query.
        res.sendStatus(401);
    }
};
