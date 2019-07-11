
// Definition of the Attachment model:

module.exports = (sequelize, DataTypes) => {
    return sequelize.define('attachment',
        {
            public_id: {
                type: DataTypes.STRING,
                validate: {
                    notEmpty: {msg: "public_id can not be empty."}
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
        });
}
