import { Cell, NOTE_OFF } from "./cell.js";
import { squareWave } from "./waveforms.js";

const SAMPLE_RATE = 44100;
const NOTE_DURATION = 0.2;
const LOOKAHEAD = 50;

let Audio = null;
let Sample = null;
let Row = 0;
let NextNoteTime = 0;
let TimerId = null;
let CurrentSource = null;
let CurrentSourceStopTime = 0;

const pattern = [
  new Cell(60, 1),
  new Cell(62, 1),
  new Cell(-1),    // note off
  new Cell(65, 1),
  new Cell(67, 1),
  new Cell(null),  // sustain
  new Cell(null),  // sustain
  new Cell(72, 1),
];

document.getElementById("play").addEventListener("click", async () => {
  initAudio();

  if (TimerId) return;

  NextNoteTime = Audio.currentTime;
  scheduleOneNote();
  TimerId = setInterval(scheduleOneNote, LOOKAHEAD);
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
  const cell = pattern[Row % pattern.length];

  if (cell.note === NOTE_OFF) {
    if (CurrentSource) {
      CurrentSource.stop(NextNoteTime);
      CurrentSource = null;
    }
    return;
  }

  if (cell.note === null) {
    // Sustain: extend the current source's stop time
    if (CurrentSource) {
      CurrentSourceStopTime += NOTE_DURATION;
      CurrentSource.stop(CurrentSourceStopTime);
    }
    return;
  }

  // New note: cut off the previous source and start a new one
  if (CurrentSource) {
    CurrentSource.stop(NextNoteTime);
  }

  const freq = noteToFrequency(cell.note);
  const source = Audio.createBufferSource();
  source.buffer = Sample;
  source.loop = true;
  source.playbackRate.value = freq / (SAMPLE_RATE / Sample.length);
  source.onended = () => { if (CurrentSource === source) CurrentSource = null; };

  source.connect(Audio.destination);
  source.start(NextNoteTime);

  CurrentSourceStopTime = NextNoteTime + NOTE_DURATION;
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
