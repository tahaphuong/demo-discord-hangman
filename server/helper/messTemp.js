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
  let title = data.language_code == "de" ? "ZufΓ€lliges Zitat" : "Random quote"
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
    .setTitle("Play game: π΄π» Mr.Hangman")
    .setAuthor("π΄π» is now in channel: " + channelName)
    .setDescription(
      `πͺ The classical hangman game. Now available in German/Deutsch. \n
      Correct letter π 1 pt
      Correct word π 1 pt for each hidden letters + 2 pts reward π\n
      You can use following commands with syntax \`${PREFIX} <command>\`\n\n`
    )
    .addField("π² Start/quit", "`start`/`quit`", false)
    .addFields(Object.values(GAME_CMDS))
    .addField(
      `Highest score recorded **${serverName}**`, 
      highest ? `π₯ **${username}**: ${highest} pts` : "Not recorded", 
      true
    )
}

const gameHelpEmbed = () => {
  return new MessageEmbed()
    .setColor(MAIN_COLOR)
    .setTitle("π΄π» Mr.Hangman understands")
    .setDescription("...these commands, and please include prefix " + PREFIX)
    .addFields({ name: '\u200B', value: '\u200B' }, ...Object.values(GAME_CMDS))
}

const gameMess = (text, lives, guessedLetters, skipTurns, hintTurns) => {
  return new MessageEmbed()
    .setColor(MAIN_COLOR)
    .setTitle("π΄π» Guess the word/a letter!")
    .setDescription(text)
    .addField("Lives", lives + " β€οΈ", true)
    .addField("Skips", skipTurns + " β­", true)
    .addField("Hints", hintTurns + " π‘", true)
    .addField("Guessed letters", `\`${guessedLetters.map(l => l.toLocaleUpperCase()).join(" ") || "(No letters)"}\``, false)
}

const gameNoti = (text, title = "π΄π» Mr.Hangman") => {
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