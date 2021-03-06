const MAIN_CMDS = {
  help: {
    name: "instruction. ๐ต"
  },
  meme: {
    name: "random meme. ๐ถ๐ผ"
  },
  quote: {
    name: "random quote in English. ๐"
  },
  zitat: {
    name: "random quote in German. ๐"
  },
  play: {
    name: "play Mr.Hangman ๐ด๐ป"
  }
}

const GAME_CMDS = {
  help: { name: "โ๏ธ Help in game", value: "`ghelp`", inline: true },
  hint: { name: "๐ก Show hint", value: "`hint`", inline: true },
  state: { name: "๐น Game state", value: "`state`", inline: true },

  join: { name: "๐ตjoin/โช๏ธout game", value: "`join`/`out`", inline: true },
  record: { name: "๐ฅ Record", value: "`record`", inline: true },
  rank: { name: "๐ Show players/ranking", value: "`players`/`rank`", inline: true },

  pause: { name: "โธโถ๏ธ pause/resume", value: "`pause`/`resume`", inline: true },
  skip: { name: "โญ Skip word", value: "`skip`", inline: true },
  quit: { name: "โQuit game", value: "`quit`", inline: true },
}

module.exports = {
  MAIN_CMDS,
  GAME_CMDS
}