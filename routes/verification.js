const express = require('express');
const router = express.Router();
const flash = require('express-flash');

const { usersDatabase } = require('../app.js');

router.get('/', isAuthenticated, isNotVerified, (req, res) => {
  res.render('verification', {
    isUserLogged: req.isAuthenticated(),
    username: req.isAuthenticated() ? req.user.username : null,
  });
});

router.post('/', isAuthenticated, isNotVerified, (req, res) => {
  const teleId = req.body.telegramId.toLowerCase();
  const verificationCode = req.body.verificationCode;

  // looking for someone with teleId that isn't verified already
  usersDatabase.findOne({ telegramId: teleId }, (err, user) => {
    if (err) {
      console.log('Error in post /verification');
      console.log(err);
      return;
    }

    if (user == null) {
      req.flash('appMsgError', "This ID did not contact 'Collectico' yet");
      res.redirect('/verification');
      return;
    }

    if (user.isVerified) {
      req.flash('appMsgError', 'This user is already verified');
      res.redirect('/verification');
      return;
    }

    if (user.verificationCode == verificationCode) {
      // update user
      usersDatabase.update(
        { _id: user._id },
        {
          $set: {
            email: req.user.email,
            username: req.user.username,
            password: req.user.password,
            isVerified: true,
          },
        },
        {},
        (err, numUpd) => {
          if (err) {
            console.log(err);
            return;
          }
        }
      );
      usersDatabase.remove({ _id: req.user._id }, {}, (err, numRemove) => {
        if (err) console.log(err);
      });
      loginMergedUser(req, res, user._id);

      console.log('user verified and updated');
    } else {
      req.flash('appMsgError', 'Entered code does not match');
      res.redirect('/verification');
      return;
    }
  });
});

function isNotVerified(req, res, next) {
  if (!req.user.isVerified) return next();
  res.redirect('/');
}

function loginMergedUser(req, res, id) {
  usersDatabase.findOne({ _id: id }, (err, user) => {
    if (err) {
      console.log(err);
      return;
    }
    req.logout();
    req.login(user, (err) => {
      if (err) {
        console.log(err);
        return;
      }
      res.redirect('/');
      return;
    });
  });
}

function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) next();
  else {
    req.flash('error', 'You need to log-in to verify your account');
    res.redirect('/signin');
  }
}

module.exports = router;
