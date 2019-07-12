'use strict';

module.exports = {
    up: function (queryInterface, Sequelize) {
        return queryInterface.addColumn(
            'users',
            'token',
            {
                type: Sequelize.STRING,
                validate: {notEmpty: {msg: "Token must not be empty."}}
            }
        );
    },

    down: function (queryInterface, Sequelize) {
        return queryInterface.removeColumn('users', 'token');
    }
};
