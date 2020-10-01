const router = require('express').Router();
const formidable = require('formidable');
const path = require('path');
const fs = require('fs');

const { usersDatabase } = require(path.resolve('app.js'));

const tagUntaggedFiles = require(path.resolve('bot.js')).tagUntaggedFiles;

router.get('/', isAuthenticated, isVerified, (req, res) => {
  res.render('upload', {
    isUserLogged: req.isAuthenticated(),
    username: req.isAuthenticated() ? req.user.username : null,
    isVerified: req.isAuthenticated() ? req.user.isVerified : false,
  });
});

router.post('/', isAuthenticated, isVerified, (req, res) => {
  new formidable.IncomingForm()
    .parse(req)
    .on('field', (name, value) => {
      tagUntaggedFiles(value, req.user._id);
    })

    .on('error', (err) => {
      console.error('Error in /upload', err);
    })
    .on('fileBegin', (name, file) => {
      if (!file.name.endsWith('.jpg')) {
        console.log('Uploaded file extension does not match');
      } else {
        const fileDir = path.resolve(__dirname, '..', 'database', 'files');

        const files = fs.readdirSync(fileDir);

        const fileId = Math.floor(Math.random() * 10000000).toString(16);
        let fileName = `${fileId}.jpg`;

        // add new fileId to untaggedFiles
        usersDatabase.update(
          { _id: req.user._id },
          { $push: { untaggedFiles: fileId } }
        );

        while (files.includes(fileName)) {
          // if the random name already exists, it'll random again
          fileName = `${Math.floor(Math.random() * 10000000).toString(16)}.jpg`;
        }

        file.path = path.join(fileDir, fileName);
        console.log('Saved uploaded file');

        if (!res.headersSent) res.redirect('/tags');
      }
    });

  if (!res.headersSent) res.redirect('/tags');
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
