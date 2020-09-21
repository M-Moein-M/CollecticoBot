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
      'files',
      `${req.params.fileId}.jpg`
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
        path.resolve(__dirname, '..', 'database', 'files', 'notAutherized.jpg')
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
        path.resolve(__dirname, '..', 'database', 'files', 'notVerified.jpg')
      );
  }
}

function HasAccessToFile(req, res, next) {
  const requestedFile = req.params.fileId;

  const filtered = req.user.filesInfo.filter(
    (file) => file.fileId == requestedFile
  );

  if (filtered.length == 0) {
    // no access

    res
      .status(accessDeniedCode)
      .sendFile(
        path.resolve(__dirname, '..', 'database', 'files', 'noFileAccess.jpg')
      );
    next();
  } else {
    // access granted

    res.sendFile(
      path.resolve(__dirname, '..', 'database', 'files', `${requestedFile}.jpg`)
    );
    next();
  }
}

module.exports = router;
