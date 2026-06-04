import { song } from "./song.js";
import { Player } from "./player.js";
import { createMachine } from "./statechart.js";
import { appMachineConfig, EVENTS, ACTIONS } from "./app-machine.js";
import { createGridView, FIELDS } from "./grid-view.js";
import { createHistory } from "./history.js";

const playButton = document.getElementById("play");
const grid = document.getElementById("grid");
const cursor = { channel: 0, position: 0 };
const renderGrid = createGridView(grid, song.instruments.length, cursor);

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
