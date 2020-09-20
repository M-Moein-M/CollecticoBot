const router = require('express').Router();
const path = require('path');
const fetch = require('node-fetch');

const { usersDatabase, passport } = require(path.resolve('app.js'));

router.get('/', isAuthenticated, isVerified, (req, res) => {
  usersDatabase.findOne({ _id: req.user._id }, (err, user) => {
    if (err) {
      console.log('Error in get tags.js\n', err);
      res.redirect('/');
    }
    const tags = Object.keys(user.tagTable);
    const sortedTags = tags.sort();

    res.render('tags', {
      tags: sortedTags,
      jsFile: 'tagsjs.js',
      isUserLogged: req.isAuthenticated(),
      username: req.isAuthenticated() ? req.user.username : null,
      isVerified: req.isAuthenticated() ? req.user.isVerified : false,
    });
  });
});

// get the url of files
// we consider that the received requests will seperate the tags with '-', like: -nature-book-school or nature-book-school
router.get('/:fileTags', isAuthenticated, isVerified, (req, res) => {
  const requestedTags = req.params.fileTags.split('-');
  for (let i = 0; i < requestedTags.length; i++)
    if (requestedTags[i] == '') requestedTags.splice(i, 1); // remove '' in array

  if (requestedTags.length == 0) {
    return res.json({ files: [], msg: 'No tags selected' });
  } else {
    const userId = req.user._id;
    const tags = requestedTags;

    usersDatabase.findOne({ _id: userId }, async (err, user) => {
      if (err) console.log('Error in findOne callback\n', err);
      const files = []; // this will be returned to client
      const filesAdded = [];

      for (let tag of tags) {
        const fArr = user.tagTable[tag]; // this is the array of fileIds for files with specefic tag

        for (let fId of fArr) {
          if (filesAdded.includes(fId)) continue;
          else {
            filesAdded.push(fId); // save this file as added
            files.push(await findFile(user.filesInfo, fId, user._id));
          }
        }
      }
      return res.json({ files: files });
    });

    // gets the file saved in user.filesInfo and retrieves the id(the index of file in array) and file tags
    async function findFile(filesInfo, fId, userId) {
      // ** the index of file in filesInfo array is the id for that file that gets sent to the client
      for (let i = 0; i < filesInfo.length; i++) {
        const f = filesInfo[i];
        if (f.fileId == fId) {
          // it is guaranteed by Telegram that the link will be valid for at least 1 hour

          if (f.urlUpdatTime + 60 * 60 * 1000 <= Date.now()) {
            // fetch new url
            const url = await getFileURL(fId);

            // updating 'urlUpdatTime'

            filesInfo[i].urlUpdatTime = Date.now();

            usersDatabase.update(
              { _id: userId },
              { $set: { filesInfo: filesInfo } },
              {},
              (err) => {
                if (err) {
                  console.log('Error in updating urlUpdateTime', err);
                }
              }
            );

            return { url: url, fileTags: f.fileTags, id: i };
          } else {
            const url = f.url;

            return { url: url, fileTags: f.fileTags, id: i };
          }
        }
      }
      console.log('No file found');
      return null;
    }
  }
});

function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) next();
  else {
    req.flash('error', 'You need to log-in to see your tags');
    res.redirect('/signin');
  }
}

function isVerified(req, res, next) {
  if (req.user.isVerified) {
    next();
  } else {
    req.redirect('verification');
  }
}

async function getFileURL(fileId) {
  const res = await fetch(
    `https://api.telegram.org/bot${process.env.BOT_TOKEN}/getFile?file_id=${fileId}`
  );

  const res2 = await res.json();
  const filePath = res2.result.file_path;
  return `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${filePath}`;
}

module.exports = { router, getFileURL };
