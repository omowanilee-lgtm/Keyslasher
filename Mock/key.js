
const NOTES = [
  'C','C#','D','D#','E','F',
  'F#','G','G#','A','A#','B'
];


const CHORDS = {

  Beginner: {
    time: 30,
    chords: [
      ['C Major',[0,4,7]],
      ['G Major',[7,11,2]],
      ['F Major',[5,9,0]],
      ['A Minor',[9,0,4]],
      ['E Minor',[4,7,11]]
    ]
  },

  Intermediate: {
    time: 20,
    chords: [
      ['Cmaj7',[0,4,7,11]],
      ['Am7',[9,0,4,7]],
      ['Dm7',[2,5,9,0]],
      ['G7',[7,11,2,5]],
      ['Fmaj7',[5,9,0,4]]
    ]
  },

  Advanced: {
    time: 10,
    chords: [
      ['Cmaj9',[0,4,7,11,2]],
      ['Dm9',[2,5,9,0,4]],
      ['G13',[7,11,2,5,4]],
      ['A7b9',[9,1,4,7,10]],
      ['Fmaj7#11',[5,9,0,4,6]]
    ]
  },

  Pro: {
    time: 5,
    chords: [
      ['Cmaj9#11',[0,4,7,11,2,6]],
      ['G13b9',[7,11,2,5,8,4]],
      ['Dm11',[2,5,9,0,4,7]],
      ['C7alt',[0,4,10,1,3]]
    ]
  }

};


let difficulty = 'Beginner';

let lives = 3;
let levelTime = 180;
let chordTime = 30;

let currentChord;
let chordIndex = 0;

let activeNotes = new Set();

let levelTimer;
let chordTimer;

let paused = false;
let playing = false;

let midiAccess;
let midiInput;


/* ---------------- MIDI ---------------- */

async function initMIDI() {

  if (!navigator.requestMIDIAccess) {

    midiStatus.innerText = 'Nicht unterstützt';
    return;

  }

  try {

    midiAccess =
      await navigator.requestMIDIAccess();

    updateMIDI();

    midiAccess.onstatechange = updateMIDI;

  } catch {

    midiStatus.innerText = 'Blockiert';

  }

}


function updateMIDI() {

  midi.innerHTML = '';

  const inputs =
    [...midiAccess.inputs.values()];

  if (!inputs.length) {

    midi.innerHTML =
      '<option>Kein MIDI-Gerät</option>';

    midiStatus.innerText =
      'Kein Gerät';

    return;

  }

  inputs.forEach(input => {

    const option =
      document.createElement('option');

    option.value = input.id;

    option.textContent =
      input.name || input.id;

    midi.appendChild(option);

  });

  connectMIDI();

}


function connectMIDI() {

  if (midiInput)
    midiInput.onmidimessage = null;

  midiInput =
    midiAccess.inputs.get(midi.value);

  if (!midiInput) return;

  midiInput.onmidimessage =
    handleMIDI;

  midiStatus.innerText =
    'Aktiv';

}


function handleMIDI(event) {

  const [command,note,velocity] =
    event.data;

  if (command === 144 && velocity > 0)
    pressNote(note);

  if (command === 128 ||
      (command === 144 && velocity === 0))
    releaseNote(note);

}


/* ---------------- NOTES ---------------- */

function pressNote(note) {

  if (paused) return;

  activeNotes.add(note);

  highlight(note);

  checkChord();

}


function releaseNote(note) {

  if (paused) return;

  activeNotes.delete(note);

  highlight(note,false);

  checkChord();

}


function getPitchClasses() {

  return [...new Set(
    [...activeNotes].map(n => n % 12)
  )].sort((a,b) => a-b);

}


function checkChord() {

  const notes =
    getPitchClasses();

  input.textContent =
    notes.length
      ? notes.map(n => NOTES[n]).join(' - ')
      : '-';

  if (!currentChord) return;

  const target =
    [...currentChord[1]].sort((a,b)=>a-b);

  if (
    notes.length === target.length &&
    notes.every((n,i)=>n === target[i])
  ) {

    correctChord();

  }

}


/* ---------------- GAME ---------------- */

function startGame() {

  difficulty =
    document.getElementById('difficulty').value;

  lives = 3;

  levelTime = 180;

  chordIndex = 0;

  playing = true;

  paused = false;

  livesUI();

  start.classList.add('hidden');
  gameOver.classList.add('hidden');
  win.classList.add('hidden');
  pauseScreen.classList.add('hidden');

  loadChord();

  startLevelTimer();

}


function loadChord() {

  const list =
    CHORDS[difficulty].chords;

  currentChord =
    list[chordIndex % list.length];

  target.textContent =
    currentChord[0];

  startChordTimer();

}


function correctChord() {

  activeNotes.clear();

  clearKeys();

  player.classList.remove('idle');

  player.classList.add('slash');

  setTimeout(() => {

    enemy.classList.add(
      'scale-0',
      'opacity-0'
    );

  },150);


  setTimeout(() => {

    player.classList.remove('slash');

    player.classList.add('idle');

    chordIndex++;

    if (
      chordIndex >=
      CHORDS[difficulty].chords.length
    ) {

      winGame();

    } else {

      enemy.classList.remove(
        'scale-0',
        'opacity-0'
      );

      loadChord();

    }

  },400);

}


function wrongChord() {

  lives--;

  livesUI();

  player.classList.remove('idle');

  player.classList.add('hit');

  setTimeout(() => {

    player.classList.remove('hit');

    player.classList.add('idle');

  },400);


  if (lives <= 0) {

    gameOverScreen(
      'K.O. - OUT OF LIVES!'
    );

  } else {

    startChordTimer();

  }

}


function startLevelTimer() {

  clearInterval(levelTimer);

  levelTimer =
    setInterval(() => {

      if (paused) return;

      levelTime--;

      showLevelTime();

      if (levelTime <= 0)
        gameOverScreen('TIME OVER!');

    },1000);

}


function startChordTimer() {

  clearInterval(chordTimer);

  chordTime =
    CHORDS[difficulty].time;

  chordTimeUI();

  chordTimer =
    setInterval(() => {

      if (paused) return;

      chordTime--;

      chordTimeUI();

      if (chordTime <= 0)
        wrongChord();

    },1000);

}


function showLevelTime() {

  const min =
    String(Math.floor(levelTime/60))
    .padStart(2,'0');

  const sec =
    String(levelTime%60)
    .padStart(2,'0');

  levelTimeEl.textContent =
    `${min}:${sec}`;

}


function chordTimeUI() {

  chordTimeEl.textContent =
    chordTime + 's';

}


function livesUI() {

  livesEl.textContent =
    '❤️ '.repeat(lives) +
    '🖤 '.repeat(3-lives);

}


function gameOverScreen(message) {

  playing = false;

  clearInterval(levelTimer);
  clearInterval(chordTimer);

  reason.textContent = message;

  gameOver.classList.remove('hidden');

}


function winGame() {

  playing = false;

  clearInterval(levelTimer);
  clearInterval(chordTimer);

  win.classList.remove('hidden');

}


/* ---------------- PAUSE ---------------- */

function togglePause() {

  if (!playing) return;

  paused = !paused;

  pauseScreen.classList.toggle(
    'hidden',
    !paused
  );

}


/* ---------------- PIANO ---------------- */

function createPiano() {

  for (let midiNote = 48;
       midiNote <= 71;
       midiNote++) {

    const key =
      document.createElement('button');

    const black =
      [1,3,6,8,10]
      .includes(midiNote % 12);

    key.dataset.note =
      midiNote;

    key.textContent =
      NOTES[midiNote % 12];

    key.className =
      black
      ? 'key bg-slate-900 text-white h-16 w-5 -mx-2 z-10 text-[7px]'
      : 'key bg-white text-black h-24 w-7 text-[8px]';

    key.onmousedown =
      () => pressNote(midiNote);

    key.onmouseup =
      () => releaseNote(midiNote);

    key.onmouseleave =
      () => releaseNote(midiNote);

    piano.appendChild(key);

  }

}


function highlight(note, active=true) {

  const key =
    document.querySelector(
      `[data-note="${note}"]`
    );

  if (key)
    key.classList.toggle(
      'active',
      active
    );

}


function clearKeys() {

  document
    .querySelectorAll('.key')
    .forEach(k =>
      k.classList.remove('active')
    );

}


/* ---------------- BUTTONS ---------------- */

startBtn.onclick =
  startGame;

restart.onclick =
  startGame;

pause.onclick =
  togglePause;

resume.onclick =
  togglePause;

scan.onclick =
  initMIDI;

midi.onchange =
  connectMIDI;

difficulty.onchange = () => {

  if (playing) {

    difficulty =
      difficulty.value;

    chordIndex = 0;

    loadChord();

  }

};


next.onclick = () => {

  const levels =
    ['Beginner','Intermediate','Advanced','Pro'];

  const index =
    levels.indexOf(difficulty);

  if (index < levels.length - 1)
    difficulty =
      levels[index + 1];

  document.getElementById(
    'difficulty'
  ).value = difficulty;

  startGame();

};


window.onkeydown = e => {

  if (e.key.toLowerCase() === 'p')
    togglePause();

};


/* ---------------- START ---------------- */

const livesEl =
  document.getElementById('lives');

const levelTimeEl =
  document.getElementById('levelTime');

const chordTimeEl =
  document.getElementById('chordTime');

const player =
  document.getElementById('player');

const enemy =
  document.getElementById('enemy');

const target =
  document.getElementById('target');

const input =
  document.getElementById('input');

const midi =
  document.getElementById('midi');

const midiStatus =
  document.getElementById('midiStatus');

const start =
  document.getElementById('start');

const gameOver =
  document.getElementById('gameOver');

const win =
  document.getElementById('win');

const pauseScreen =
  document.getElementById('pauseScreen');

const reason =
  document.getElementById('reason');

createPiano();

initMIDI();