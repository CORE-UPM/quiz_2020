
const {models} = require('../models');

// PUT /users/tokenOwner/favourites/:quizId
exports.add = (req, res, next) => {

    const tokenUserId = req.token.userId;

    req.quiz.addFan(tokenUserId)
    .then(() => {
        res.send(200);
    })
    .catch(error => next(error));
};


// DELETE /users/tokenOwner/favourites/:quizId
exports.del = (req, res, next) => {

    const tokenUserId = req.token.userId;

    req.quiz.removeFan(tokenUserId)
    .then(() => {
        res.send(200);
    })
    .catch(error => next(error));
};
