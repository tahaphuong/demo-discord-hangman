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