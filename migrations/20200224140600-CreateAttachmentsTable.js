'use strict';

module.exports = {
    up(queryInterface, Sequelize) {
        return queryInterface.createTable(
            'Attachments',
            {
                id: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    primaryKey: true,
                    autoIncrement: true,
                    unique: true
                },
                resource: {
                    type: Sequelize.STRING
                },
                url: {
                    type: Sequelize.STRING
                },
                filename: {
                    type: Sequelize.STRING
                },
                mime: {
                    type: Sequelize.STRING
                },
                createdAt: {
                    type: Sequelize.DATE,
                    allowNull: false
                },
                updatedAt: {
                    type: Sequelize.DATE,
                    allowNull: false
                }
            },
            {
                sync: {force: true}
            }
        );
    },

    down(queryInterface, Sequelize) {
        return queryInterface.dropTable('Attachments');
    }
};
