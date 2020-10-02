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
  const form = formidable({ multiples: true });

  form.parse(req, (err, fields, files) => {
    if (err) {
      console.log('Error in post upload\n', err);
      res.redirect('/tags');
      return;
    }

    // extract uploaded file
    const file = files.uploadFile;

    if (!file.type !== 'image/jpeg') {
      console.log('Uploaded file extension does not match');
      tagUntaggedFiles(fields.filesTags, req.user._id);
    } else {
      const fileDir = path.resolve(__dirname, '..', 'database', 'files');

      const files = fs.readdirSync(fileDir);

      const fileId = Math.floor(Math.random() * 10000000).toString(16);
      let fileName = `${fileId}.jpg`;

      // add new fileId to untaggedFiles
      usersDatabase.update(
        { _id: req.user._id },
        { $push: { untaggedFiles: fileId } },
        {},
        (err) => {
          if (err) console.log(err);

          tagUntaggedFiles(fields.filesTags, req.user._id);
        }
      );

      while (files.includes(fileName)) {
        // if the random name already exists, it'll random again
        fileName = `${Math.floor(Math.random() * 10000000).toString(16)}.jpg`;
      }

      file.path = path.join(fileDir, fileName);
      console.log('Saved uploaded file');
    }

    res.redirect('/tags');
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
