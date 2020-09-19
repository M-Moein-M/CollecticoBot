const express = require('express');
const exhbs = require('express-handlebars');
const path = require('path');
const dotenv = require('dotenv').config();

const app = express();
app.use(express.static('public'));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`server is running at port ${port}`));

// database
const Datastore = require('nedb');
const usersDatabase = new Datastore({
  filename: path.join(__dirname, 'database', 'users-database.db'),
  autoload: true,
});

console.log('Databasae loaded');

// express session
const flash = require('express-flash');
const session = require('express-session');
const NedbStore = require('connect-nedb-session')(session);
app.use(flash());
app.use(
  session({
    secret: process.env.SECRET || 'skyisgettingdarker',
    resave: false,
    saveUninitialized: false,
    store: new NedbStore({
      filename: path.join(__dirname, 'database', 'session-database.db'),
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 200, // 200 hours for session duration
    },
  })
);

// passport
const passport = require('passport');

module.exports = { usersDatabase, passport };

const _ = require(path.join(__dirname, 'passport-config.js'))(
  passport,
  usersDatabase
);
app.use(passport.initialize());
app.use(passport.session());

// html form middleware
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// handlebar
app.engine('handlebars', exhbs());
app.set('view engine', 'handlebars');

// routes
app.use('/', require(path.join(__dirname, 'routes', 'index.js')));
app.use('/signup', require(path.join(__dirname, 'routes', 'signup')));
app.use('/signin', require(path.join(__dirname, 'routes', 'signin')));
app.use('/tags', require(path.join(__dirname, 'routes', 'tags')).router);

app.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/');
});

// BOT
const bot = require('./bot');

// verify the account
app.use(
  '/verification',
  require(path.join(__dirname, 'routes', 'verification'))
);
