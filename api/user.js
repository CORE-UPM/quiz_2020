
const {models} = require('../models');
const Sequelize = require('sequelize');

//-----------------------------------------------------------

// Autoload the user with id equals to :userId
exports.load = (req, res, next, userId) =>{

    models.user.findByPk(userId, {
        attributes: ['id', 'isAdmin', 'username'],
        include: [{
            model: models.attachment,
            as: 'photo',
            attributes: ['filename', 'mime', 'url']
        }]
    })
    .then(function (user) {
        if (user) {
            req.user = user;
            next();
        } else {
            throw new Error('No exist userId=' + userId);
        }
    })
    .catch(error => next(error));
};

// Forces autoloading of the user with token equals to req.token.userId.
// The object req.token.userId is created by the token.load middleware.
exports.loadToken = (req, res, next) => {

    exports.load(req, res, next, req.token.userId);
};

//-----------------------------------------------------------

// GET /api/users
exports.index = (req, res, next) => {

    models.user.findAll({
        order: [['username']],
        attributes: ['id', 'isAdmin', 'username'],
        include: [{
            model: models.attachment,
            as: 'photo',
            attributes: ['filename', 'mime', 'url']
        }]
    })
    .then(users => {
        res.json(users);
    })
    .catch(error => next(error));
};

//-----------------------------------------------------------

// GET /api/users/:userId
exports.show = (req, res, next) => {
    res.json(req.user);
};


//-----------------------------------------------------------
