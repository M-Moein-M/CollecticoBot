const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const flash = require('express-flash');

const { usersDatabase, passport } = require('../app.js');

router.get('/', isNotAuthenticated, (req, res) => {
  res.render('signup', {
    isUserLogged: req.isAuthenticated(),
    username: req.isAuthenticated() ? req.user.username : null,
  });
});

router.post('/', isNotAuthenticated, (req, res) => {
  const renderObj = { signupErrors: [] };

  if (req.body.password.length < 6) {
    renderObj.signupErrors.push('Password must be at least 6 characters!');
    renderObj.email = req.body.email; // we dont want the user to type the eamil again
    renderObj.username = req.body.username;
  }

  usersDatabase.findOne(
    { email: req.body.email },
    (err, userFoundWithEmail) => {
      if (err) {
        console.log('Error in signup post request');
        console.log(err);
        res.redirect('signup');
      }

      // check if the input username is already exists
      usersDatabase.findOne(
        { username: req.body.username },
        (err, userFoundwithUsername) => {
          if (err) {
            console.log('Error in signup post request');
            console.log(err);
            res.redirect('signup');
          }

          if (userFoundWithEmail != null) {
            // there's an user with same email
            renderObj.signupErrors.push('This email already exists!');
            renderObj.email = null;
            renderObj.username = req.body.username;
            renderObj.isUserLogged = req.isAuthenticated();
            renderObj.username = req.isAuthenticated()
              ? req.user.username
              : null;
          }

          if (userFoundwithUsername != null) {
            // ther's an user with same username
            renderObj.signupErrors.push('This username already exists!');
            renderObj.email = userFoundWithEmail ? null : req.body.email;
            renderObj.username = null;
          }

          if (renderObj.signupErrors.length != 0) {
            res.render('signup', renderObj);
          } else {
            // inserting new user to database
            const { email, username, password } = req.body;
            // initialize new user
            const user = {
              email,
              username,
              password: bcrypt.hashSync(password, 10),
              userLevel: 1,
            };
            usersDatabase.insert(user);

            req.flash('appMsg', 'You may now sign-in with your account');
            res.render('signin', {
              isUserLogged: req.isAuthenticated(),
              username: req.isAuthenticated() ? req.user.username : null,
            });
          }
        }
      );
    }
  );
});

// make sure user is not authenticated already
function isNotAuthenticated(req, res, next) {
  if (!req.isAuthenticated()) next();
  else res.redirect('/');
}

module.exports = router;
