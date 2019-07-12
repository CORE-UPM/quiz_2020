
const {models} = require('../models');

// PUT /users/tokenOwner/favourites/:quizId
exports.add = async (req, res, next) => {

    const tokenUserId = req.load.token.userId;

    try {
        await req.load.quiz.addFan(tokenUserId);
        res.send(200);
    } catch (error) {
        next(error);
    }
};


// DELETE /users/tokenOwner/favourites/:quizId
exports.del = async (req, res, next) => {

    const tokenUserId = req.load.token.userId;

    try {
        await req.load.quiz.removeFan(tokenUserId);
        res.send(200);
    } catch (error) {
        next(error);
    }
};
