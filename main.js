import { PlayView } from "./play-view.js";
import { Player } from "./player.js";
import { song } from "./song.js";
import { PatternEditor } from "./editor.js";
import { GridView } from "./grid-view.js";
import { createMachine } from "./statechart.js";
import { appMachineConfig } from "./app-machine.js";

const PATTERN_ROWS = 64;

const workingSong = {
  instruments: song.instruments,
  pattern: padPattern(song.pattern, PATTERN_ROWS),
};

const playButton = document.getElementById("play");
const statusText = document.getElementById("status");
const gridEl = document.getElementById("grid");
const instrumentSelect = document.getElementById("instrument-select");
const octaveLabel = document.getElementById("octave");

const player = new Player(workingSong);
const playView = new PlayView(playButton, statusText);
const editor = new PatternEditor(workingSong, {
  previewNote: (instrument, midi) => {
    player.previewNote(instrument, midi).catch((error) => console.error(error));
  },
  onChange: () => gridView.render(),
});
const gridView = new GridView(gridEl, instrumentSelect, octaveLabel, editor);

gridView.init(workingSong.instruments);
player.onRowChange = (row) => machine.send({ type: "ROW_CHANGED", row });
player.onEnd = () => machine.send("ENDED");

const actions = {
  resetToEditing: () => {
    playView.renderStopped();
    playView.enable();
    gridView.setPlayingRow(null);
  },

  forwardKey: (event) => {
    editor.handleKey(event.domEvent);
  },

  scrollGrid: (event) => {
    gridView.setPlayingRow(event.row);
  },

  onStartPlayback: () => {
    playView.disable();
    player
      .start(0)
      .then(() => machine.send("STARTED"))
      .catch((error) => {
        console.error(error);
        machine.send({ type: "START_FAILED", error });
      });
  },

  activatePlayback: () => {
    playView.renderPlaying();
    playView.enable();
  },

  stopPlayback: () => {
    player.stop();
  },

  showError: (event) => {
    const message = event.error?.message ?? "Error";
    playView.renderStopped(message);
    playView.enable();
  },
};

const machine = createMachine(appMachineConfig, { actions });

playButton.addEventListener("click", () => {
  machine.send("TOGGLE_PLAY");
  gridEl.focus();
});

gridEl.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    event.preventDefault();
    machine.send("TOGGLE_PLAY");
    return;
  }
  machine.send({ type: "KEY_PRESSED", domEvent: event });
});

gridEl.focus();

function padPattern(pattern, rows) {
  const channels = pattern[0].length;
  const emptyRow = () => Array.from({ length: channels }, () => "--------");
  const result = pattern.map((row) => row.slice());
  while (result.length < rows) result.push(emptyRow());
  return result;
}
