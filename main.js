import { squareWave } from "./waveforms.js";

const NOTE_OFF = -1;
const SAMPLE_RATE = 44100;

export class Cell {
  /**
   * Represents a single cell in the tracker.
   *
   * @param {number|null} note The MIDI note number or null for no note. 0 - 127, or -1 for NOTE_OFF.
   * @param {number|null} instrument The instrument number or null for no instrument.
   */
  constructor(note, instrument) {
    const isRealNote = typeof note === "number" && note !== NOTE_OFF;
    if (isRealNote && !instrument) {
      throw new Error("Note without instrument");
    }

    this.note = note ?? null;
    this.instrument = instrument || null;
  }
}

let audio = null;
let sample = null;
let row = 0;
let nextNoteTime = 0;
let timerId = null;
const noteDuration = 0.5;

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

const playBtn = document.getElementById("play");

playBtn.addEventListener("click", async () => {
  initAudio();

  if (timerId) return;

  nextNoteTime = audio.currentTime;
  scheduleOneNote();
  timerId = setInterval(scheduleOneNote, noteDuration * 1000);
});

function noteToFrequency(note) {
  return 440 * Math.pow(2, (note - 69) / 12);
}

function scheduleOneNote() {
  playRow();
  nextNoteTime += noteDuration;
  row = (row + 1) % pattern.length;
}

function playRow() {
  const freq = noteToFrequency(pattern[row % pattern.length].note);

  const source = audio.createBufferSource();
  source.buffer = sample;
  source.loop = true;
  source.playbackRate.value = freq / (SAMPLE_RATE / sample.length);

  source.connect(audio.destination);
  source.start(nextNoteTime);
  source.stop(nextNoteTime + noteDuration);
}

export function initAudio() {
  if (audio) return;

  audio = new AudioContext();
  const normalized = new Float32Array(squareWave.length);

  for (let i = 0; i < squareWave.length; i++) {
    normalized[i] = squareWave[i] / 128;
  }

  sample = audio.createBuffer(1, normalized.length, SAMPLE_RATE);
  sample.copyToChannel(normalized, 0);
}
