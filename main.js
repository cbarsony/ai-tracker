import { song, addNote, deleteNote, noteOff, EndNote } from "./song.js";
import { Player } from "./player.js";
import { createMachine } from "./statechart.js";
import { appMachineConfig, EVENTS, ACTIONS, STATES } from "./app-machine.js";
import { NOTE_NAMES } from "./scheduler.js";

const VISIBLE_ROWS = 17;
const CENTER = 8;

// The six fields of a cell, in cursor order.
// Index = cursor position. start/end slice the 8-char cell string.
const FIELDS = [
  { className: "note", start: 0, end: 3 },
  { className: "instrument_character_1", start: 3, end: 4 },
  { className: "instrument_character_2", start: 4, end: 5 },
  { className: "effect_key", start: 5, end: 6 },
  { className: "effect_value_character_1", start: 6, end: 7 },
  { className: "effect_value_character_2", start: 7, end: 8 },
];

const playButton = document.getElementById("play");
const recordButton = document.getElementById("record");
const instrumentSelect = document.getElementById("instrument");
const octaveSelect = document.getElementById("octave");
const gridTableElement = document.getElementById("grid");
const cursor = { channel: 0, position: 0 };

let gridTbodyElement;
let cursorEl = null;
let focusRow = 0;
let selectedInstrument = 0;
let octave = 4;

function render() {
  Array.from(gridTbodyElement.children, (rowElement, rowElementIndex) => {
    const currentRow = focusRow - CENTER + rowElementIndex;

    // Empty row?
    if (currentRow < 0 || currentRow >= song.pattern.length) {
      rowElement.classList.add("empty");
      Array.from(rowElement.children).forEach((cell) => {
        if (cell.children.length) {
          Array.from(cell.children).forEach((field) => {
            field.textContent = "";
          });
        } else {
          cell.textContent = "";
        }
      });

      return;
    }

    rowElement.classList.remove("empty");

    const patternRow = song.pattern[currentRow];
    rowElement.querySelector("th").textContent = String(currentRow).padStart(
      2,
      "0",
    );
    rowElement.querySelectorAll("td").forEach((cell, cellIndex) => {
      const cellData = patternRow[cellIndex];

      // Empty cell
      if (!cellData) {
        cell.querySelector(".note").textContent = "---";
        cell.querySelector(".instrument_character_1").textContent = "-";
        cell.querySelector(".instrument_character_2").textContent = "-";
        cell.querySelector(".effect_key").textContent = "-";
        cell.querySelector(".effect_value_character_1").textContent = "-";
        cell.querySelector(".effect_value_character_2").textContent = "-";
        return;
      }

      // Note-off cell
      if (cellData instanceof EndNote) {
        cell.querySelector(".note").textContent = "===";
        cell.querySelector(".instrument_character_1").textContent = "-";
        cell.querySelector(".instrument_character_2").textContent = "-";
        cell.querySelector(".effect_key").textContent = "-";
        cell.querySelector(".effect_value_character_1").textContent = "-";
        cell.querySelector(".effect_value_character_2").textContent = "-";
        return;
      }

      cell.querySelector(".note").textContent = cellData.pitch;

      const instrumentIdString = String(cellData.instrumentId).padStart(2, "0");

      cell.querySelector(".instrument_character_1").textContent =
        instrumentIdString.substring(0, 1);
      cell.querySelector(".instrument_character_2").textContent =
        instrumentIdString.substring(1, 2);

      if (cellData.effect) {
        cell.querySelector(".effect_key").textContent = cellData.effect.key;
        cell.querySelector(".effect_value_character_1").textContent =
          cellData.effect.value.toString().substring(0, 1);
        cell.querySelector(".effect_value_character_2").textContent =
          cellData.effect.value.toString().substring(1, 2);
      } else {
        cell.querySelector(".effect_key").textContent = "-";
        cell.querySelector(".effect_value_character_1").textContent = "-";
        cell.querySelector(".effect_value_character_2").textContent = "-";
      }
    });
  });
}

function buildGrid() {
  const tbody = document.createElement("tbody");
  Array.from({ length: VISIBLE_ROWS }, (_, row) => {
    const tr = document.createElement("tr");
    if (row === CENTER) tr.classList.add("playhead");
    const th = document.createElement("th");
    tr.appendChild(th);
    song.instruments.forEach((instrument, index) => {
      const td = document.createElement("td");
      FIELDS.map((field) => {
        const s = document.createElement("span");
        s.className = field.className;
        td.appendChild(s);
      });
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
  gridTableElement.appendChild(tbody);
  gridTbodyElement = tbody;
}

buildGrid();
render();
updateCursor();

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
      recordButton.disabled = true;
    },
    [ACTIONS.STOP_PLAYBACK]() {
      player.stop();
      playButton.textContent = "Play";
    },
    [ACTIONS.ENTER_JAMMING]() {
      recordButton.textContent = "Jam";
      recordButton.classList.remove("recording");
      recordButton.disabled = false;
    },
    [ACTIONS.ENTER_RECORDING]() {
      recordButton.textContent = "\u25CF Rec";
      recordButton.classList.add("recording");
    },
  },
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

function updateCursor() {
  cursorEl?.classList.remove("cursor");
  const tds = gridTableElement.rows[CENTER].querySelectorAll("td");
  cursorEl = tds[cursor.channel].querySelectorAll("span")[cursor.position];
  cursorEl.classList.add("cursor");
}

// Piano-style keyboard: lower row = current octave, upper row = octave + 1.
// Each value is a semitone offset from C of the current octave.
const NOTE_KEYS = {
  KeyZ: 0,
  KeyS: 1,
  KeyX: 2,
  KeyD: 3,
  KeyC: 4,
  KeyV: 5,
  KeyG: 6,
  KeyB: 7,
  KeyH: 8,
  KeyN: 9,
  KeyJ: 10,
  KeyM: 11,
  KeyQ: 12,
  Digit2: 13,
  KeyW: 14,
  Digit3: 15,
  KeyE: 16,
  KeyR: 17,
  Digit5: 18,
  KeyT: 19,
  Digit6: 20,
  KeyY: 21,
  Digit7: 22,
  KeyU: 23,
};

function buildPitch(semitoneOffset) {
  const total = octave * 12 + semitoneOffset;
  return `${NOTE_NAMES[total % 12]}${Math.floor(total / 12)}`;
}

function handleNoteKey(code) {
  const pitch = buildPitch(NOTE_KEYS[code]);
  player.previewNote(pitch, selectedInstrument);
  if (trackerMachine.state === STATES.RECORDING) {
    addNote(focusRow, cursor.channel, pitch, selectedInstrument);
    if (focusRow < song.pattern.length - 1) focusRow++;
    render();
  }
}

const keyHandlers = {
  ArrowLeft: () => {
    moveCursor(-1);
    updateCursor();
    render();
  },
  ArrowRight: () => {
    moveCursor(1);
    updateCursor();
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
  Enter: () => trackerMachine.send(EVENTS.TOGGLE_RECORD),
  Delete: () => {
    if (trackerMachine.state !== STATES.RECORDING) return;
    deleteNote(focusRow, cursor.channel);
    if (focusRow < song.pattern.length - 1) focusRow++;
    render();
  },
  Backspace: () => {
    if (trackerMachine.state !== STATES.RECORDING) return;
    noteOff(focusRow, cursor.channel);
    if (focusRow < song.pattern.length - 1) focusRow++;
    render();
  },
};

document.addEventListener("keydown", (event) => {
  // Let dropdowns keep their own keyboard behavior.
  if (event.target.tagName === "SELECT") return;

  // Let browser/OS shortcuts (Ctrl, Meta, Alt combos) pass through.
  if (event.ctrlKey || event.metaKey || event.altKey) return;

  const handler = keyHandlers[event.code];
  if (handler) {
    event.preventDefault();
    handler();
    return;
  }

  if (
    !event.repeat &&
    event.code in NOTE_KEYS &&
    (trackerMachine.state === STATES.JAMMING ||
      trackerMachine.state === STATES.RECORDING)
  ) {
    event.preventDefault();
    handleNoteKey(event.code);
  }
});

gridTableElement.addEventListener("keydown", (event) => {
  if (event.code === "Tab") {
    event.preventDefault();
    moveCursor(event.shiftKey ? -FIELDS_PER_CHANNEL : FIELDS_PER_CHANNEL);
    updateCursor();
    render();
  } else if (event.code === "Escape") {
    playButton.focus();
  }
});

gridTableElement.addEventListener("wheel", (event) => {
  event.preventDefault();
  const delta = event.deltaY > 0 ? 2 : -2;
  focusRow = Math.max(0, Math.min(song.pattern.length - 1, focusRow + delta));
  render();
});

playButton.addEventListener("click", () => {
  trackerMachine.send(EVENTS.TOGGLE_PLAY);
});

recordButton.addEventListener("click", () => {
  trackerMachine.send(EVENTS.TOGGLE_RECORD);
  gridTableElement.focus();
});

song.instruments.forEach((instrument, index) => {
  const option = document.createElement("option");
  option.value = String(index);
  option.textContent = instrument.name;
  instrumentSelect.appendChild(option);
});
instrumentSelect.addEventListener("change", () => {
  selectedInstrument = Number(instrumentSelect.value);
  gridTableElement.focus();
});

for (let o = 1; o <= 8; o++) {
  const option = document.createElement("option");
  option.value = String(o);
  option.textContent = String(o);
  octaveSelect.appendChild(option);
}
octaveSelect.value = String(octave);
octaveSelect.addEventListener("change", () => {
  octave = Number(octaveSelect.value);
  gridTableElement.focus();
});
