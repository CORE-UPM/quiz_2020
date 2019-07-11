const path = require('path');

// Load ORM
const Sequelize = require('sequelize');

// To use SQLite data base:
const sequelize = new Sequelize("sqlite:quiz.sqlite");

// Import the definition of the Quiz Table from quiz.js
const Quiz = sequelize.import(path.join(__dirname, 'quiz'));

// Import the definition of the Users Table from user.js
const User = sequelize.import(path.join(__dirname,'user'));

// Session
sequelize.import(path.join(__dirname,'session'));


// Relation 1-to-N between User and Quiz:
User.hasMany(Quiz, {as: 'quiz', foreignKey: 'authorId'});
Quiz.belongsTo(User, {as: 'author', foreignKey: 'authorId'});


module.exports = sequelize;
