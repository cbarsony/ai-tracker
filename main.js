import { song } from "./song.js";
import { Player } from "./player.js";
import { createMachine } from "./statechart.js";
import { appMachineConfig, STATES, EVENTS, ACTIONS } from "./app-machine.js";
import { createGridView, FIELDS } from "./grid-view.js";
import { createHistory } from "./history.js";
import { writeNote, clearNote } from "./cell.js";

const playButton = document.getElementById("play");
const instrumentSelect = document.getElementById("instrument");
const octaveInput = document.getElementById("octave");
const stepInput = document.getElementById("step");
const grid = document.getElementById("grid");
const cursor = { channel: 0, position: 0 };
const renderGrid = createGridView(grid, song.instruments.length, cursor);

song.instruments.forEach((instrument, index) => {
  const option = document.createElement("option");
  option.value = String(index);
  option.textContent = instrument.name;
  instrumentSelect.appendChild(option);
});

const history = createHistory(song);

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
    [ACTIONS.UNDO]() {
      history.undo();
      render();
    },
    [ACTIONS.REDO]() {
      history.redo();
      render();
    },
  },
});

let focusRow = 0;

function render() {
  renderGrid(song.pattern, focusRow, trackerMachine.state === STATES.WRITE);
}

render();

const CHANNEL_COUNT = song.instruments.length;
const FIELDS_PER_CHANNEL = FIELDS.length;

function moveCursor(delta) {
  const total = CHANNEL_COUNT * FIELDS_PER_CHANNEL;
  const flat = cursor.channel * FIELDS_PER_CHANNEL + cursor.position;
  const next = (flat + delta + total) % total;
  cursor.channel = Math.floor(next / FIELDS_PER_CHANNEL);
  cursor.position = next % FIELDS_PER_CHANNEL;
}

// FT2 piano layout, keyed by physical key (event.code) so it's keyboard-layout
// independent. Values are semitone offsets from the selected base octave:
// the bottom row starts at the base octave, the top row one octave higher.
const KEY_TO_SEMITONE = {
  KeyZ: 0, KeyS: 1, KeyX: 2, KeyD: 3, KeyC: 4, KeyV: 5, KeyG: 6,
  KeyB: 7, KeyH: 8, KeyN: 9, KeyJ: 10, KeyM: 11,
  Comma: 12, KeyL: 13, Period: 14, Semicolon: 15, Slash: 16,
  KeyQ: 12, Digit2: 13, KeyW: 14, Digit3: 15, KeyE: 16, KeyR: 17,
  Digit5: 18, KeyT: 19, Digit6: 20, KeyY: 21, Digit7: 22, KeyU: 23,
  KeyI: 24, Digit9: 25, KeyO: 26, Digit0: 27, KeyP: 28,
};

// Held preview notes, keyed by event.code, so each key stops its own note on
// release (polyphony). A reserved `null` blocks the keydown auto-repeat race
// while the note's audio is still starting.
const activeNotes = new Map();

const cursorOnNote = () => cursor.position === 0;

function playPreview(code, midi, instrument) {
  if (activeNotes.has(code)) return;
  activeNotes.set(code, null);
  player.startNote(midi, instrument).then((handle) => {
    if (activeNotes.has(code)) activeNotes.set(code, handle);
    else player.stopNote(handle); // released before audio was ready
  });
}

function stopPreview(code) {
  if (!activeNotes.has(code)) return;
  const handle = activeNotes.get(code);
  activeNotes.delete(code);
  if (handle) player.stopNote(handle);
}

function writeNoteAtCursor(midi, instrument) {
  const cell = song.pattern[focusRow][cursor.channel];
  history.apply({
    type: "cell",
    row: focusRow,
    channel: cursor.channel,
    value: writeNote(cell, midi, instrument),
  });
  const step = Number(stepInput.value);
  focusRow = Math.min(song.pattern.length - 1, focusRow + step);
  render();
}

function deleteNoteAtCursor() {
  if (!cursorOnNote()) return;
  const cell = song.pattern[focusRow][cursor.channel];
  history.apply({
    type: "cell",
    row: focusRow,
    channel: cursor.channel,
    value: clearNote(cell),
  });
  render();
}

// A piano key always auditions the note; in WRITE mode (with the cursor on the
// note field) it also writes it. Returns false when the key isn't a piano key.
function handlePianoKey(code) {
  const semitone = KEY_TO_SEMITONE[code];
  if (semitone === undefined) return false;
  const midi = (Number(octaveInput.value) + 1) * 12 + semitone;
  const instrument = Number(instrumentSelect.value);
  if (trackerMachine.state === STATES.WRITE && cursorOnNote()) {
    writeNoteAtCursor(midi, instrument);
  }
  playPreview(code, midi, instrument);
  return true;
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
  // Let the toolbar controls (instrument, octave, step) keep their own keys.
  if (event.target !== document.body && event.target !== grid) return;

  if ((event.ctrlKey || event.metaKey) && event.code === "KeyZ") {
    event.preventDefault();
    trackerMachine.send(event.shiftKey ? EVENTS.REDO : EVENTS.UNDO);
    return;
  }
  if ((event.ctrlKey || event.metaKey) && event.code === "KeyY") {
    event.preventDefault();
    trackerMachine.send(EVENTS.REDO);
    return;
  }

  const handler = keyHandlers[event.code];
  if (handler) {
    event.preventDefault();
    handler();
  }
});

grid.addEventListener("keydown", (event) => {
  if (event.code === "Tab") {
    event.preventDefault();
    moveCursor(event.shiftKey ? -FIELDS_PER_CHANNEL : FIELDS_PER_CHANNEL);
    render();
  } else if (event.code === "Escape") {
    playButton.focus();
  } else if (event.code === "Enter") {
    event.preventDefault();
    trackerMachine.send(EVENTS.TOGGLE_WRITE);
    render();
  } else if (event.code === "Delete") {
    event.preventDefault();
    if (trackerMachine.state === STATES.WRITE) deleteNoteAtCursor();
  } else if (
    trackerMachine.state !== STATES.PLAYING &&
    !event.repeat &&
    handlePianoKey(event.code)
  ) {
    event.preventDefault();
  }
});

document.addEventListener("keyup", (event) => stopPreview(event.code));

grid.addEventListener("wheel", (event) => {
  event.preventDefault();
  const delta = event.deltaY > 0 ? 2 : -2;
  focusRow = Math.max(0, Math.min(song.pattern.length - 1, focusRow + delta));
  render();
});

playButton.addEventListener("click", () => {
  trackerMachine.send(EVENTS.TOGGLE_PLAY);
});

grid.focus();
