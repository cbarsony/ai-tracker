import { PlayView } from "./play-view.js";
import { Player } from "./player.js";
import { song } from "./song.js";

const playButton = document.getElementById("play");
const statusText = document.getElementById("status");
const player = new Player(song);
const playView = new PlayView(playButton, statusText);

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
    playView.focus();
  }
}

playButton.addEventListener("click", onPlayClick);
