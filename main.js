import { song } from "./song.js";
import { Player } from "./player.js";
import { createMachine } from "./statechart.js";
import { appMachineConfig, EVENTS, ACTIONS } from "./app-machine.js";

const player = new Player(
  song,
  (row) => {
    renderGrid(row);
  },
  () => {
    trackerMachine.send({ type: EVENTS.SONG_END });
  },
);

const playButton = document.getElementById("play");
const grid = document.getElementById("grid");

const rowEls = Array.from(grid.querySelectorAll("tr")).map((tr) => ({
  tr,
  th: tr.querySelector("th"),
  spans: Array.from(tr.querySelectorAll("td")).map((td) =>
    Array.from(td.querySelectorAll("span")),
  ),
}));

const VISIBLE_ROWS = 17;
const CENTER = 8;
const EMPTY = "--------";

const trackerMachine = createMachine(appMachineConfig, {
  actions: {
    [ACTIONS.START_PLAYBACK]() {
      player.play(0);
      playButton.textContent = "Stop";
    },
    [ACTIONS.STOP_PLAYBACK]() {
      player.stop();
      playButton.textContent = "Play";
    },
  },
});

function renderGrid(focusRow) {
  for (let i = 0; i < VISIBLE_ROWS; i++) {
    const rowIdx = focusRow - CENTER + i;
    if (rowIdx < 0 || rowIdx >= song.pattern.length) {
      const el = rowEls[i];
      el.th.textContent = "";
      for (let ch = 0; ch < el.spans.length; ch++) {
        el.spans[ch][0].textContent = "";
        el.spans[ch][1].textContent = "";
        el.spans[ch][2].textContent = "";
        el.spans[ch][3].textContent = "";
      }
      continue;
    }
    const row = song.pattern[rowIdx];
    const el = rowEls[i];

    el.th.textContent = row ? String(rowIdx).padStart(2, "0") : "";

    for (let ch = 0; ch < el.spans.length; ch++) {
      const cell = row ? row[ch] : EMPTY;
      el.spans[ch][0].textContent = cell.slice(0, 3);
      el.spans[ch][1].textContent = cell.slice(3, 4);
      el.spans[ch][2].textContent = cell.slice(4, 5);
      el.spans[ch][3].textContent = cell.slice(5, 8);
    }
  }
}

renderGrid(0);

document.getElementById("play").addEventListener("click", () => {
  trackerMachine.send(EVENTS.TOGGLE_PLAY);
});
