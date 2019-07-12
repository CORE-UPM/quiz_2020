
const {models} = require("../models");


// Middleware: It is required to provide a token access in the request query.
//
// The user owner of the  access token provided in the query is searched, and
// the req.token object is created with these values:
//     userId: <owner user id>
//
exports.tokenRequired = async (req, res, next) => {

    const token = req.query.token || "";

    if (token) {

        try {
            const user = await models.User.findOne({where: {token: token}});
            if (user) {
                req.load = {
                    ...req.load,
                    token: {userId: user.id}
                };
                next();
            } else {
                // Authentication failure: invalid user access token.
                res.sendStatus(401);
            }
        } catch (error) {
            next(error);
        }
    } else {
        // Authentication failure: access token must be provided in the query.
        res.sendStatus(401);
    }
};
