
const {models} = require('../models');

// PUT /users/tokenOwner/favourites/:quizId
exports.add = async (req, res, next) => {

    const tokenUserId = req.token.userId;

    try {
        await req.quiz.addFan(tokenUserId);
        res.send(200);
    } catch (error) {
        next(error);
    }
};


// DELETE /users/tokenOwner/favourites/:quizId
exports.del = async (req, res, next) => {

    const tokenUserId = req.token.userId;

    try {
        await req.quiz.removeFan(tokenUserId);
        res.send(200);
    } catch (error) {
        next(error);
    }
};
