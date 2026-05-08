import { SONG } from "./song1.js";
import { TrackerPlayer } from "./src/player/tracker-player.js";
import { PlayButtonController } from "./src/ui/play-button-controller.js";

const player = new TrackerPlayer(SONG);
const playButton = document.getElementById("play");
new PlayButtonController(playButton, player).bind();

export function initAudio() {
  player.initAudio();
}
