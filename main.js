import { song } from "./song.js";
import { Player } from "./player.js";

const player = new Player(song);

document.getElementById("play").addEventListener("click", () => {
  const fromRow = Number(document.getElementById("fromRow").value);
  player.play(fromRow);
});

document.getElementById("stop").addEventListener("click", () => {
  player.stop();
});
