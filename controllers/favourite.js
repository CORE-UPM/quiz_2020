
// PUT /users/:userId/favourites/:quizId
exports.add = async (req, res, next) => {

    try {
        await req.load.quiz.addFan(req.load.user);
        if (req.xhr) {
            res.send(200);
        } else {
            res.sendStatus(415);
        }
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
};


// DELETE /users/:userId/favourites/:quizId
exports.del = async (req, res, next) => {

    try {
        await req.load.quiz.removeFan(req.load.user);
        if (req.xhr) {
            res.send(200);
        } else {
            res.sendStatus(415);
        }
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
};
