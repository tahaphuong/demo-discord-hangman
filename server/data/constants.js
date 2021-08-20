const PREFIX = "&h"
const TYPE_TEXT_CHANNEL = "GUILD_TEXT"

const GAME_STATE = {
  INACTIVE: 0,
  READY: 1,
  STARTED: 2,
  PAUSED: 3
}

const NUM_LIVES = 12
const POINT_LETTER = 1
const POINT_WORD = 2
const SKIPS = 3
const HINTS = 3

const MAIN_COLOR = "#f7daf0"
const HIDDEN_LETTER = "-"

const WAIT_TIME = 10000
const INACTIVE_TIME = 180000
const GUESS_TIME = 30000

const HELLO_DM = `
I am a (demo hangman) bot 🤖\n
🎩 Syntax: \`&h <command>\` 
\`&h help\`👉🏼  list all commands. 🌵

🎩by thp
(P/s: My bot is currently in development, so all feedbacks and bugs to @fuong are welcome, thanks :3)
`

module.exports = {
  PREFIX,
  TYPE_TEXT_CHANNEL,
  GAME_STATE,
  NUM_LIVES,
  POINT_LETTER,
  POINT_WORD,
  MAIN_COLOR,
  SKIPS,
  HINTS,
  HIDDEN_LETTER,
  WAIT_TIME,
  INACTIVE_TIME,
  GUESS_TIME,
  HELLO_DM,
}