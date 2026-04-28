import { Cell, NOTE_OFF } from "./cell.js";
import { squareWave } from "./waveforms.js";

const SAMPLE_RATE = 44100;
const BPM = 120;
const ROWS_PER_BEAT = 4;
const LOOKAHEAD = 25;
const SCHEDULE_AHEAD_TIME = 0.1;

let Audio = null;
let Sample = null;
let Row = 0;
let NextRowTime = 0;
let TimerId = null;
let CurrentSource = null;
let CurrentSourceStopTime = 0;

const pattern = [
  new Cell(60, 1),
  new Cell(62, 1),
  new Cell(-1), // note off
  new Cell(65, 1),
  new Cell(67, 1),
  new Cell(null), // sustain
  new Cell(null), // sustain
  new Cell(72, 1),
];

document.getElementById("play").addEventListener("click", async () => {
  initAudio();
  await Audio.resume(); // ensure context is running before scheduling

  if (TimerId) return;

  NextRowTime = Audio.currentTime;
  schedulerTick();
  TimerId = setInterval(schedulerTick, LOOKAHEAD);
});

function noteToFrequency(note) {
  return 440 * Math.pow(2, (note - 69) / 12);
}

function schedulerTick() {
  console.log(`schedulerTick at: ${Audio.currentTime.toFixed(3)}`);
  while (NextRowTime < Audio.currentTime + SCHEDULE_AHEAD_TIME) {
    scheduleRow();
    NextRowTime += 60 / (BPM * ROWS_PER_BEAT);
    Row = (Row + 1) % pattern.length;
  }
}

function scheduleRow() {
  const cell = pattern[Row];
  console.log(
    `Row ${Row}: ${cell.note} (${NextRowTime.toFixed(3)}) at: ${Audio.currentTime.toFixed(3)}`,
  );

  if (cell.note === NOTE_OFF) {
    if (CurrentSource) {
      CurrentSource.stop(NextRowTime);
      CurrentSource = null;
    }
    return;
  }

  if (cell.note === null) {
    // Sustain: extend the current source's stop time
    if (CurrentSource) {
      CurrentSourceStopTime += 60 / (BPM * ROWS_PER_BEAT);
      CurrentSource.stop(CurrentSourceStopTime);
    }
    return;
  }

  // New note: cut off the previous source and start a new one
  if (CurrentSource) {
    CurrentSource.stop(NextRowTime);
  }

  const freq = noteToFrequency(cell.note);
  const source = Audio.createBufferSource();
  source.buffer = Sample;
  source.loop = true;
  source.playbackRate.value = freq / (SAMPLE_RATE / Sample.length);
  source.onended = () => {
    if (CurrentSource === source) CurrentSource = null;
  };

  source.connect(Audio.destination);
  source.start(NextRowTime);

  CurrentSourceStopTime = NextRowTime + 60 / (BPM * ROWS_PER_BEAT);
  source.stop(CurrentSourceStopTime);

  CurrentSource = source;
}

export function initAudio() {
  if (Audio) return;

  Audio = new AudioContext();
  const normalized = new Float32Array(squareWave.length);

  for (let i = 0; i < squareWave.length; i++) {
    normalized[i] = squareWave[i] / 128;
  }

  Sample = Audio.createBuffer(1, normalized.length, SAMPLE_RATE);
  Sample.copyToChannel(normalized, 0);
}
