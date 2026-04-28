import { Cell, NOTE_OFF } from "./cell.js";
import { squareWave } from "./waveforms.js";

const SAMPLE_RATE = 44100;
const NOTE_DURATION = 0.2;

let Audio = null;
let Sample = null;
let Row = 0;
let NextNoteTime = 0;
let TimerId = null;

const pattern = [
  new Cell(60, 1),
  new Cell(62, 1),
  new Cell(64, 1),
  new Cell(65, 1),
  new Cell(67, 1),
  new Cell(69, 1),
  new Cell(71, 1),
  new Cell(72, 1),
];

document.getElementById("play").addEventListener("click", async () => {
  initAudio();

  if (TimerId) return;

  NextNoteTime = Audio.currentTime;
  scheduleOneNote();
  TimerId = setInterval(scheduleOneNote, NOTE_DURATION * 1000);
});

function noteToFrequency(note) {
  return 440 * Math.pow(2, (note - 69) / 12);
}

function scheduleOneNote() {
  playRow();
  NextNoteTime += NOTE_DURATION;
  Row = (Row + 1) % pattern.length;
}

function playRow() {
  const freq = noteToFrequency(pattern[Row % pattern.length].note);

  const source = Audio.createBufferSource();
  source.buffer = Sample;
  source.loop = true;
  source.playbackRate.value = freq / (SAMPLE_RATE / Sample.length);

  source.connect(Audio.destination);
  source.start(NextNoteTime);
  source.stop(NextNoteTime + NOTE_DURATION);
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
