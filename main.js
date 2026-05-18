import { GridView } from "./grid-view.js";
import { PlayView } from "./play-view.js";
import { Player } from "./player.js";
import { SampleEditor } from "./sample-editor.js";
import { song } from "./song.js";

const playButton = document.getElementById("play");
const statusText = document.getElementById("status");
const gridContainer = document.getElementById("grid");
const toolbar = document.getElementById("toolbar");
const sampleEditorContainer = document.getElementById("sample-editor");

const player = new Player(song);
const playView = new PlayView(playButton, statusText);
let sampleEditor;
const gridView = new GridView({
  container: gridContainer,
  toolbar,
  song,
  onInstrumentChange: (instrumentIndex) => {
    sampleEditor?.setInstrument(instrumentIndex);
  },
  onPreviewNote: (note, instrument) => {
    player.previewNote(note, instrument).catch((error) => console.error(error));
  },
});
sampleEditor = new SampleEditor({
  container: sampleEditorContainer,
  song,
  player,
  onInstrumentChange: (instrumentIndex) => {
    gridView.setInstrument(instrumentIndex);
    gridView.focus();
  },
});
gridView.render();
sampleEditor.render();
gridView.focus();

player.onRowChange = (rowIndex) => gridView.setPlayingRow(rowIndex);

async function onPlayClick() {
  playView.disable();

  try {
    if (player.isPlaying()) {
      player.stop();
      playView.renderStopped();
    } else {
      await player.start();
      playView.renderPlaying();
    }
  } catch (error) {
    console.error(error);
    player.stop();
    playView.renderStopped(error.message);
  } finally {
    playView.enable();
    gridView.focus();
  }
}

playButton.addEventListener("click", onPlayClick);
