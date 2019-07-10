'use strict';

module.exports = {
    up: function (queryInterface, Sequelize) {
        return queryInterface.createTable('Users',
            {
                id: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    primaryKey: true,
                    autoIncrement: true,
                    unique: true
                },
                username: {
                    type: Sequelize.STRING,
                    unique: true,
                    validate: {
                        notEmpty: {msg: "Username must not be empty."}
                    }
                },
                password: {
                    type: Sequelize.STRING,
                    validate: {notEmpty: {msg: "Password must not be empty."}}
                },
                salt: {
                    type: Sequelize.STRING
                },
                isAdmin: {
                    type: Sequelize.BOOLEAN,
                    defaultValue: false
                },
                accountTypeId: {
                    type: Sequelize.INTEGER,
                    unique: "profileUniqueValue",
                    default: 0,
                    validate: {
                        min: {
                            args: [0],
                            msg: "ProfileId must be positive."
                        }
                    }
                },
                profileId: {
                    type: Sequelize.INTEGER,
                    unique: "profileUniqueValue",
                    validate: {notEmpty: {msg: "accountTypeId must not be empty."}}
                },
                profileName: {
                    type: Sequelize.STRING,
                    validate: {notEmpty: {msg: "ProfileName must not be empty."}}
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

    down: function (queryInterface, Sequelize) {
        return queryInterface.dropTable('Users');
    }
};
