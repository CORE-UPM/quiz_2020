const Sequelize = require("sequelize");
const {models} = require("../models");


// POST /quizzes/:quizId/tips
exports.create = (req, res, next) => {

    const tip = models.tip.build(
        {
            text: req.body.text,
            quizId: req.quiz.id
        });

    tip.save()
    .then(tip => {
        req.flash('success', 'Tip created successfully.');
        res.redirect("back");
    })
    .catch(Sequelize.ValidationError, error => {
        req.flash('error', 'There are errors in the form:');
        error.errors.forEach(({message}) => req.flash('error', message));
        res.redirect("back");
    })
    .catch(error => {
        req.flash('error', 'Error creating the new tip: ' + error.message);
        next(error);
    });
};
