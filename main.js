import { song } from "./song.js";
import { Player } from "./player.js";
import { createMachine } from "./statechart.js";
import { appMachineConfig } from "./app-machine.js";

const player = new Player(song);

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
    startPlayback() {
      player.play(0);
      playButton.textContent = "Stop";

      // Start a loop to update the grid based on the current playback position.
    },
    stopPlayback() {
      player.stop();
      playButton.textContent = "Play";
    },
  },
});

function renderGrid(focusRow) {
  for (let i = 0; i < VISIBLE_ROWS; i++) {
    const rowIdx = focusRow - CENTER + i;
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
  trackerMachine.send("TOGGLE_PLAY");
});
