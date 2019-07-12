var createError = require('http-errors');
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session');
var SequelizeStore = require('connect-session-sequelize')(session.Store);
var partials = require('express-partials');
var flash = require('express-flash');
var methodOverride = require('method-override');

const passport = require('passport');

var apiRouter = require('./routes/api');
var htmlRouter = require('./routes/index');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// In production:
//   * At Heroku:
//        I redirect the HTTP requests to https.
//        Documentation: http://jaketrent.com/post/https-redirect-node-heroku/
//   * At quiz.dit.upm.es
//        I redirect the HTTP requests to  https://quiz.dit.upm.es
//
if (app.get('env') === 'production') {
    app.use(function (req, res, next) {

        if (req.hostname === "quiz.dit.upm.es") { // WEB SERVER RUNNING AT quiz.dit.upm.es

            if (req.protocol !== "https") {
                console.log("Redirection from: Protocol =", req.protocol, " Hostname =", req.hostname);
                res.redirect("https://quiz.dit.upm.es" + req.url);
            } else {
                next();
            }

        } else {  // WEB SERVER RUNNING AT HEROKU

            if (req.headers['x-forwarded-proto'] !== 'https') {
                res.redirect('https://' + req.get('Host') + req.url);
            } else {
                next()
            }
        }
    });
}

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Configuracion de la session para almacenarla en BBDD usando Sequelize.
var sequelize = require("./models");
var sessionStore = new SequelizeStore({
  db: sequelize,
  table: "session",
  checkExpirationInterval: 15 * 60 * 1000, // The interval at which to cleanup expired sessions in milliseconds. (15 minutes)
  expiration: 4 * 60 * 60 * 1000  // The maximum age (in milliseconds) of a valid session. (4 hours)
});
app.use(session({
  secret: "Quiz 2018",
  store: sessionStore,
  resave: false,
  saveUninitialized: true
}));

app.use(methodOverride('_method', {methods: ["POST", "GET"]}));
app.use(express.static(path.join(__dirname, 'public')));
app.use(partials());
app.use(flash());

app.use(passport.initialize( {
    userProperty: 'loginUser' // defaults to 'user' if omitted
}));
app.use(passport.session());

// Control de Acceso HTTP (CORS) - Sonsoles
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

// Dynamic Helper:
app.use(function(req, res, next) {

    // To use req.session in the views
    res.locals.session = req.session;

    // To use req.loginUser in the views
    res.locals.loginUser = req.loginUser && {
        id: req.loginUser.id,
        username: req.loginUser.username,
        isAdmin: req.loginUser.isAdmin
    };

    // To use req.url in the views
    res.locals.url = req.url;

    next();
});


// Routes mounted at '/api'.
app.use('/api', apiRouter);

// Routes mounted at '/'. (no starting with /api/)
app.use(/^(?!\/api\/)/, htmlRouter);


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
