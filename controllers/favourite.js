
// PUT /users/:userId/favourites/:quizId
exports.add = (req, res, next) => {

    req.quiz.addFan(req.user)
    .then(() => {
        if (req.xhr) {
            res.send(200);
        } else {
            res.sendStatus(415);
        }
    })
    .catch(error => {
        console.log(error);
        res.sendStatus(500);
    });
};


// DELETE /users/:userId/favourites/:quizId
exports.del = (req, res, next) => {

    req.quiz.removeFan(req.user)
    .then(() => {
        if (req.xhr) {
            res.send(200);
        } else {
            res.sendStatus(415);
        }
    })
    .catch(error => {
        console.log(error);
        res.sendStatus(500);
    });
};
