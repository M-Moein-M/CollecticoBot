const router = require('express').Router();
const path = require('path');

const { usersDatabase, passport } = require(path.resolve('app.js'));
const { imagesDatabase } = require(path.resolve('bot.js'));

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
router.get('/:imageTags', isAuthenticated, isVerified, (req, res) => {
  const requestedTags = req.params.imageTags.split('-');
  for (let i = 0; i < requestedTags.length; i++)
    if (requestedTags[i] == '') requestedTags.splice(i, 1); // remove '' in array

  if (requestedTags.length == 0) {
    return res.json({ images: [], msg: 'No tags selected' });
  } else {
    const userId = req.user._id;
    const tags = requestedTags;

    usersDatabase.findOne({ _id: userId }, (err, user) => {
      const images = []; // this will be returned to client
      const imagesAdded = [];

      for (let tag of tags) {
        const imgArr = user.tagTable[tag]; // this is the array of fileIds for images with specefic tag

        for (let imgId of imgArr) {
          if (imagesAdded.includes(imgId)) continue;
          else {
            imagesAdded.push(imgId); // save this image as added
            images.push(findImage(user.imagesInfo, imgId));
          }
        }
      }
      return res.json({ images: images });
    });

    // gets the image saved in user.imagesInfo and retrieves the url and image tags
    function findImage(imagesInfo, imgId) {
      let requestedImgID = 0; // ** the index of image in imagesInfo array is the id for that image that gets sent to the client
      for (let img of imagesInfo) {
        if (img.fileId == imgId) {
          return { url: img.url, imageTags: img.imageTags, id: requestedImgID };
        }
        requestedImgID++;
      }
      console.log('No image found');
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

module.exports = router;
