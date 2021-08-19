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
  STARTED: 2,
  PAUSED: 3
}

const POINT_LETTER = 1
const POINT_WORD = 5

let textChannels = []
let gameChannel = null
let gameState = GAME_STATE.INACTIVE
let players = {}

let lives = NUM_LIVES

let word = ""
let lcWordArr = []
let riddleArr = []
let guessedLetters = []

// TODO: gameChannels -> game can be played in multiple channels and servers

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

  // author - player
  let author = message.author

  // return if author is a bot
  if (author.bot) return;

  // return if author is the logged in bot
  if (author.id === client.user.id) return

  let ch = message.channel
  let messInTextChannel = textChannels.map(item => item.id).includes(ch.id)

  // return if user's mess not in text channel
  if (!messInTextChannel) return

  // filter content and command
  let content = message.content.trim()
  let command = content == PREFIX ?
    PREFIX
    : content.startsWith(PREFIX + " ")
      ? content.split(PREFIX)[1].trim()
      : ""

  if (gameState != GAME_STATE.INACTIVE && gameChannel && ch.id == gameChannel.id) {

    switch (command) {
      case "help":
        ch.send({ embeds: [gameHelpEmbed()] })
        return
      case "join":
        if (players[author.id]) {
          ch.send({ embeds: [gameNoti(`**${author.username}** is already in the list.`)] })
        } else {
          players[author.id] = { point: 0, author: author }
          ch.send({ embeds: [gameNoti(`**${author.username}** is added to the list.`)] })
        }
        return
      case "out":
        if (players[author.id]) {
          delete players[author.id]
          ch.send({ embeds: [gameNoti(`**${author.username}** is deleted from the list.`)] })
          if (!Object.values(players).length) {
            endGame()
            ch.send({ embeds: [botMess("Game is over because there's no one left in the game! 🕴🏻 Thank you for playing with Mr.Hangman!")] })
          }
        } else {
          ch.send({ embeds: [gameNoti(`**${author.username}** is not yet in the list. \`join\` to join the game`)] })
        }
        return
      case "rank":
        showRanking(ch)
        return
      case "quit":
        if (Object.values(players).length) showRanking(ch)
        endGame()
        ch.send({ embeds: [botMess("Game over! 🕴🏻 Thank you for playing with Mr.Hangman!")] })
        return
      default:
        break
    }

    if (!players[author.id]) return

    if (gameState == GAME_STATE.PAUSED) {
      if (!command) return

      if (command == "pause") {
        gameState = GAME_STATE.STARTED
        sendGameState(ch, [gameNoti("🕴🏻 Back to game.")])
      }
      return
    }

    // !TODO: Set timer, automatically out after 5 minutes inactive
    if (gameState == GAME_STATE.READY) {
      if (!command) return

      switch (command) {
        case "start":
          gameState = GAME_STATE.STARTED
          initGame(ch)
          break
        case "cancel":
          endGame()
          ch.send({ embeds: [botMess("🕴🏻 See you next time, bye bye!")] })
          break
        case "hint":
        case "quit":
        case "state":
        case "skip":
        case "pause":
          ch.send({ embeds: [botMess(`🕴🏻 This command is only available during gameplay. \`${PREFIX} start\` to start game.`)] })
          break
        default:
          ch.send({ embeds: [botMess(`🕴🏻 Unavailabe command (in game channel). \`${PREFIX} start\` to start game.`)] })
          break
      }
      return
    }

    // TODO: "State" message, show the current state (time, letter guessed)
    if (gameState == GAME_STATE.STARTED) {
      switch (command) {
        case "state":
          sendGameState(ch, [])
          break
        case "hint":
          ch.send({ embeds: [botMess("🕴🏻 Hints are currently not available. But soon, maybe in the next game (?)")] })
          // TODO: show the hint here
          break
        case "skip":
          initGame(ch)
          break
        case "pause":
          gameState = GAME_STATE.PAUSED
          ch.send({ embeds: [gameNoti("Game paused.")] })
          break
        default:
          if (command) {
            ch.send({ embeds: [botMess("🕴🏻 This command is not available during gameplay.")] })
            return
          }

          // handle answer
          let ans = content.toLocaleLowerCase()
          
          // answer has 1 letter -> letter-guess
          if (ans.length == 1) {

            if (guessedLetters.includes(ans) && lcWordArr.includes(ans)) {
              ch.send({ embeds: [gameNoti(`**${ans.toLocaleUpperCase()}** is already guessed`)] })
              return
            }

            if (!guessedLetters.includes(ans)) {
              guessedLetters.push(ans)
            }
            if (lcWordArr.includes(ans)) {
              for (let i = 0; i < lcWordArr.length; i++) {
                if (lcWordArr[i] == ans) {
                  riddleArr[i] = word[i]
                }
              }
              players[author.id].point += POINT_LETTER
              sendGameState(ch, [gameNoti(`${author.username} got \`${ans}\` right and has 1 more point! `)])

              if (!riddleArr.includes("-")) {
                let notiText = `Yay **${author.username}** has guessed the last letter right and 1 more point! \n The word is \`${word}\``
                restartGame(ch, notiText)
              }
            } else {
              handleWrongAnswer(ch)
            }
          } else { // answer has multiple letters -> word-guess
            if (ans == lcWordArr.join('')) {
              players[author.id].point += POINT_WORD
              let notiText = `Yay **${message.author.username}** has guessed it right! \n The word is \`${word}\``
              restartGame(ch, notiText)
            } else {
              handleWrongAnswer(ch)
            }
          } 
          break
      }
      return
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
        💫 to call the bot: \n
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

    case "play":
      if (gameState == GAME_STATE.INACTIVE) {
        gameState = GAME_STATE.READY
        gameChannel = ch
        players[author.id] = { point: 0, author: author }
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

const gameCommands = [
  { name: '\u200B', value: '\u200B' },

  { name: "Help", value: "`help`", inline: true },
  { name: "Show hint", value: "`hint`", inline: true },
  { name: "Game state", value: "`state`", inline: true },

  { name: "Join game", value: "`join`", inline: true },
  { name: "Out game", value: "`out`", inline: true },
  { name: "Show players/ranking", value: "`rank`", inline: true },

  { name: "Toggle pause", value: "`pause`", inline: true },
  { name: "Skip word", value: "`skip`", inline: true },
  { name: "Quit game", value: "`quit`", inline: true },
]

const gameWelcomeEmbed = channelName => {
  return new MessageEmbed()
    .setColor("#f7daf0")
    .setTitle("Play game: 🕴🏻 Mr.Hangman")
    .setAuthor("🕴🏻 is now in channel: " + channelName)
    .setDescription(
      `🪑 The classical hangman game. You can call the following commands with prefix ${PREFIX}.\n
        You get\n
        1️⃣ point if you guess the letter right.\n
        5️⃣ points if you guess the word right.\n
      `
    )
    .addField('\u200B', '\u200B', false)
    .addField('Language', 'German/Deutsch', false)
    .addField("Start/cancel", "`start`/`cancel`", false)
    .addFields(gameCommands)
}

const gameHelpEmbed = () => {
  return new MessageEmbed()
    .setColor("#f7daf0")
    .setTitle("🕴🏻 Mr.Hangman understands")
    .setDescription("...these commands, please include prefix " + PREFIX)
    .addFields(gameCommands)
}

const gameMess = text => {
  return new MessageEmbed()
    .setColor("#f7daf0")
    .setTitle("🕴🏻 Guess the word/a possible letter!")
    .setDescription(text)
    .addField("Lives", lives + "❤️", false)
    .addField("Guessed letters", guessedLetters.map(l => l.toLocaleUpperCase()).join(" ") || "(No letters)", false)
}

const gameNoti = (text, title = "🕴🏻 Mr.Hangman") => {
  return new MessageEmbed()
    .setColor("#f7daf0")
    .setTitle(title)
    .setDescription(text)
}

function resetGame() {
  lives = NUM_LIVES
  word = ""
  lcWordArr = []
  riddleArr = []
  guessedLetters = []
}

function endGame() {
  players = {}
  gameChannel = null
  gameState = GAME_STATE.INACTIVE

  resetGame()
}

function restartGame(ch, notiText) {
  gameState = GAME_STATE.PAUSED
  resetGame()
  ch.send({ embeds: [gameNoti(notiText), gameNoti("...is coming back in 10 seconds with another word.")] })
  // TODO: "state" message to update the time
  setTimeout(() => initGame(ch), 10000)
}

function sendGameState(ch, otherMess) {
  if (!Array.isArray(otherMess)) otherMess = []
  let hangState = require('./hang')
  ch.send({
    embeds: [
      ...otherMess,
      gameMess(`
      \`${hangState[lives]}\`\n
      \`${riddleArr.join('')}\` (${word.length} letters)`)]
  })
}

function initGame(ch) {
  gameState = GAME_STATE.STARTED
  resetGame()
  lives = NUM_LIVES
  let list = require('./data') // list of our words
  let rd = Math.floor(Math.random() * list.length)
  word = list[rd]
  console.log(word, rd)

  lcWordArr = word.toLocaleLowerCase().split('')
  riddleArr = []
  for (let i = 0; i < word.length; i++) {
    riddleArr.push("-")
  }
  sendGameState(ch, [])
}

function handleWrongAnswer(ch) {
  lives -= 1
  let notiText = `You have ${lives}❤️ left.`
  sendGameState(ch, [gameNoti(notiText)])
  if (lives <= 0) {
    notiText = `Out of lives, game over! \n The word is **${word}**`
    restartGame(ch, notiText)
  }
}

function showRanking(ch) {
  let ranking = Object.values(players).sort((a, b) => b.point - a.point)
  let rankingBoard = ranking.length ? "" : "😳 Hmmm it seems like no one is here."

  for (let i = 0; i < ranking.length; i++) {
    let t = `**${ranking[i].author.username}**: ${ranking[i].point} pt(s) \n`
    if (i == 0) {
      rankingBoard += "🥇 " + t
    } else if (i == 1) {
      rankingBoard += "🥈 " + t
    } else if (i == 2) {
      rankingBoard += "🥉 " + t
    } else {
      rankingBoard += `${i + 1} + ${t}`
    }
  }

  ch.send({ embeds: [gameNoti(rankingBoard, "🕴🏻 Mr.Hangman Ranking")] })
}

// Code from https://stackoverflow.com/questions/48598773/shuffle-letters-in-word-javascript

// TODO: make game word scramble
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