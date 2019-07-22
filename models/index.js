const path = require('path');

// Load ORM
const Sequelize = require('sequelize');

// To use SQLite data base:
//    DATABASE_URL = sqlite:quiz.sqlite
// To use  Heroku Postgres data base:
//    DATABASE_URL = postgres://user:passwd@host:port/database

const url = process.env.DATABASE_URL || "sqlite:quiz.sqlite";

const sequelize = new Sequelize(url);

// Import the definition of the Quiz Table from quiz.js
sequelize.import(path.join(__dirname, 'quiz'));

// Import the definition of the Tips Table from tip.js
sequelize.import(path.join(__dirname,'tip'));

// Import the definition of the Users Table from user.js
sequelize.import(path.join(__dirname,'user'));

// Import the definition of the Attachments Table from attachment.js
sequelize.import(path.join(__dirname,'attachment'));

// Session
sequelize.import(path.join(__dirname,'session'));


// Relation between models

const {quiz, tip, attachment, user} = sequelize.models;

// Relation 1-to-N between User and Quiz:
user.hasMany(quiz, {foreignKey: 'authorId'});
quiz.belongsTo(user, {as: 'author', foreignKey: 'authorId'});

// Relation 1-to-N between Tip and Quiz:
tip.belongsTo(quiz);
quiz.hasMany(tip);

// Relation 1-to-1 between Quiz and Attachment
attachment.hasOne(quiz);
quiz.belongsTo(attachment);

// Relation 1-to-1 between User and Attachment
user.belongsTo(attachment, {as: "photo", foreignKey: 'photoId'});
attachment.hasOne(user, {foreignKey: 'photoId'});


module.exports = sequelize;
