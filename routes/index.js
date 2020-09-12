const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('index', {
    isUserLogged: req.isAuthenticated(),
    username: req.isAuthenticated() ? req.user.username : null,
  });
});

module.exports = router;
