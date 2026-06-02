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
      player.play(focusRow);
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

playButton.addEventListener("click", () => {
  trackerMachine.send(EVENTS.TOGGLE_PLAY);
});
