const INTERVAL_TIME = 25;
const SAMPLE_RATE = 44100;
const BPM = 120;
const ROWS_PER_BEAT = 4;

let intervalId = null;
let currentRow = -1;
let audio = null;
let sample = null;

function calculateCurrentRow() {
  // Convert BPM (beats/min) to rows/sec, then map elapsed time to a row index.
  const rowsPerSecond = (BPM * ROWS_PER_BEAT) / 60;
  return Math.floor(audio.currentTime * rowsPerSecond) % pattern.length;
}

class Cell {
  constructor(note, instrument) {
    if (note && note !== "-" && !instrument) {
      throw new Error("Note without instrument");
    }

    this.note = note || null;
    this.instrument = instrument || null;
  }
}

const pattern = [
  new Cell("C-4", 1),
  new Cell("-"),
  new Cell(),
  new Cell("D-4", 1),
];



const playBtn = document.getElementById("play");
playBtn.addEventListener("click", async () => {
  if (intervalId !== null) {
    await stopPlay();
    playBtn.textContent = "Play";
  } else {
    startPlay();
    playBtn.textContent = "Stop";
  }
});

function schedule() {
  currentRow = calculateCurrentRow();
  console.log("Current row:", currentRow);
}

function initAudio() {
  if (audio) return;

  audio = new AudioContext();
  const normalized = new Float32Array(squareWave.length);

  for (let i = 0; i < squareWave.length; i++) {
    normalized[i] = squareWave[i] / 128;
  }

  sample = audio.createBuffer(1, normalized.length, SAMPLE_RATE);
  sample.copyToChannel(normalized, 0);
}

function startPlay() {
  initAudio();
  schedule();
  intervalId = setInterval(schedule, INTERVAL_TIME);
  draw();
}

async function stopPlay() {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }

  if (audio) {
    await audio.close();
    audio = null;
    sample = null;
  }

  draw(); // one final paint with no active row
}

function draw() {
  // Draw the current state of the channel.
}

const squareWave = new Int8Array([
  127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127,
  127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127,
  127, 127, -128, -128, -128, -128, -128, -128, -128, -128, -128, -128, -128,
  -128, -128, -128, -128, -128, -128, -128, -128, -128, -128, -128, -128, -128,
  -128, -128, -128, -128, -128, -128, -128, -128,
]);