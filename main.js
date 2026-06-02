import { song } from "./song.js";
import { Player } from "./player.js";
import { createMachine } from "./statechart.js";
import { appMachineConfig, EVENTS, ACTIONS } from "./app-machine.js";
import { buildGrid, renderGrid } from "./grid-view.js";

const playButton = document.getElementById("play");
const grid = document.getElementById("grid");
const rowEls = buildGrid(grid, song.instruments.length);

const player = new Player(
  song,
  (row) => render(row),
  () => trackerMachine.send({ type: EVENTS.SONG_END }),
);

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

function render(focusRow) {
  renderGrid(rowEls, song.pattern, focusRow);
}

render(0);

document.getElementById("play").addEventListener("click", () => {
  trackerMachine.send(EVENTS.TOGGLE_PLAY);
});
