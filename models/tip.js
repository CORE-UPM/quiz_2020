
// Definition of the Tips model:

module.exports = function (sequelize, DataTypes) {
    return sequelize.define('tip',
        {
            text: {
                type: DataTypes.STRING,
                validate: {notEmpty: {msg: "Tip text must not be empty."}}
            },
            accepted: {
                type: DataTypes.BOOLEAN,
                defaultValue: false
            }
        });
};
