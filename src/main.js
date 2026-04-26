import { Cell } from "./cell.js";
import {
  calculateCurrentRow,
  isPlaying,
  playNote,
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
  const newCurrentRow = calculateCurrentRow({
    bpm: BPM,
    rowsPerBeat: ROWS_PER_BEAT,
    patternLength: pattern.length,
  });
  if (newCurrentRow !== currentRow) {
    currentRow = newCurrentRow;
    console.log(
      `${currentRow} ${pattern[currentRow].note} ${pattern[currentRow].instrument}`,
    );
    playNote(pattern[currentRow].note);
  } else {
    console.log(currentRow);
  }
}

function draw() {
  // Draw the current state of the channel.
}
