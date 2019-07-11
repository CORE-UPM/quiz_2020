
const {Model} = require('sequelize');

// Definition of the Attachment model:

module.exports = (sequelize, DataTypes) => {

    class Attachment extends Model {}

    Attachment.init({
            resource: {
                type: DataTypes.STRING,
                validate: {
                    notEmpty: {msg: "resource can not be empty."}
                }
            },
            url: {
                type: DataTypes.STRING,
                validate: {
                    notEmpty: {msg: "url can not be empty."}
                }
            },
            filename: {
                type: DataTypes.STRING,
                validate: {
                    notEmpty: {msg: "filename can not be empty."}
                }
            },
            mime: {
                type: DataTypes.STRING,
                validate: {
                    notEmpty: {msg: "mime can not be empty."}
                }
            }
        }, {
            sequelize
        }
    );

    return Attachment;
};
