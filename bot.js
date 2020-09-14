const { Telegraf } = require('telegraf');
require('dotenv').config();
const path = require('path');
const fetch = require('node-fetch');
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
    tagTable: [],
    isVerified: false,
    verificationCode: verificationCode,
    _id: userId,
  });

  const replyTxt = `Glad we've you here. Just to get you started, here's your 6 character verification code to enter in the site to sync your Telegram accout with the account you registered: ${verificationCode}`;
  ctx.reply(replyTxt);
});

bot.on('photo', async (doc) => {
  const fileId = doc.update.message.photo[0].file_id;

  const res = await fetch(
    `https://api.telegram.org/bot${process.env.BOT_TOKEN}/getFile?file_id=${fileId}`
  );
  const res2 = await res.json();
  const filePath = res2.result.file_path;

  const downloadURL = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${filePath}`;
  download(downloadURL, path.join(__dirname, 'photos', `${fileId}.jpg`), () =>
    console.log('Done!')
  );
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
