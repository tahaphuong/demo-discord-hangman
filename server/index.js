require('dotenv').config()
const axios = require('axios')
const path = require('path')
const fs = require('fs')

const { Client, Intents } = require('discord.js')
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] })

// TODO: Create DMChannel and return message HELLO_DM
const {
  PREFIX,
  TYPE_TEXT_CHANNEL,
  GAME_STATE,
  NUM_LIVES,
  POINT_LETTER,
  POINT_WORD,
  SKIPS,
  HINTS,
  HIDDEN_LETTER,
  WAIT_TIME,
  INACTIVE_TIME,
  GUESS_TIME,
  HELLO_DM,
} = require('./data/constants')

const { MAIN_CMDS } = require('./data/commands')
const {
  botMess,
  memeEmbed,
  quoteEmbed,
  gameWelcomeEmbed,
  gameHelpEmbed,
  gameMess,
  gameNoti
} = require('./helper/messTemp')

const LIST_WORDS = require('./data/words') // list of our words
let HANG_STATE = require('./data/hang')

const dbLink = path.join(__dirname, 'data/data.json')
let records = null
async function getServerRecords() {
  let dataString = fs.readFileSync(dbLink, 'utf-8')
  return JSON.parse(dataString)
}
/*{[serverId]: {point: xx, playesr: [Author]}}*/
let textChannels = []
let gameChannel = null
// TODO: gameChannels -> game can be played in multiple channels and servers (database)

let players = {} // point & player
let gameState = GAME_STATE.INACTIVE
let lives = NUM_LIVES
let skipTurns = SKIPS
let hintTurns = HINTS

let word = ""
let lcWordArr = []
let riddleArr = []
let guessedLetters = []
let lastStateMess = null

let inactivityTimer = null
let guessTimer = null

client.on('ready', () => {
  console.log('ready on server')
  for (let [channelId, channel] of client.channels.cache) {
    if (channel.type == TYPE_TEXT_CHANNEL)
      textChannels.push(channel)
  }
});

/* ----------------------------------
valid command: PREFIX <command> 
!! Space between PREFIX and <command>
---------------------------------- */

client.on('messageCreate', async message => {

  // 1 - Filter message info -------------------------------------------------

  // author - player
  let author = message.author
  // message channel
  let ch = message.channel
  // return if author is (the logged in) bot
  if (author.bot || author.id === client.user.id) return
  // return if user's mess not in text channel
  let messInTextChannel = textChannels.map(item => item.id).includes(ch.id)
  if (!messInTextChannel) return

  // 2 - Filter message content -----------------------------------------------

  // 2.1 filter content and command
  let content = message.content.trim()
  let command = content == PREFIX ?
    PREFIX
    : content.startsWith(PREFIX + " ")
      ? content.split(PREFIX)[1].trim().toLocaleLowerCase()
      : ""

  if (command.length >= 200) {
    ch.send({ embeds: [botMess("😨 This command is too long for me to understand.")] })
    return
  }

  // 3 - If channel in game mode -----------------------------------------------------
  if (gameState != GAME_STATE.INACTIVE && gameChannel && ch.id == gameChannel.id) {    
    handleGame(message, ch, author, command, content)
    return
  }

  // 4 - If channel NOT in game mode -------------------------------------------------
  // return if user's mess is not a command
  if (!command) return
  let mess = null // bot mess

  switch (command) {
    case PREFIX:
      mess = `🤙 Hi how's going? Use \`${PREFIX} <command>\` to call me. \n Send \`${PREFIX} help\` to see list of commands. 🌿`
      break
    case "reminder":
      mess = "🌼 You are amazing!"
      break
    case "help":
      mess = `
        🌈 To call the bot: \n
        Syntax: ${PREFIX} <command> (space between ${PREFIX} and <command>) \n\n
      `
      for (let cmd in MAIN_CMDS) {
        let line = `\`${cmd}\` 👉🏼 ${MAIN_CMDS[cmd].name}\n`
        mess += line
      }
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

        // set active timeout
        inactivityTimer = setTimeout(() => endReadyState(ch), INACTIVE_TIME)

        gameState = GAME_STATE.READY
        gameChannel = ch
        addNewPlayer(author)
        records = await getServerRecords()
        let highest = null
        let username = null
        if (records[message.guild.id]) {
          highest = records[message.guild.id].point
          username = records[message.guild.id].players.map(p => p.username).join(", ")
        }
        ch.send({
          embeds: [gameWelcomeEmbed(
            gameChannel.name,
            username,
            highest,
            message.guild.name)]
        })
      } else {
        let room = gameChannel
          ? `channel \`${gameChannel.name}\``
          : "an other channel." // just to make sure no error's gonna occur lol

        if (gameChannel.guild.id != ch.guild.id) {
          room = "an other server."
        }
        mess = "🕴🏻 Mr.Hangman is already in " + room + "\n Please wait for a moment 👌🏼"
      }
      break
    default:
      mess = `🤔 Did somebody mention me? \n Send \`${PREFIX} help\` to see list of commands. 🌿`
  }

  if (mess) ch.send({ embeds: [botMess(mess)] })
});


// ---------------- game mode -------------------------------------------


let addNewPlayer = (author) => {
  if (!players[author.id]) {
    players[author.id] = {
      point: 0,
      player: author
    }
    return true
  }
  return false
}

let deletePlayer = (author) => {
  if (players[author.id]) {
    delete players[author.id]
    return true
  }
  return false
}

function resetRound() {
  lastStateMess = null
  lives = NUM_LIVES
  word = ""
  lcWordArr = []
  riddleArr = []
  guessedLetters = []
}

function endGame() {
  if (inactivityTimer) clearTimeout(inactivityTimer)
  players = {}
  gameChannel = null
  gameState = GAME_STATE.INACTIVE
  skipTurns = SKIPS
  hintTurns = HINTS
  resetRound()
}

function setNewRound(ch, notiText) {
  gameState = GAME_STATE.PAUSED

  resetRound()
  ch.send({ embeds: [gameNoti(notiText), gameNoti("...is coming back in 10 seconds with another word.")] })
  // TODO: "state" message to update the time
  setTimeout(() => initGame(ch), WAIT_TIME)
}

function sendGameState(ch, otherMess = []) {
  if (lastStateMess) {lastStateMess.delete()}
  if (!Array.isArray(otherMess)) otherMess = []
  ch.send({
    embeds: [
      ...otherMess,
      gameMess(`\`${HANG_STATE[lives]}\`\n\n\`${riddleArr.join('')}\` (${word.length} letters)`,
          lives, guessedLetters, skipTurns, hintTurns)]
  })
  .then(m => {lastStateMess = m})
  .catch(err => {console.log("send game state", err)})
}

function initGame(ch) {
  if (gameState == GAME_STATE.INACTIVE) return

  gameState = GAME_STATE.STARTED

  resetRound()
  let rd = Math.floor(Math.random() * LIST_WORDS.length)
  word = LIST_WORDS[rd]

  console.log("boom:", word, rd)

  lcWordArr = word.toLocaleLowerCase().split('')
  riddleArr = []
  for (let i = 0; i < word.length; i++) {
    riddleArr.push(HIDDEN_LETTER)
  }
  sendGameState(ch)
}

function handleWrongAnswer(ch, content) {
  lives -= 1
  let notiText = `Oh no **\`${content.toLocaleUpperCase()}\`** is wrong. You have ${lives}❤️ left.`
  sendGameState(ch, [gameNoti(notiText)])
  if (lives <= 0) {
    ch.send({ embeds: [gameNoti(`Out of lives, game over! ❌\n The word is **${word}**`)] })
    showRanking(ch)
    endGame()
  }
}

function showRanking(ch) {
  let ranking = Object.values(players).sort((a, b) => b.point - a.point)
  let rankingBoard = ranking.length ? "" : "😳 Hmmm it seems like no one is here."

  for (let i = 0; i < ranking.length; i++) {
    let t = `**${ranking[i].player.username}**: ${ranking[i].point} pt(s) \n`
    if (i == 0) {
      rankingBoard += "🥇 " + t
    } else if (i == 1) {
      rankingBoard += "🥈 " + t
    } else if (i == 2) {
      rankingBoard += "🥉 " + t
    } else {
      rankingBoard += `${i + 1}. ${t}`
    }
  }

  ch.send({ embeds: [gameNoti(rankingBoard, "🕴🏻 Mr.Hangman: Players 🏆")] })
}

async function handleRecord(ch, guildId, info, addedPoints) {
  if (!records) records = await getServerRecords()

  let notiRecord = "Congrats, you've just set a new record!\n"
    + `🥇 **${info.player.username}**: ${info.point} pts`
  
  let playerSchema = {
    id: info.player.id,
    username: info.player.username,
    discriminator: info.player.discriminator
  }

  if (!records[guildId]) {
    records[guildId] = {
      point: info.point,
      players: [playerSchema]
    }

  } else if (records[guildId].point > info.point) {
    notiRecord = ""
    return

  } else if (records[guildId].point == info.point) {
    if (!records[guildId].players.map(p => p.id).includes(info.player.id)) {
      records[guildId].players.push(playerSchema)
    }

  } else if (records[guildId].point < info.point) {
    if (records[guildId].point > info.point - addedPoints) {
      let oldPlayers = records[guildId].players.map(p => p.username).join(", ")
      notiRecord = `Congrats, you've just surpassed ${oldPlayers} and set a new record!\n`
        + `🥇 **${info.player.username}**: ${info.point} pts`
    }
    records[guildId] = {
      point: info.point,
      players: [playerSchema]
    }

  } else {
    notiRecord = ""
    return
  }
  if (notiRecord) {
    fs.writeFileSync(dbLink, JSON.stringify(records), 'utf-8');
    ch.send({ embeds: [gameNoti(notiRecord, "New record 🏆")] })
  }
}

function endReadyState(ch) {
  if (gameState == GAME_STATE.STARTED) {
    if (Object.values(players).length) showRanking(ch) // show ranking if game is already started
  }
  endGame() // end game, reset values
  ch.send({ embeds: [botMess(`🕴🏻 Mr.Hangman's leaving now due to inactivity for too long. (${Math.round(INACTIVE_TIME/60000)} mins)`)] })
}

function handleGame(message, ch, author, command, content) {
  // !TODO: Set timer, automatically out after 2 mins no interaction
  if (inactivityTimer) clearTimeout(inactivityTimer)
  inactivityTimer = setTimeout(() => endReadyState(ch), INACTIVE_TIME)

  // 3.1 - Command for people not in the game -------------------------------------------
  switch (command) {
    case "ghelp":
      ch.send({ embeds: [gameHelpEmbed()] })
      return
    case "join":
      if (addNewPlayer(author)) {
        ch.send({ embeds: [gameNoti(`🔵**${author.username}** is added to the list.`)] })
      } else {
        ch.send({ embeds: [gameNoti(`**${author.username}** is already in the list.`)] })
      }
      return
    case "out":
      if (deletePlayer(author)) {
        ch.send({ embeds: [gameNoti(`⚪️**${author.username}** is deleted from the list.`)] })
        if (!Object.values(players).length) { // end game if no one's in the list reset values
          endGame()
          ch.send({ embeds: [gameNoti("❌ Game is over because there's no one left in the game! 🕴🏻 Thank you for playing with Mr.Hangman!")] })
        }
      } else {
        ch.send({ embeds: [gameNoti(`**${author.username}** is not yet in the list. \`join\` to join the game`)] })
      }
      return
    case "rank":
    case "players":
      showRanking(ch)
      return
    case "record":
      let highest = null
      let username = null
      if (records[message.guild.id]) {
        highest = records[message.guild.id].point
        username = records[message.guild.id].players.map(p => `${p.username}#${p.discriminator}`).join("\n")
      }
      let noti = highest ? `🥇 ${highest} pts \n **${username}**` : "Not recorded"
      ch.send({ embeds: [gameNoti(noti,`Highest score recorded in **${message.guild.name}**`)] })
      return
    case "quit":
      if (gameState == GAME_STATE.READY) {
        endGame() // end game, reset values
        ch.send({ embeds: [botMess("🕴🏻 See you next time, bye bye!")] })
      } else {
        if (Object.values(players).length) showRanking(ch) // show ranking
        endGame() // end game, reset values
        ch.send({ embeds: [botMess("❌ Game over! 🕴🏻 Thank you for playing with Mr.Hangman!")] })
      }
      return
    default:
      break
  }

  // 3.2 - ignore command if people not in the game --------------------------------------------
  if (!players[author.id]) return

  // 3.3 - command when game is paused --------------------------------------------------------
  // 3.4 - command when game is ready --------------------------------------------------------
  if (gameState == GAME_STATE.PAUSED || gameState == GAME_STATE.READY) {
    if (!command) return

    if (gameState == GAME_STATE.PAUSED && command == "resume") {
      gameState = GAME_STATE.STARTED
      sendGameState(ch, [gameNoti("▶️ Back to da game.")])
      return
    }
    
    if (gameState == GAME_STATE.READY && command == "start") {
      gameState = GAME_STATE.STARTED
      initGame(ch)
      return
    }

    switch (command) {
      case "play":
      case "hint":
      case "state":
      case "skip":
      case "pause":
      case "resume":
        let keyWord = "start"
        if (gameState == GAME_STATE.PAUSED) {
          keyWord = "resume"
        } 
        ch.send({ embeds: [botMess(`🕴🏻 \`${PREFIX} ${keyWord}\` to ${keyWord} game.`)] })
        return
      default:
        let mess = `🕴🏻 Mr.Hangman is already using this room, see list commands: \`${PREFIX} ghelp\`.
        Your command may work in other channels.`
        if (gameState == GAME_STATE.PAUSED) {
          mess = `🕴🏻 Mr.Hangman is pausing the game.\`${PREFIX} resume\` to resume game.`
        }
        ch.send({embeds: [botMess(mess)]})
        return
    }
  }
  // TODO: "State" message, show the current state (time, letter guessed)

  // 3.5 - command during gameplay ------------------------------------------------------------
  // !TODO: Set timer, guess in 1 minute ?
  if (gameState == GAME_STATE.STARTED) {
    switch (command) {
      case "state":
        sendGameState(ch)
        return
      case "hint":
        if (hintTurns <= 0) {
          ch.send({ embeds: [botMess(`🕴🏻 You have no hint left :(`)] })
          return
        }
        hintTurns -= 1        
        let hiddenIndices = []
        for (let i=0; i<riddleArr.length; i++) {
          if (riddleArr[i] == HIDDEN_LETTER) {
            hiddenIndices.push(i)
          }
        }
        if (hiddenIndices.length == 0) return
        let rd = Math.floor(Math.random() * hiddenIndices.length)
        let letter = lcWordArr[hiddenIndices[rd]]
        guessedLetters.push(letter)

        for (let i = 0; i < lcWordArr.length; i++) {
          if (lcWordArr[i] == letter) {
            riddleArr[i] = word[i]
          }
        }
        ch.send({ embeds: [botMess(`🕴🏻 I'll give you this hint: **${letter.toLocaleUpperCase()}**`)] })
        sendGameState(ch)
        return
      case "skip":
        if (skipTurns > 0) {
          skipTurns -= 1
          ch.send({ embeds: [botMess(`🕴🏻⏭ Skipped to new word`)] })
          initGame(ch)
        } else {
          ch.send({ embeds: [botMess(`🕴🏻 You have no skip turns left :(`)] })
        }
        return
      case "pause":
        gameState = GAME_STATE.PAUSED
        ch.send({ embeds: [gameNoti("⏸ Game paused.")] })
        return
      default:
        if (command) {
          ch.send({
            embeds: [botMess(
              `🕴🏻 Mr.Hangman is already using this room, see list commands: \`${PREFIX} ghelp\`.
              Your command may work in other channels.`)]
          })
          return
        }
        // 4 - Handle answer in gameplay ------------------------------------------------------------------
        let ans = content.toLocaleLowerCase()

        // answer has 1 letter -> letter-guess
        if (ans.length == 1) {
          if (guessedLetters.includes(ans) && lcWordArr.includes(ans)) {
            ch.send({ embeds: [gameNoti(`**\`${ans.toLocaleUpperCase()}\`** is already guessed`)] })
            return
          }
          if (!guessedLetters.includes(ans)) {
            guessedLetters.push(ans)
          }
          let added = 0
          if (lcWordArr.includes(ans)) {
            for (let i = 0; i < lcWordArr.length; i++) {
              if (lcWordArr[i] == ans) {
                added += POINT_LETTER
                riddleArr[i] = word[i]
              }
            }
            players[author.id].point += added
            handleRecord(ch, message.guild.id, players[author.id], added)
            message.react("🤘")

            if (!riddleArr.includes(HIDDEN_LETTER)) {
              setNewRound(
                ch,
                `Yay **${author.username}** got letter **\`${ans.toLocaleUpperCase()}\`** right => +${POINT_LETTER} pt(s)! \n 
                It was also the last letter, the word is \`${word}\``)
            } else {
              sendGameState(ch, [gameNoti(`${author.username} got letter **\`${ans.toLocaleUpperCase()}\`** right => \`+${added}\` pt(s)! `)])
            }
          } else {
            handleWrongAnswer(ch, content)
          }
        } else { // answer has multiple letters -> word-guess
          if (ans == lcWordArr.join('')) {
            let added = POINT_WORD
            for (let c of riddleArr) {
              if (c == HIDDEN_LETTER) added += POINT_LETTER
            }

            players[author.id].point += added
            handleRecord(ch, message.guild.id, players[author.id], added)
            message.react("👏")

            setNewRound(
              ch,
              `Yay **${author.username}** guessed it right! \n The word is **\`${word}\`** => \`+${added}\` pt(s)!`)
          } else {
            handleWrongAnswer(ch, content)
          }
        }
        break
    }
    return
  }
}

client.login(process.env.BOT_TOKEN)