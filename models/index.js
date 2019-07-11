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
const Quiz = sequelize.import(path.join(__dirname, 'quiz'));

// Import the definition of the Users Table from user.js
const User = sequelize.import(path.join(__dirname,'user'));

// Import the definition of the Attachments Table from attachment.js
const Attachment = sequelize.import(path.join(__dirname,'attachment'));

// Session
sequelize.import(path.join(__dirname,'session'));


// Relation 1-to-N between User and Quiz:
User.hasMany(Quiz, {foreignKey: 'authorId'});
Quiz.belongsTo(User, {as: 'author', foreignKey: 'authorId'});


// Relation 1-to-1 between Quiz and Attachment
Attachment.hasOne(Quiz);
Quiz.belongsTo(Attachment);


module.exports = sequelize;
