const router = require('express').Router();
const path = require('path');
const fs = require('fs');

const accessDeniedCode = 403;

router.get(
  '/:fileId',
  isAuthenticated,
  isVerified,
  hasAccessToFile,
  (req, res) => {
    const filePath = path.resolve(
      __dirname,
      '..',
      'database',
      'files',
      `${req.params.fileId}.jpg`
    );

    const s = fs.createReadStream(filePath);
    s.on('open', () => {
      res.set('Content-Type', 'image/jpeg');
      s.pipe(res);
    });
    s.on('error', () => {
      console.log('Error at streaming files');
    });
  }
);

function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) next();
  else {
    res
      .status(accessDeniedCode)
      .sendFile(
        path.resolve(__dirname, '..', 'database', 'files', 'notAuthorized.jpg')
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

// middle ware to check if request has access to some specific file or not(for example can this request delete file or change tags)
// fileId will be received with url parameters
function hasAccessToFile(req, res, next) {
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

    return;
  } else {
    // access granted
    next();
  }
}

module.exports = { router, hasAccessToFile };
