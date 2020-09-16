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

    res.render('tags', { tags, jsFile: 'tagsjs.js' });
  });
});

// get the url of files
// we consider that the received requests will seperate the tags with '-', like: -nature-book-school or nature-book-school
router.get('/:imageTags', isAuthenticated, isVerified, async (req, res) => {
  const requestedTags = req.params.imageTags.split('-');
  for (let i = 0; i < requestedTags.length; i++)
    if (requestedTags[i] == '') requestedTags.splice(i, 1); // remove '' in array

  console.log(requestedTags);

  const images = getImages(requestedTags, req.user._id, res);
  console.log('images:\n', images);
});

function getImages(tags, userId, res) {
  usersDatabase.findOne({ _id: userId }, async (err, user) => {
    images = [];
    for (let tag of tags) {
      const imgArr = user.tagTable[tag];
      console.log(imgArr);
      await insertNewImages(imgArr, res);
    }
  });

  async function insertNewImages(imgArr, res) {
    let images = [];
    let imagesAdded = [];
    // ???????????????
    for (let imgId of imgArr) {
      if (imagesAdded.includes(imgId)) continue;
      else {
        await imagesDatabase.findOne({ _id: imgId }, (err, imageFound) => {
          if (err) return console.log('Error in insertNewImages\n', err);

          const newImg = { url: imageFound.url, tags: imageFound.tags };

          images.push(newImg);
          imagesAdded.push(imgId);

          console.log('pushed', imgId);
        });
      }
    }
    console.log(imagesAdded);
    console.log(images);
    res.json({ images: images });
  }
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

module.exports = router;
