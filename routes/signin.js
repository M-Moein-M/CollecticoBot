const express = require('express');
const router = express.Router();

const { usersDatabase, passport } = require('../app.js');

router.get('/', isNotAuthenticated, (req, res) => {
  res.render('signin', {
    isUserLogged: req.isAuthenticated(),
    username: req.isAuthenticated() ? req.user.username : null,
  });
});

router.post(
  '/',
  isNotAuthenticated,
  passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/signin',
    failureFlash: true,
  })
);

// make sure user is not authenticated already
function isNotAuthenticated(req, res, next) {
  if (!req.isAuthenticated()) next();
  else res.redirect('/');
}

module.exports = router;
