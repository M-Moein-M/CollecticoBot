const { Telegraf } = require('telegraf');
require('dotenv').config();
const path = require('path');
const fetch = require('node-fetch');

const bot = new Telegraf(process.env.BOT_TOKEN);
bot.command('start', (ctx) => ctx.reply('About the bot: ....'));

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

module.exports = bot;
