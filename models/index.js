const path = require('path');

// Load ORM
const Sequelize = require('sequelize');

// To use SQLite data base:
const sequelize = new Sequelize("sqlite:quiz.sqlite");

// Import the definition of the Quiz Table from quiz.js
sequelize.import(path.join(__dirname, 'quiz'));

// Session
sequelize.import(path.join(__dirname,'session'));

module.exports = sequelize;
