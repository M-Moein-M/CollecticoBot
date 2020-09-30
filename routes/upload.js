const router = require('express').Router();
const formidable = require('formidable');
const path = require('path');
const fs = require('fs');

router.get('/', isAuthenticated, isVerified, (req, res) => {
  res.render('upload', {
    isUserLogged: req.isAuthenticated(),
    username: req.isAuthenticated() ? req.user.username : null,
    isVerified: req.isAuthenticated() ? req.user.isVerified : false,
  });
});

router.post('/', (req, res) => {
  new formidable.IncomingForm()
    .parse(req)
    .on('field', (name, field) => {
      console.log('Field', name, field);
    })

    .on('error', (err) => {
      console.error('Error in /upload', err);
    })
    .on('fileBegin', (name, file) => {
      if (!file.name.endsWith('.jpg')) {
        res.status(400).json({ msg: 'File extension should be jpg' });
      } else {
        const fileDir = path.resolve(__dirname, '..', 'database', 'files');

        const files = fs.readdirSync(fileDir);

        let fileName = `${Math.floor(Math.random() * 10000000).toString(
          16
        )}.jpg`;

        while (files.includes(fileName)) {
          // if the random name already exists, it'll random again
          fileName = `${Math.floor(Math.random() * 10000000).toString(16)}.jpg`;
        }

        file.path = path.join(fileDir, fileName);
        console.log('Saved uploaded file');
      }
    })
    .on('end', () => {
      res.redirect('/');
    });
});

function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) next();
  else {
    // access denied
    res.status(401).redirect('/');
  }
}

function isVerified(req, res, next) {
  if (req.user.isVerified) {
    next();
  } else {
    // access denied
    res.status(401).redirect('/');
  }
}

module.exports = { router };
