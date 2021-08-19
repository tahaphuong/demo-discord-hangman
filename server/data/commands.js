const MAIN_CMDS = {
  help: {
    name: "instruction. 🌵"
  },
  meme: {
    name: "random meme. 👶🏼"
  },
  quote: {
    name: "random quote in English. 📃"
  },
  zitat: {
    name: "random quote in German. 📜"
  },
  play: {
    name: "play Mr.Hangman 🕴🏻"
  }
}

const GAME_CMDS = {
  help: { name: "⚙️ Help in game", value: "`ghelp`", inline: true },
  hint: { name: "💡 Show hint", value: "`hint`", inline: true },
  state: { name: "🕹 Game state", value: "`state`", inline: true },

  join: { name: "🔵join/⚪️out game", value: "`join`/`out`", inline: true },
  record: { name: "🥇 Record", value: "`record`", inline: true },
  rank: { name: "🏆 Show players/ranking", value: "`players`/`rank`", inline: true },

  pause: { name: "⏸▶️ pause/resume", value: "`pause`/`resume`", inline: true },
  skip: { name: "⏭ Skip word", value: "`skip`", inline: true },
  quit: { name: "❌Quit game", value: "`quit`", inline: true },
}

module.exports = {
  MAIN_CMDS,
  GAME_CMDS
}