import { song } from "./song.js";
import { Player } from "./player.js";
import { createMachine } from "./statechart.js";
import { appMachineConfig, EVENTS, ACTIONS } from "./app-machine.js";
import { createGridView, FIELDS, CENTER, VISIBLE_ROWS } from "./grid-view.js";

const playButton = document.getElementById("play");
const gridTableElement = document.getElementById("grid");
const cursor = { channel: 0, position: 0 };
/* const renderGrid = createGridView(gridTableElement, song.instruments.length, cursor); */

let focusRow = 0;

function render() {
  Array.from(gridTableElement.children, (rowElement, rowElementIndex) => {
    const currentRow = focusRow - CENTER + rowElementIndex;

    // Empty row?
    if (currentRow < 0 || currentRow >= song.pattern.length) {
      rowElement.classList.add("empty");
      Array.from(rowElement.children).forEach((cell, cellIndex) => {
        if (cell.children.length) {
          Array.from(cell.children).forEach((field, fieldIndex) => {
            if (field.className === "note") {
              field.textContent = "";
            } else {
              field.textContent = "";
            }
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

    gridTableElement.appendChild(tr);
  });
}

buildGrid();
render();

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

/* function render() {
  renderGrid(song.pattern, focusRow);
}

render(); */

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
  const handler = keyHandlers[event.code];
  if (handler) {
    event.preventDefault();
    handler();
  }
});

gridTableElement.addEventListener("keydown", (event) => {
  if (event.code === "Tab") {
    event.preventDefault();
    moveCursor(event.shiftKey ? -FIELDS_PER_CHANNEL : FIELDS_PER_CHANNEL);
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
