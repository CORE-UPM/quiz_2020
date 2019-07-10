const {Model} = require('sequelize');
const crypt = require('../helpers/crypt');

// Definition of the User model:

module.exports = function (sequelize, DataTypes) {

    // Account types.
    // Account type ID is the index in this array.
    let accountTypes = [
        "local",
        "github",
        "twitter",
        "google",
        "facebook",
        "linkedin"
    ];

    class User extends Model {

        verifyPassword(password) {
            return crypt.encryptPassword(password, this.salt) === this.password;
        }

        // Returns the ID of the given account type.
        // AccountTypeId of local accounts is 0.
        static accountTypeId(name) {
            return accountTypes.indexOf(name);
        }

        get displayName() {
            if (!this.accountTypeId) {
                return `${this.username} (${accountTypes[0]})`;
            } else {
                return `${this.profileName} (${accountTypes[this.accountTypeId]})`;
            }
        }
    }

    User.init({
            username: {
                type: DataTypes.STRING,
                unique: true,
                validate: {notEmpty: {msg: "Username must not be empty."}}
            },
            password: {
                type: DataTypes.STRING,
                validate: {notEmpty: {msg: "Password must not be empty."}},
                set(password) {
                    // Random String used as salt.
                    this.salt = Math.round((new Date().valueOf() * Math.random())) + '';
                    this.setDataValue('password', crypt.encryptPassword(password, this.salt));
                }
            },
            salt: {
                type: DataTypes.STRING
            },
            isAdmin: {
                type: DataTypes.BOOLEAN,
                defaultValue: false
            },
            accountTypeId: {
                type: DataTypes.INTEGER,
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
                type: DataTypes.INTEGER,
                unique: "profileUniqueValue",
                validate: {notEmpty: {msg: "accountTypeId must not be empty."}}
            },
            profileName: {
                type: DataTypes.STRING,
                validate: {notEmpty: {msg: "ProfileName must not be empty."}}
            }
        }, {
            sequelize
        }
    );

    return User;
};
