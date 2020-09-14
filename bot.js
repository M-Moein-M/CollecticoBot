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
    console.log('Text received. ', ctx.update.message.text);
  } else if (Boolean(ctx.update.message.photo)) {
    // message is a photo
    console.log('photo event');
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
          console.log(
            'Error in BOT-on-photo-event update usersDatabase\n',
            err
          );
      }
    );
    // save new image to images database
    imagesDatabase.insert(
      { url: downloadURL, tags: '', _id: fileId },
      (err) => {
        if (err)
          console.log(
            'Error in BOT-on-photo-event update imagesDatabase\n',
            err
          );
      }
    );

    // download(downloadURL, path.join(__dirname, 'photos', `${fileId}.jpg`), () =>
    //   console.log('Done!')
    // );
  }
});

bot.launch();

// handling downloading sent image
const fs = require('fs');
const request = require('request');

const download = (url, path, callback) => {
  request.head(url, (err, res, body) => {
    request(url).pipe(fs.createWriteStream(path)).on('close', callback);
  });
};

function generateUserId(teleId) {
  return bcrypt.hashSync(teleId, process.env.SALT);
}

module.exports = bot;
