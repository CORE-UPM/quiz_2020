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

// Import the definition of the Users Table from user.js
sequelize.import(path.join(__dirname,'user'));

// Session
sequelize.import(path.join(__dirname,'session'));


// Relation between models

const {quiz, user} = sequelize.models;

// Relation 1-to-N between User and Quiz:
user.hasMany(quiz, {foreignKey: 'authorId'});
quiz.belongsTo(user, {as: 'author', foreignKey: 'authorId'});


module.exports = sequelize;
