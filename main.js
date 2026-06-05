import { song } from "./song.js";
import { Player } from "./player.js";
import { createMachine } from "./statechart.js";
import { appMachineConfig, EVENTS, ACTIONS, STATES } from "./app-machine.js";
import { createGridView, FIELDS } from "./grid-view.js";
import { writeNote } from "./cell.js";

const playButton = document.getElementById("play");
const modeButton = document.getElementById("mode");
const instrumentSelect = document.getElementById("instrument");
const rowJumpInput = document.getElementById("row-jump");
const grid = document.getElementById("grid");
const cursor = { channel: 0, position: 0 };
const renderGrid = createGridView(grid, song.instruments.length, cursor);

const player = new Player(
  song,
  (row) => {
    focusRow = row;
    render();
  },
  () => trackerMachine.send({ type: EVENTS.SONG_END }),
);

const trackerMachine = createMachine(appMachineConfig, {
  actions: {
    [ACTIONS.START_PLAYBACK]() {
      player.play(focusRow);
      playButton.textContent = "Stop";
    },
    [ACTIONS.STOP_PLAYBACK]() {
      player.stop();
      playButton.textContent = "Play";
    },
  },
});

trackerMachine.subscribe((state) => {
  modeButton.textContent = `Mode: ${state === STATES.WRITE ? "Write" : "Preview"}`;
  modeButton.disabled = state === STATES.PLAYING;
});

let focusRow = 0;

// Piano layout across two octaves (FT2-style), keyed by physical key.
// Lower row starts at BASE_OCTAVE, upper row one octave higher.
const BASE_OCTAVE = 4;
const NOTE_KEYS = {
  // lower octave
  KeyZ: 0, KeyS: 1, KeyX: 2, KeyD: 3, KeyC: 4, KeyV: 5,
  KeyG: 6, KeyB: 7, KeyH: 8, KeyN: 9, KeyJ: 10, KeyM: 11,
  KeyComma: 12, KeyL: 13, KeyPeriod: 14,
  // upper octave
  KeyQ: 12, Digit2: 13, KeyW: 14, Digit3: 15, KeyE: 16, KeyR: 17,
  Digit5: 18, KeyT: 19, Digit6: 20, KeyY: 21, Digit7: 22, KeyU: 23,
  KeyI: 24, Digit9: 25, KeyO: 26, Digit0: 27, KeyP: 28,
};

// Auditions a note, and in WRITE mode also inserts it and jumps ahead.
function handleNoteKey(semitone) {
  if (trackerMachine.state === STATES.PLAYING) return;

  const midi = (BASE_OCTAVE + 1) * 12 + semitone;
  const instrument = Number(instrumentSelect.value);
  player.playNote(midi, instrument);

  if (trackerMachine.state === STATES.WRITE) {
    const row = song.pattern[focusRow];
    row[cursor.channel] = writeNote(row[cursor.channel], midi, instrument);
    const jump = Number(rowJumpInput.value);
    focusRow = Math.min(song.pattern.length - 1, focusRow + jump);
    render();
  }
}

function render() {
  renderGrid(song.pattern, focusRow);
}

render();

song.instruments.forEach((instrument, index) => {
  const option = document.createElement("option");
  option.value = String(index);
  option.textContent = `${index}: ${instrument.name}`;
  instrumentSelect.appendChild(option);
});

const CHANNEL_COUNT = song.instruments.length;
const FIELDS_PER_CHANNEL = FIELDS.length;

function moveCursor(delta) {
  const total = CHANNEL_COUNT * FIELDS_PER_CHANNEL;
  const flat = cursor.channel * FIELDS_PER_CHANNEL + cursor.position;
  const next = (flat + delta + total) % total;
  cursor.channel = Math.floor(next / FIELDS_PER_CHANNEL);
  cursor.position = next % FIELDS_PER_CHANNEL;
}

const keyHandlers = {
  ArrowLeft: () => {
    moveCursor(-1);
    render();
  },
  ArrowRight: () => {
    moveCursor(1);
    render();
  },
  ArrowUp: () => {
    focusRow > 0 && focusRow--;
    render();
  },
  ArrowDown: () => {
    focusRow < song.pattern.length - 1 && focusRow++;
    render();
  },
  Home: () => {
    focusRow > 0 && (focusRow = 0);
    render();
  },
  End: () => {
    focusRow < song.pattern.length - 1 && (focusRow = song.pattern.length - 1);
    render();
  },
  Space: () => trackerMachine.send(EVENTS.TOGGLE_PLAY),
};

document.addEventListener("keydown", (event) => {
  // Let inputs/selects (instrument, row jump) handle their own typing.
  if (event.target.matches("input, select")) return;

  const handler = keyHandlers[event.code];
  if (handler) {
    event.preventDefault();
    handler();
    return;
  }

  const semitone = NOTE_KEYS[event.code];
  if (semitone !== undefined && !event.repeat) {
    event.preventDefault();
    handleNoteKey(semitone);
  }
});

grid.addEventListener("keydown", (event) => {
  if (event.code === "Tab") {
    event.preventDefault();
    moveCursor(event.shiftKey ? -FIELDS_PER_CHANNEL : FIELDS_PER_CHANNEL);
    render();
  } else if (event.code === "Escape") {
    playButton.focus();
  }
});

grid.addEventListener("wheel", (event) => {
  event.preventDefault();
  const delta = event.deltaY > 0 ? 2 : -2;
  focusRow = Math.max(0, Math.min(song.pattern.length - 1, focusRow + delta));
  render();
});

playButton.addEventListener("click", () => {
  trackerMachine.send(EVENTS.TOGGLE_PLAY);
});

modeButton.addEventListener("click", () => {
  trackerMachine.send(EVENTS.TOGGLE_MODE);
});
