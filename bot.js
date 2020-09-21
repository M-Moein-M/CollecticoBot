const { Telegraf } = require('telegraf');
const path = require('path');
require('dotenv').config();

const bcrypt = require('bcrypt');

const { usersDatabase } = require('./app.js');

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
    tagFiles(ctx);
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

function tagFiles(ctx) {
  let msg = ctx.update.message.text;

  // for some reason replaceAll threw error
  while (msg.includes('#')) msg = msg.replace('#', '');
  while (msg.includes('\n')) msg = msg.replace('\n', ' ');

  const newTags = msg.split(/[ ,]+/).filter(Boolean); // removes the wite space and extracts the tags
  console.log(newTags);

  // tagging user's untagged files
  const senderId = ctx.update.message.from.id.toString();
  usersDatabase.findOne(
    { _id: generateUserId(senderId) },
    async (err, user) => {
      if (err) return console.log('Error in tagFile()\n', err);
      let tagTable = user.tagTable;
      let existingTags = Object.keys(tagTable);
      let untaggedFiles = user.untaggedFiles;
      for (let tag of newTags) {
        // create new tag is it doesnt exist
        if (!existingTags.includes(tag)) {
          tagTable[tag] = [];
        }

        for (let f of untaggedFiles) {
          tagTable[tag].push(f);
        }
      }

      usersDatabase.update(
        { _id: user._id },
        { $set: { untaggedFiles: [], tagTable: tagTable } },
        {},
        (err) => {
          if (err) {
            console.log('Error in database update TagFile()', err);
          }
        }
      );

      for (let fId of untaggedFiles) {
        const newImg = {
          url: await getFileURL(fId),
          urlUpdateTime: Date.now(),
          fileId: fId,
          fileTags: newTags,
        };
        usersDatabase.update(
          { _id: user._id },
          { $push: { filesInfo: newImg } }
        );
      }
    }
  );
}

async function handleNewFile(ctx) {
  let fileId;
  if (ctx.update.message.photo) {
    fileId = ctx.update.message.photo[0].file_id;
  } else if (ctx.update.message.document) {
    fileId = ctx.update.message.document.file_id;
  }

  console.log('==> ', fileId);

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

const getFileURL = require(path.join(__dirname, 'routes', 'tags')).getFileURL;

module.exports = bot;
