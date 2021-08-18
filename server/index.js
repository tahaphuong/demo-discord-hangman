require('dotenv').config()
const axios = require('axios')

const { Client, Intents, MessageEmbed } = require('discord.js');

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

const PREFIX = "#h"
const NUM_LIVES = 12
const typeTextChannel = "GUILD_TEXT"

const GAME_STATE = {
  INACTIVE: 0,
  READY: 1,
  STARTED: 2 
}

let textChannels = []
let gameChannel = null
let gameState = GAME_STATE.INACTIVE
let lives = NUM_LIVES

let word = ""
let lcWordArr = []
let riddleArr = []

// TODO: gameChannels -> game can be played in muzltiple channels

client.on('ready', () => {
  console.log('ready on set')

  for (let [channelId, channel] of client.channels.cache) {
    if (channel.type == typeTextChannel)
      textChannels.push(channel)
  }
});

/* ----------------------------------
valid command: PREFIX <command> 
!! Space between PREFIX and <command>
---------------------------------- */

client.on('messageCreate', async message => {

  // return if author is a bot
  if(message.author.bot) return;

  // return if author is the logged in bot
  // if (message.author.id === client.user.id) return

  let ch = message.channel
  let messInTextChannel = textChannels.map(item => item.id).includes(ch.id)

  // return if user's mess not in text channel
  if (!messInTextChannel) return
  

  // filter content and command
  let content = message.content.trim()
  let command = content == PREFIX ?
    PREFIX
    : content.startsWith(PREFIX + " ")
      ? content.split(" ")[1].trim()
      : ""

  // TODO: Set timer, automatically out after 5 minutes inactive
  if (gameState == GAME_STATE.READY && gameChannel && ch.id == gameChannel.id) {
    switch (command) {
      case "help":
        ch.send({ embeds: [gameHelpEmbed()] })
        break
      case "start":
        gameState = GAME_STATE.STARTED
        lives = NUM_LIVES
      	initGame(ch)
        break
      case "cancel": 
        gameState = GAME_STATE.INACTIVE
        gameChannel = null
        ch.send({ embeds: [botMess("🕴🏻 See you next time, bye bye!")] })
        break
      case "hint":
      case "quit":
      case "state":
      case "skip":
        ch.send({ embeds: [botMess("🕴🏻 `This command is only available during gameplay.")] })
        break
      default:
        break
    } 
    return
  } 
  
  // TODO: Set timer, automatically out after 5 minutes inactive
  // TODO: "State" message, show the current state (time, letter guessed)
  if (gameState == GAME_STATE.STARTED && gameChannel && ch.id == gameChannel.id) {
    switch (command) {
      case "help":
        ch.send({ embeds: [gameHelpEmbed()] })
        break
      case "state":
        sendGameState(ch, [])
        break
      case "hint": 
        ch.send({ embeds: [botMess("🕴🏻 Hints are currently not available. But soon, maybe in the next game (?)")] })
        // TODO: show the hint here
        break
      case "quit":
        gameState = GAME_STATE.INACTIVE
        gameChannel = null
        ch.send({ embeds: [botMess("🕴🏻 Thank you for playing with Mr.Hangman!")] })
        // TODO: print the dashboard here
        break
      case "skip":
      	initGame(ch)
        break
      default: 
        // TODO: handle answer from players
        let ans = content.toLocaleLowerCase()
        if (ans.length == 1) {
          if (lcWordArr.includes(ans)) {
            for (let i=0; i<lcWordArr.length; i++) {
              if (lcWordArr[i] == ans) {
                riddleArr[i] = word[i]
              }
            }
            sendGameState(ch, [gameNoti(`You got \`${ans}\` right!`)])
          } else {
            lives -= 1
            sendGameState(ch, [gameNoti(`You have ${lives}❤️ left.`)])
          }
        } else {
          if (ans == lcWordArr.join('')) {
            // TODO: +1 point for user, documented in a dashboard (return dashboard when quit game)
            let congrat = `Yay **${message.author.username}** has guessed it right! \n The word is \`${word}\` ` 
            ch.send({ embeds: [gameNoti(congrat), gameNoti("...is coming back in 5 seconds with another word.")] })
            // TODO: "state" message to update the time
            setTimeout(() => initGame(ch), 5000)
          } else {
            lives -= 1
            sendGameState(ch, [gameNoti(`You have ${lives}❤️ left.`)])
          }
        }
        break
        
    } 
    return
  }

  // return if user's mess is not a command
  if (!command) return
  // return message of the bot
  let mess = null

  switch (command) {
    case PREFIX:
      mess = `🤙 Hi how's going? Use \`${PREFIX} <command>\` to call me. \n Send \`${PREFIX} help\` to see list of commands. 🌿`
      break
    case "reminder":
      mess = "🌼 You are amazing!"
      break
    case "help":
      mess = `
        💫 use to call the bot: \n
        Syntax: ${PREFIX} <command> (space between ${PREFIX} and <command>) \n
        \n
        [only command] 👉🏼  about me. ✌🏼 \n
        help 👉🏼 instruction. 🌵 \n
        meme 👉🏼 random meme. 👶🏼 \n
        quote 👉🏼 random quote in English. 📃 \n
        zitat 👉🏼 random quote in German. 📜 \n
        play 👉🏼 play Mr.Hangman 🕴🏻 \n
      `
      break
    case "meme":
      try {
        let res = await axios("https://meme-api.herokuapp.com/gimme")
        let data = await res.data
        if (!data) throw new Error("Meme is currently unavailable 🥺")
        ch.send({ embeds: [memeEmbed(data)] });
      } catch (err) {
        mess = "🔌 oh no an error occured. \n" + err.message
      }
      break
    case "quote":
    case "zitat":
      try {
        const LG_CODE = command == "zitat" ? "de" : "en"

        let options = {
          method: 'GET',
          url: 'https://quotes15.p.rapidapi.com/quotes/random/',
          params: { language_code: LG_CODE },
          headers: {
            'x-rapidapi-key': process.env.X_RAPIDAPI_KEY,
            'x-rapidapi-host': process.env.X_RAPIDAPI_HOST
          }
        };

        let res = await axios.request(options)
        let data = await res.data
        if (!data) throw new Error("Quote is currently unavailable 🥺")
        ch.send({ embeds: [quoteEmbed(data)] })
      } catch (err) {
        mess = "🔌 oh no an error occured. \n" + err.message
      }
      break
    
    // TODO: games can be played in multiple channels and servers
    case "play":
      if (gameState == GAME_STATE.INACTIVE) {
        gameState = GAME_STATE.READY
        gameChannel = ch
        ch.send({ embeds: [gameWelcomeEmbed(gameChannel.name)] })
      } else {
        let channelName = gameChannel ? `channel \`${gameChannel.name}\`` : "an other channel." // just to make sure no error's gonna occur lol
        mess = "🕴🏻 Mr.Hangman is already in " + channelName
      }
      break
    default:
      mess = `🤔 Did somebody mention me? \n Send \`${PREFIX} help\` to see list of commands. 🌿`
  }

  if (mess) ch.send({ embeds: [botMess(mess)] })
});

const botMess = text => {
  return new MessageEmbed()
    .setColor("#f7daf0")
    .setDescription(text)
}

const memeEmbed = data => {
  return new MessageEmbed()
    .setColor("#f7daf0")
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
    .setColor("#f7daf0")
    .setTitle(title)
    .setURL(data.url)
    .setAuthor(data.originator.name)
    .setDescription(data.content)
    .setTimestamp()
    .setFooter("Credit: rapidapi/martin.svoboda")
}

const gameWelcomeEmbed = channelName => {
  return new MessageEmbed()
    .setColor("#f7daf0")
    .setTitle("Play game: 🕴🏻 Mr.Hangman")
    .setAuthor("🕴🏻 is now in channel: " + channelName)
    .setDescription("🪑 The classical hangman game. You can call the following commands with prefix " + PREFIX)
    .addField('\u200B', '\u200B', false)
    .addField('Language', 'German/Deutsch', false)
    .addField("Start/cancel", "`start`/`cancel`", false)
    .addFields(
      { name: '\u200B', value: '\u200B' },
      { name: "Help", value: "`help`", inline: true },
      { name: "Show hint", value: "`hint`", inline: true },
      { name: "Game state", value: "`state`", inline: true },
      { name: "Skip word", value: "`skip`", inline: true },
      { name: "Quit game", value: "`quit`", inline: true },
    )
}

const gameHelpEmbed = () => {
  return new MessageEmbed()
    .setColor("#f7daf0")
    .setTitle("🕴🏻 Mr.Hangman understands")
    .setDescription("...these commands, please include prefix " + PREFIX)
    .addFields(
      { name: "Help", value: "`help`", inline: true },
      { name: "Show hint", value: "`hint`", inline: true },
      { name: "Game state", value: "`state`", inline: true },
      { name: "Skip word", value: "`skip`", inline: true },
      { name: "Quit game", value: "`quit`", inline: true },
    )
}

const gameMess = text => {
  return new MessageEmbed()
    .setColor("#f7daf0")
    .setTitle("🕴🏻 Guess the word/a possible letter!")
    .setDescription(text)
    .addField("Lives", lives + "❤️", false)
}

const gameNoti = text => {
  return new MessageEmbed()
    .setColor("#f7daf0")
    .setTitle("🕴🏻 Mr.Hangman")
    .setDescription(text)
}

function sendGameState(ch, otherMess) {
  if (!Array.isArray(otherMess)) otherMess = []
  ch.send({ embeds: [...otherMess, gameMess(`\`${riddleArr.join('')}\` (${word.length} letters)`)] })
}

function initGame(ch) {
  let list = require('./data') // list of our words
  let rd = Math.floor(Math.random() * list.length)
  word = list[rd]
  console.log(word, rd)

  lcWordArr = word.toLocaleLowerCase().split('')
  riddleArr = []
  for (let i=0; i<word.length; i++) {
    riddleArr.push("-")
  }
  sendGameState(ch, [])
}

// Code from https://stackoverflow.com/questions/48598773/shuffle-letters-in-word-javascript
function shuffelWord(word) {
  word = word.split('');

  //Remove the first and the last letter
  let first = word.shift();
  let last = word.pop();

  //Shuffle the remaining letters
  for (let i = word.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [word[i], word[j]] = [word[j], word[i]];
  }

  //Append and return
  return first + word.join("") + last;
}


client.login(process.env.BOT_TOKEN)