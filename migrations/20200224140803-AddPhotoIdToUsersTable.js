'use strict';

module.exports = {
    up: function (queryInterface, Sequelize) {
        return queryInterface.addColumn(
            'Users',
            'photoId',
            {
                type: Sequelize.INTEGER,
                references: {
                    model: "Attachments",
                    key: "id"
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            }
        );
    },

    down: function (queryInterface, Sequelize) {
        return queryInterface.removeColumn('Users', 'photoId');
    }
};
