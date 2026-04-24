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
