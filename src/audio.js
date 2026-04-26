import { squareWave } from "./waveforms.js";

const SAMPLE_RATE = 44100;
const SEMITONES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

let audio = null;
let sample = null;
let timerId = null;

export function isPlaying() {
  return timerId !== null;
}

export function getAudioTime() {
  return audio ? audio.currentTime : 0;
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

// Start a looping note at the given AudioContext time. Returns the source
// node so the caller can later schedule its `stop()` precisely. Returns
// null if the context is gone or the cell is not a real note.
export function startNoteAt(note, time) {
  if (!audio || !note || note === "-") return null;

  const noteMidiKey =
    (parseInt(note[2], 10) + 1) * 12 +
    SEMITONES[note[0]] +
    (note[1] === "#" ? 1 : 0);
  const freq = 440 * 2 ** ((noteMidiKey - 69) / 12);

  const source = audio.createBufferSource();
  source.buffer = sample;
  source.loop = true;
  source.playbackRate.value = freq / (SAMPLE_RATE / sample.length);

  source.connect(audio.destination);
  source.start(time);
  return source;
}

// Schedule `source.stop()` at the given AudioContext time. Safe to call
// with a null source (e.g. when there is nothing currently sounding).
export function stopSourceAt(source, time) {
  if (!audio || !source) return;
  try {
    source.stop(time);
  } catch {
    // Already stopped — nothing to do.
  }
}

// Lookahead scheduler: every `timerInterval` ms, invoke
// `onTick(scheduleUntil)` where
//   scheduleUntil = audioContext.currentTime + scheduleAheadTime.
// The caller is responsible for scheduling any events whose time falls
// before `scheduleUntil` (typically inside a `while` loop).
export function startScheduler({ scheduleAheadTime, timerInterval, onTick }) {
  const tick = () => {
    onTick(audio.currentTime + scheduleAheadTime);
    timerId = setTimeout(tick, timerInterval);
  };
  tick();
}

export async function stopPlay() {
  if (timerId !== null) {
    clearTimeout(timerId);
    timerId = null;
  }

  if (audio) {
    await audio.close();
    audio = null;
    sample = null;
  }
}
