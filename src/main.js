import { Cell } from "./cell.js";
import {
  calculateCurrentRow,
  getTime,
  isPlaying,
  scheduleNote,
  startPlay,
  stopPlay,
} from "./audio.js";

const INTERVAL_TIME = 25;
const BPM = 120;
const ROWS_PER_BEAT = 4;
const ROW_DURATION = 60 / BPM / ROWS_PER_BEAT;

let currentRow = -1;

const pattern = [
  new Cell("C-4", 1),
  new Cell("D-4", 1),
  new Cell("E-4", 1),
  new Cell("F-4", 1),
  new Cell("G-4", 1),
  new Cell("A-4", 1),
  new Cell("B-4", 1),
  new Cell("C-5", 1),
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
    const time = Number(getTime());
    console.log({ time });
    const nextRowTime = calculateNextRowTime();
    currentRow = newCurrentRow;
    /* console.log(
      `${currentRow} ${pattern[currentRow].note} ${pattern[currentRow].instrument}`,
    ); */
    scheduleNote(pattern[currentRow].note, nextRowTime);
  } else {
    /* console.log(currentRow); */
  }
}

function calculateNextRowTime() {
  const time = Number(getTime());
  const rowStart = Math.floor(time / ROW_DURATION) * ROW_DURATION;

  // Use the current row boundary as an absolute AudioContext time.
  return rowStart;
}

function draw() {
  // Draw the current state of the channel.
}
