import { PlayView } from "./play-view.js";
import { Player } from "./player.js";
import { song } from "./song.js";
import { PatternEditor } from "./editor.js";
import { GridView } from "./grid-view.js";

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
const startFromCursorBox = document.getElementById("start-from-cursor");

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
player.onRowChange = (row) => gridView.setPlayingRow(row);

gridEl.addEventListener("keydown", (event) => editor.handleKey(event));

async function onPlayClick() {
  playView.disable();

  try {
    if (player.isPlaying()) {
      player.stop();
      gridView.setPlayingRow(null);
      editor.setEnabled(true);
      playView.renderStopped();
    } else {
      editor.setEnabled(false);
      const fromRow = startFromCursorBox.checked ? editor.row : 0;
      await player.start(fromRow);
      playView.renderPlaying();
    }
  } catch (error) {
    console.error(error);
    player.stop();
    gridView.setPlayingRow(null);
    editor.setEnabled(true);
    playView.renderStopped(error.message);
  } finally {
    playView.enable();
    gridEl.focus();
  }
}

playButton.addEventListener("click", onPlayClick);
gridEl.focus();

function padPattern(pattern, rows) {
  const channels = pattern[0].length;
  const emptyRow = () => Array.from({ length: channels }, () => "--------");
  const result = pattern.map((row) => row.slice());
  while (result.length < rows) result.push(emptyRow());
  return result;
}
