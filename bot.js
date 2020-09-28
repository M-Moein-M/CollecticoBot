const { Telegraf } = require('telegraf');
const path = require('path');

const fetch = require('node-fetch');

const fs = require('fs');
const request = require('request');

require('dotenv').config();

const bcrypt = require('bcrypt');

const { usersDatabase, hostname } = require('./app.js');

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.command('start', (ctx) => {
  const userId = generateUserId(ctx.from.id.toString());
  const verificationCode = userId.substr(userId.length - 6).toLowerCase(); // consider last 6 characters as verification code

  usersDatabase.insert({
    email: null,
    username: null,
    password: null,
    telegramId: ctx.from.username.toLowerCase(),
    filesInfo: [], // stores information about files. Like url, fileId, fileTags
    deletedFilesInfo: [],
    untaggedFiles: [],
    tagTable: {},
    isVerified: false,
    verificationCode: verificationCode,
    _id: userId,
  });

  const replyTxt = `Glad we've you here. Just to get you started, here's your 6 character verification code to enter in the site to sync your Telegram account with the account you registered: ${verificationCode}`;
  ctx.reply(replyTxt);
});

bot.on('message', async (ctx) => {
  // message is a text
  if (Boolean(ctx.update.message.text)) {
    // tagging the untagged files
    console.log('Tags received');

    const userId = generateUserId(ctx.update.message.from.id.toString());
    const msg = ctx.update.message.text;

    if (msg.includes('-')) {
      ctx.reply('Remove dashes in your tags pretty please.');
      return;
    }

    tagUntaggedFiles(msg, userId);
  } else if (Boolean(ctx.update.message.photo)) {
    // message is a photo
    console.log('Adding photo');
    handleNewFile(ctx);
  } else if (Boolean(ctx.update.message.document)) {
    console.log('File received');
    handleNewFile(ctx);
  }
});

bot.launch();

// msg is the tags that user sent
function tagUntaggedFiles(msg, userId, editMode = false) {
  // for some reason replaceAll threw error
  while (msg.includes('#')) msg = msg.replace('#', '');
  while (msg.includes('\n')) msg = msg.replace('\n', ' ');

  const newTags = msg.split(/[ ,]+/).filter(Boolean); // removes the wite space and extracts the tags
  console.log(newTags);

  // tagging user's untagged files

  usersDatabase.findOne({ _id: userId }, async (err, user) => {
    if (err) return console.log('Error in tagFile()\n', err);

    let tagTable = user.tagTable;
    let existingTags = Object.keys(tagTable);

    let untaggedFiles;

    if (editMode) {
      // load the final file to edit(we don't want to edit all the files that are already in untaggedFiles)
      untaggedFiles = [user.untaggedFiles[user.untaggedFiles.length - 1]];
    } else {
      untaggedFiles = user.untaggedFiles;
    }

    if (untaggedFiles.length == 0) {
      console.log("There's no file to tag");
      return;
    }

    for (let tag of newTags) {
      // create new tag is it doesn't exist
      if (!existingTags.includes(tag)) {
        tagTable[tag] = [];
      }

      for (let f of untaggedFiles) {
        tagTable[tag].push(f);
      }
    }

    // make a copy
    untaggedFiles = [...user.untaggedFiles];

    let updatedUntagged = [...user.untaggedFiles];

    if (editMode) updatedUntagged.splice(-1, 1);
    // delete the last element if it's in the edit mode
    else updatedUntagged = []; // clear the untagged files if it's not on edit mode

    usersDatabase.update(
      { _id: user._id },
      { $set: { untaggedFiles: updatedUntagged, tagTable: tagTable } },
      {},
      (err) => {
        if (err) {
          console.log('Error in database update TagFile()', err);
        }
      }
    );

    // if it's edit mode select last element
    if (editMode) untaggedFiles = [untaggedFiles[untaggedFiles.length - 1]];

    for (let fId of untaggedFiles) {
      const newImg = {
        url: getServerDownloadURL(fId),

        fileId: fId,
        fileTags: newTags,
      };
      usersDatabase.update({ _id: user._id }, { $push: { filesInfo: newImg } });
    }
  });
}

async function handleNewFile(ctx) {
  let fileId;
  if (ctx.update.message.photo) {
    fileId = ctx.update.message.photo[0].file_id;
  } else if (ctx.update.message.document) {
    fileId = ctx.update.message.document.file_id;
  }

  // download file to database
  downloadFile(fileId);

  // save newly sent file to untagged files
  const senderId = ctx.update.message.from.id.toString();
  usersDatabase.update(
    { _id: generateUserId(senderId) },
    { $push: { untaggedFiles: fileId } },
    {},
    (err) => {
      if (err)
        return console.log(
          'Error in BOT-on-photo-event update usersDatabase\n',
          err
        );
    }
  );
}

function generateUserId(teleId) {
  return bcrypt.hashSync(teleId, process.env.SALT);
}

async function downloadFile(fileId) {
  const res = await fetch(
    `https://api.telegram.org/bot${process.env.BOT_TOKEN}/getFile?file_id=${fileId}`
  );

  const res2 = await res.json();
  const filePath = res2.result.file_path;
  const downloadURL = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${filePath}`;

  const savingDir = path.resolve(__dirname, 'database', 'files');

  if (!fs.existsSync(savingDir)) {
    fs.mkdirSync(savingDir);
  }

  const savePath = path.join(savingDir, `${fileId}.jpg`);

  download(downloadURL, savePath, () => {
    console.log('Downloaded');
  });
}

function getServerDownloadURL(fileId) {
  return hostname + `download/${fileId}`;
}

// handling downloading file

const download = (url, path, callback) => {
  request.head(url, (err, res, body) => {
    request(url).pipe(fs.createWriteStream(path)).on('close', callback);
  });
};

module.exports = { bot, tagUntaggedFiles };
