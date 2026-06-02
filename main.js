import { song } from "./song.js";
import { Player } from "./player.js";
import { createMachine } from "./statechart.js";
import { appMachineConfig, EVENTS, ACTIONS } from "./app-machine.js";
import { createGridView, FIELDS } from "./grid-view.js";

const playButton = document.getElementById("play");
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
      player.play(0);
      playButton.textContent = "Stop";
    },
    [ACTIONS.STOP_PLAYBACK]() {
      player.stop();
      playButton.textContent = "Play";
    },
  },
});

let focusRow = 0;

function render() {
  renderGrid(song.pattern, focusRow);
}

render(0);

const CHANNEL_COUNT = song.instruments.length;
const FIELDS_PER_CHANNEL = FIELDS.length;

function moveCursor(delta) {
  const total = CHANNEL_COUNT * FIELDS_PER_CHANNEL;
  const flat = cursor.channel * FIELDS_PER_CHANNEL + cursor.position;
  const next = (flat + delta + total) % total;
  cursor.channel = Math.floor(next / FIELDS_PER_CHANNEL);
  cursor.position = next % FIELDS_PER_CHANNEL;
  render(focusRow);
}

document.getElementById("play").addEventListener("click", () => {
  trackerMachine.send(EVENTS.TOGGLE_PLAY);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") {
    moveCursor(-1);
  } else if (event.key === "ArrowRight") {
    moveCursor(1);
  }
});
