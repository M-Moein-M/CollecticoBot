const router = require('express').Router();
const path = require('path');

const accessDeniedCode = 403;

router.get(
  '/:fileId',
  isAuthenticated,
  isVerified,
  HasAccessToFile,
  (req, res) => {
    const filePath = path.resolve(
      __dirname,
      '..',
      'database',
      'images',
      'basicImage.jpg'
    );
    res.sendFile(filePath);
  }
);

function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) next();
  else {
    res
      .status(accessDeniedCode)
      .sendFile(
        path.resolve(__dirname, '..', 'database', 'images', 'notAutherized.jpg')
      );
  }
}

function isVerified(req, res, next) {
  if (req.user.isVerified) {
    next();
  } else {
    res
      .status(accessDeniedCode)
      .sendFile(
        path.resolve(__dirname, '..', 'database', 'images', 'notVerified.jpg')
      );
  }
}

function HasAccessToFile(req, res, next) {
  console.log(req.get('host'));

  const requestedFile = req.params.fileId;

  const filtered = req.user.filesInfo.filter(
    (file) => file.fileId == requestedFile
  );

  if (filtered.length == 0) {
    // no access

    res
      .status(accessDeniedCode)
      .sendFile(
        path.resolve(__dirname, '..', 'database', 'images', 'noFileAccess.jpg')
      );
    next();
  } else {
    // access granted

    res
      .status(accessDeniedCode)
      .sendFile(
        path.resolve(
          __dirname,
          '..',
          'database',
          'images',
          `${requestedFile}.jpg`
        )
      );
    next();
  }
}

module.exports = router;
