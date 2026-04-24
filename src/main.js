import { Cell } from "./cell.js";
import {
  calculateCurrentRow,
  isPlaying,
  startPlay,
  stopPlay,
} from "./audio.js";

const INTERVAL_TIME = 25;
const BPM = 120;
const ROWS_PER_BEAT = 4;

let currentRow = -1;

const pattern = [
  new Cell("C-4", 1),
  new Cell("-"),
  new Cell(),
  new Cell("D-4", 1),
];

const playBtn = document.getElementById("play");
playBtn.addEventListener("click", async () => {
  if (isPlaying()) {
    await stopPlay();
    playBtn.textContent = "Play";
    draw();
  } else {
    startPlay({ intervalTime: INTERVAL_TIME, onSchedule: schedule });
    playBtn.textContent = "Stop";
    draw();
  }
});

function schedule() {
  currentRow = calculateCurrentRow({
    bpm: BPM,
    rowsPerBeat: ROWS_PER_BEAT,
    patternLength: pattern.length,
  });
  console.log("Current row:", currentRow);
}

function draw() {
  // Draw the current state of the channel.
}
