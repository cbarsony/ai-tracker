import { squareWave } from "./waveforms.js";

const SAMPLE_RATE = 44100;

let intervalId = null;
let audio = null;
let sample = null;

export function isPlaying() {
  return intervalId !== null;
}

export function calculateCurrentRow({ bpm, rowsPerBeat, patternLength }) {
  if (!audio || patternLength <= 0) {
    return -1;
  }

  // Convert BPM (beats/min) to rows/sec, then map elapsed time to a row index.
  const rowsPerSecond = (bpm * rowsPerBeat) / 60;
  return Math.floor(audio.currentTime * rowsPerSecond) % patternLength;
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

export function startPlay({ intervalTime, onSchedule }) {
  initAudio();
  onSchedule();
  intervalId = setInterval(onSchedule, intervalTime);
}

const SEMITONES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export function playNote(note) {
  if (!audio || !note || note === "-") return;
  const noteMidiKey = (parseInt(note[2], 10) + 1) * 12 + SEMITONES[note[0]] + (note[1] === "#" ? 1 : 0);
  const freq = 440 * 2 ** ((noteMidiKey - 69) / 12);

  const sound = audio.createBufferSource();
  sound.buffer = sample;
  sound.loop = true;
  sound.playbackRate.value = freq / (SAMPLE_RATE / sample.length);
  
  sound.connect(audio.destination);
  sound.start();
  sound.stop(audio.currentTime + 60 / 120 / 4); // one row duration
}

export async function stopPlay() {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }

  if (audio) {
    await audio.close();
    audio = null;
    sample = null;
  }
}
