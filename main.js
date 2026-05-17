import { GridView } from "./grid-view.js";
import { PlayView } from "./play-view.js";
import { Player } from "./player.js";
import { song } from "./song.js";

const playButton = document.getElementById("play");
const statusText = document.getElementById("status");
const gridContainer = document.getElementById("grid");
const toolbar = document.getElementById("toolbar");

const player = new Player(song);
const playView = new PlayView(playButton, statusText);
const gridView = new GridView({
  container: gridContainer,
  toolbar,
  song,
});
gridView.render();
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
