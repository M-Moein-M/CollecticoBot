const router = require('express').Router();
const path = require('path');
const fetch = require('node-fetch');

const { usersDatabase, passport } = require(path.resolve('app.js'));

// middle ware to check if request has access to some specific file or not(for example can this request delete file or change tags)
const hasAccessToFile = require('./download').hasAccessToFile;

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
// we consider that the received requests will separate the tags with '-', like: -nature-book-school or nature-book-school
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
        const fArr = user.tagTable[tag]; // this is the array of fileIds for files with specific tag

        for (let fId of fArr) {
          if (filesAdded.includes(fId)) continue;
          else {
            filesAdded.push(fId); // save this file as added
            files.push(await findFile(user.filesInfo, fId));
          }
        }
      }
      return res.json({ files: files });
    });

    // gets the file saved in user.filesInfo and retrieves the id(the index of file in array) and file tags
    async function findFile(filesInfo, fId) {
      // ** the index of file in filesInfo array is the id for that file that gets sent to the client
      for (let i = 0; i < filesInfo.length; i++) {
        const f = filesInfo[i];
        if (f.fileId == fId) {
          return { url: f.url, fileTags: f.fileTags, id: i };
        }
      }
      console.log('No file found');
      return null;
    }
  }
});

router.delete(
  '/:fileId',
  isAuthenticated,
  isVerified,
  hasAccessToFile,
  (req, res) => {
    console.log('delete req');

    const fileId = req.params.fileId;

    removeFileFromTagTable(fileId, req.user._id, res);

    // if there's no error in removeFileFromTagTable
    if (!res.headersSent) removeFileFromFilesInfo(fileId, req.user._id, res);
  }
);

// will return 'error' if fileId wasn't found and res object is not provided
// will return 'ok' if file was removed form filesInfo successfully
function removeFileFromFilesInfo(fileId, userId, res) {
  usersDatabase.findOne({ _id: userId }, (err, user) => {
    if (err) {
      console.log(
        'Error in findOne removeFileFromFilesInfo request tags.js\n',
        err
      );
      if (!res) {
        res.status(404).json({ msg: 'Error finding user' });
        return;
      } else {
        return 'error';
      }
    }

    const filesInfo = user.filesInfo;
    for (let i = 0; i < filesInfo.length; i++) {
      if (filesInfo[i].fileId == fileId) {
        filesInfo.splice(i, 1);
        break;
      }
    }

    usersDatabase.update(
      { _id: userId },
      { $set: { filesInfo: filesInfo } },
      {},
      (err) => {
        if (err) {
          console.log(
            'Error updating filesInfo in removeFileFromFilesInfo',
            err
          );
        }
      }
    );
  });
}

// will return 'error' if fileId wasn't found and res object is not provided
// will return 'ok' if file was removed form tagTable successfully
function removeFileFromTagTable(fileId, userId, res = null) {
  usersDatabase.findOne({ _id: userId }, (err, user) => {
    if (err) {
      console.log(
        'Error in findOne removeFileFromTagTable request tags.js\n',
        err
      );
      if (!res) {
        res.status(404).json({ msg: 'Error finding user' });
        return;
      } else {
        return 'error';
      }
    }
    let file = user.filesInfo.filter((f) => f.fileId == fileId);
    if (file.length == 0) {
      // no such file found
      if (!res) {
        res.status(404).json({ msg: 'File not found' });
        return;
      } else {
        return 'error';
      }
    }

    const allTags = file[0].fileTags;
    const userTagTable = user.tagTable;
    for (let i = 0; i < allTags.length; i++) {
      const tag = allTags[i];

      // this index needs to be deleted
      const index = userTagTable[tag].indexOf(fileId);
      userTagTable[tag].splice(index, 1); // remove the fileId from this specific tag

      // if this is a tag with no fileId
      if (userTagTable[tag].length == 0) {
        delete userTagTable[tag];
      }
    }

    usersDatabase.update(
      { _id: userId },
      { $set: { tagTable: userTagTable } },
      {},
      (err) => {
        if (err) {
          console.log('Error updating tagTable in removeFileFromTagTable', err);
        }
      }
    );
  });

  if (!res) {
    res.status(200).json({ msg: 'Error finding user' });
    return;
  } else {
    return 'error';
  }
  return 'ok';
}

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

module.exports = { router };
