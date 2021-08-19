const { GAME_CMDS } = require('../data/commands')
const { PREFIX, MAIN_COLOR } = require('../data/constants')
const { MessageEmbed } = require('discord.js');

const botMess = text => {
  return new MessageEmbed()
    .setColor(MAIN_COLOR)
    .setDescription(text)
}

const memeEmbed = data => {
  return new MessageEmbed()
    .setColor(MAIN_COLOR)
    .setTitle("Random meme")
    .setURL(data.postLink)
    .setAuthor(data.author)
    .setDescription(data.title)
    .setImage(data.url)
    .setTimestamp()
    .setFooter("Credit: D3vd/Meme_Api")
}

const quoteEmbed = data => {
  let title = data.language_code == "de" ? "Zufälliges Zitat" : "Random quote"
  return new MessageEmbed()
    .setColor(MAIN_COLOR)
    .setTitle(title)
    .setURL(data.url)
    .setAuthor(data.originator.name)
    .setDescription(data.content)
    .setTimestamp()
    .setFooter("Credit: rapidapi/martin.svoboda")
}

const gameWelcomeEmbed = (channelName, username, highest, serverName) => {
  return new MessageEmbed()
    .setColor(MAIN_COLOR)
    .setTitle("Play game: 🕴🏻 Mr.Hangman")
    .setAuthor("🕴🏻 is now in channel: " + channelName)
    .setDescription(
      `🪑 The classical hangman game.\nYou can use following commands with syntax \`${PREFIX} <command>\`\n
        You get\n
        1️⃣ point if you guess the letter right.\n
        5️⃣ points if you guess the word right.\n
      `
    )
    .addField(
      `Highest score recorded **${serverName}**`, 
      highest ? `🥇 **${username}**: ${highest} pts` : "Not recorded", 
      true
    )
    .addField('Language', 'German/Deutsch', true)
    .addField('\u200B', '\u200B', false)
    .addField("🎲 Start/quit", "`start`/`quit`", false)
    .addFields(Object.values(GAME_CMDS))
}

const gameHelpEmbed = () => {
  return new MessageEmbed()
    .setColor(MAIN_COLOR)
    .setTitle("🕴🏻 Mr.Hangman understands")
    .setDescription("...these commands, and please include prefix " + PREFIX)
    .addFields({ name: '\u200B', value: '\u200B' }, ...Object.values(GAME_CMDS))
}

const gameMess = (text, lives, guessedLetters) => {
  return new MessageEmbed()
    .setColor(MAIN_COLOR)
    .setTitle("🕴🏻 Guess the word/a possible letter!")
    .setDescription(text)
    .addField("Lives", lives + "❤️", false)
    .addField("Guessed letters", `\`${guessedLetters.map(l => l.toLocaleUpperCase()).join(" ") || "(No letters)"}\``, false)
}

const gameNoti = (text, title = "🕴🏻 Mr.Hangman") => {
  return new MessageEmbed()
    .setColor(MAIN_COLOR)
    .setTitle(title)
    .setDescription(text)
}

module.exports = {
  botMess,
  memeEmbed,
  quoteEmbed,
  gameWelcomeEmbed,
  gameHelpEmbed,
  gameMess,
  gameNoti
}