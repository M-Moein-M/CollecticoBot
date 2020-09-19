const { Telegraf } = require('telegraf');
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
    imagesInfo: [], // stores information about images. Like url, fileId, imageTags
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
  usersDatabase.findOne(
    { _id: generateUserId(senderId) },
    async (err, user) => {
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

      for (let imgId of untaggedImages) {
        const newImg = { fileId: imgId, imageTags: newTags };
        usersDatabase.update(
          { _id: user._id },
          { $push: { imagesInfo: newImg } }
        );
      }
    }
  );
}

async function handleNewPhoto(ctx) {
  const fileId = ctx.update.message.photo[0].file_id;

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
}

function generateUserId(teleId) {
  return bcrypt.hashSync(teleId, process.env.SALT);
}

module.exports = bot;
