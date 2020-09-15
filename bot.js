const { Telegraf } = require('telegraf');
require('dotenv').config();
const path = require('path');
const fetch = require('node-fetch');
const bcrypt = require('bcrypt');
const Datastore = require('nedb');

const { usersDatabase } = require('./app.js');

const imagesDatabase = new Datastore({
  filename: path.join(__dirname, 'database', 'images-databse.db'),
  autoload: true,
});

const bot = new Telegraf(process.env.BOT_TOKEN);
bot.command('start', (ctx) => {
  const userId = generateUserId(ctx.from.id.toString());
  const verificationCode = userId.substr(userId.length - 6).toLowerCase(); // consider last 6 characters as verification code

  usersDatabase.insert({
    email: null,
    username: null,
    password: null,
    telegramId: ctx.from.username.toLowerCase(),
    untaggedImages: [],
    tagTable: {},
    isVerified: false,
    verificationCode: verificationCode,
    _id: userId,
  });

  const replyTxt = `Glad we've you here. Just to get you started, here's your 6 character verification code to enter in the site to sync your Telegram accout with the account you registered: ${verificationCode}`;
  ctx.reply(replyTxt);
});

bot.on('message', async (ctx) => {
  // message is a text
  if (Boolean(ctx.update.message.text)) {
    // tagging the untagged images
    console.log('tags received');
    tagImages(ctx);
  } else if (Boolean(ctx.update.message.photo)) {
    // message is a photo
    console.log('adding photo');
    handleNewPhoto(ctx);
  }
});

bot.launch();

function tagImages(ctx) {
  let msg = ctx.update.message.text;

  // for some reason replaceAll threw error
  while (msg.includes('#')) msg = msg.replace('#', '');
  while (msg.includes('\n')) msg = msg.replace('\n', ' ');

  const newTags = msg.split(/[ ,]+/).filter(Boolean); // removes the wite space and extracts the tags
  console.log(newTags);

  // tagging user's untagged images
  const senderId = ctx.update.message.from.id.toString();
  usersDatabase.findOne({ _id: generateUserId(senderId) }, (err, user) => {
    if (err) return console.log('Error in tagImage()\n', err);
    let tagTable = user.tagTable;
    let existingTags = Object.keys(tagTable);
    let untaggedImages = user.untaggedImages;
    for (let tag of newTags) {
      // create new tag is it doesnt exist
      if (!existingTags.includes(tag)) {
        tagTable[tag] = [];
      }

      for (let img of untaggedImages) {
        tagTable[tag].push(img);
      }
    }

    usersDatabase.update(
      { _id: user._id },
      { $set: { untaggedImages: [], tagTable: tagTable } },
      {},
      (err) => {
        if (err) {
          console.log('Error in database update TageImage()', err);
        }
      }
    );

    for (let img of untaggedImages) {
      imagesDatabase.update(
        { _id: img },
        { $set: { tags: newTags } },
        {},
        (err) => {
          if (err) {
            console.log('Error in image tag update TageImage()', err);
          }
        }
      );
    }
  });
}

async function handleNewPhoto(ctx) {
  const fileId = ctx.update.message.photo[0].file_id;

  const res = await fetch(
    `https://api.telegram.org/bot${process.env.BOT_TOKEN}/getFile?file_id=${fileId}`
  );

  const res2 = await res.json();
  const filePath = res2.result.file_path;

  const downloadURL = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${filePath}`;

  // save newly sent image to untagged images
  const senderId = ctx.update.message.from.id.toString();
  usersDatabase.update(
    { _id: generateUserId(senderId) },
    { $push: { untaggedImages: fileId } },
    {},
    (err) => {
      if (err)
        return console.log(
          'Error in BOT-on-photo-event update usersDatabase\n',
          err
        );
    }
  );
  // save new image to images database
  imagesDatabase.insert({ url: downloadURL, tags: [], _id: fileId }, (err) => {
    if (err)
      console.log('Error in BOT-on-photo-event update imagesDatabase\n', err);
  });

  // download(downloadURL, path.join(__dirname, 'photos', `${fileId}.jpg`), () =>
  //   console.log('Done!')
  // );
}

function generateUserId(teleId) {
  return bcrypt.hashSync(teleId, process.env.SALT);
}

// handling downloading sent image
const fs = require('fs');
const request = require('request');

const download = (url, path, callback) => {
  request.head(url, (err, res, body) => {
    request(url).pipe(fs.createWriteStream(path)).on('close', callback);
  });
};

module.exports = bot;
