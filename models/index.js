const path = require('path');

// Load ORM
const Sequelize = require('sequelize');


// Environment variable to define the URL of the data base to use.
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
User.hasMany(Quiz, {as: 'quizzes', foreignKey: 'authorId'});
Quiz.belongsTo(User, {as: 'author', foreignKey: 'authorId'});


// Relation 1-to-1 between Quiz and Attachment
Attachment.hasOne(Quiz, {as: 'quiz', foreignKey: 'attachmentId'});
Quiz.belongsTo(Attachment, {as: 'attachment', foreignKey: 'attachmentId'});

// Relation 1-to-1 between User and Attachment
Attachment.hasOne(User, {as: 'user', foreignKey: 'photoId'});
User.belongsTo(Attachment, {as: "photo", foreignKey: 'photoId'});

// Relation N-to-N between Quiz and User:
//    A User has many favourite quizzes.
//    A quiz has many fans (the users who have marked it as favorite)
Quiz.belongsToMany(User, {
    as: 'fans',
    through: 'Favourites',
    foreignKey: 'quizId',
    otherKey: 'userId'
});

User.belongsToMany(Quiz, {
    as: 'favouriteQuizzes',
    through: 'Favourites',
    foreignKey: 'userId',
    otherKey: 'quizId'
});


module.exports = sequelize;
