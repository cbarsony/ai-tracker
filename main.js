// ── Audio + sample setup ─────────────────────────────────────

/** @type {AudioContext|null} */
let audio = null;
/** @type {AudioBuffer|null} */
let sample = null;

const SAMPLE_LEN = 64;        // samples per loop period
const SAMPLE_RATE = 44100;
// Frequency of the loop at playbackRate=1.0 → use it as the sample's "base note"
const BASE_FREQ = SAMPLE_RATE / SAMPLE_LEN; // 689.0625 Hz (~F-5)

const squareWave = new Int8Array([
  127, 127, 127, 127, 127, 127, 127, 127,
  127, 127, 127, 127, 127, 127, 127, 127,
  127, 127, 127, 127, 127, 127, 127, 127,
  127, 127, 127, 127, 127, 127, 127, 127,
 -128,-128,-128,-128,-128,-128,-128,-128,
 -128,-128,-128,-128,-128,-128,-128,-128,
 -128,-128,-128,-128,-128,-128,-128,-128,
 -128,-128,-128,-128,-128,-128,-128,-128,
]);

function ensureAudio() {
  if (audio) return;
  audio = new AudioContext();

  const normalized = new Float32Array(squareWave.length);
  for (let i = 0; i < squareWave.length; i++) {
    normalized[i] = squareWave[i] / 128;
  }
  sample = audio.createBuffer(1, normalized.length, SAMPLE_RATE);
  sample.copyToChannel(normalized, 0);
}

// ── Note → frequency → playback rate ─────────────────────────

const SEMITONES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const A4_INDEX = 4 * 12 + 9; // 57

function noteToFrequency(noteStr) {
  const m = noteStr.match(/^([A-G]#?)-(\d)$/);
  if (!m) return null;
  const semi = SEMITONES.indexOf(m[1]);
  const octave = parseInt(m[2], 10);
  const idx = octave * 12 + semi;
  return 440 * Math.pow(2, (idx - A4_INDEX) / 12);
}

function playbackRateFor(noteStr) {
  const f = noteToFrequency(noteStr);
  return f ? f / BASE_FREQ : 1.0;
}

// ── Data model: 1 channel × 4 cells ──────────────────────────
//
// cell.note semantics:
//   null      → "sustain": no event, the previous note keeps playing
//   "C-4" etc → trigger a new note
//   NOTE_OFF  → stop the currently playing note (tracker convention: ===)

const NOTE_OFF = "===";

class Cell {
  constructor() { this.note = null; }
}

const PATTERN_LEN = 4;
const channel = Array.from({ length: PATTERN_LEN }, () => new Cell());
channel[0].note = "C-4";
channel[2].note = NOTE_OFF;
channel[3].note = "D-4";

// ── Timing ───────────────────────────────────────────────────

const BPM = 120;
const ROWS_PER_BEAT = 4;
const getRowDuration = () => 60 / (BPM * ROWS_PER_BEAT); // 0.125 s @ 120 BPM

// ── Lookahead scheduler ──────────────────────────────────────

const LOOKAHEAD = 0.1;   // seconds of audio to schedule ahead
const SCHED_MS = 25;     // how often the scheduler runs

let songStart = 0;       // AudioContext time when row 0 first plays
let loopStart = 0;       // AudioContext time of the current loop iteration's row 0
let nextSchedRow = 0;    // next row index to schedule
let schedId = null;
let rafId = null;
let masterGain = null;   // all voices route through this; disconnected on stop

function startPlay() {
  ensureAudio();
  if (audio.state === "suspended") audio.resume();
  masterGain = audio.createGain();
  masterGain.connect(audio.destination);
  songStart = audio.currentTime + 0.05;
  loopStart = songStart;
  nextSchedRow = 0;
  schedule();
  schedId = setInterval(schedule, SCHED_MS);
  renderLoop();
}

function stopPlay() {
  if (schedId !== null) { clearInterval(schedId); schedId = null; }
  if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
  if (masterGain) { masterGain.disconnect(); masterGain = null; }
  draw(); // one final paint with no active row
}

function schedule() {
  const rowDuration = getRowDuration();
  const horizon = audio.currentTime + LOOKAHEAD;

  while (true) {
    const t = loopStart + nextSchedRow * rowDuration;
    if (t > horizon) break;

    const cell = channel[nextSchedRow];
    // Only real notes trigger playback; NOTE_OFF and null don't.
    // (NOTE_OFF still acts as a terminator for the previous note's duration.)
    if (cell.note && cell.note !== NOTE_OFF) {
      schedNote(cell.note, t, nextSchedRow, rowDuration);
    }

    nextSchedRow++;
    if (nextSchedRow >= PATTERN_LEN) {
      nextSchedRow = 0;
      loopStart += PATTERN_LEN * rowDuration;
    }
  }
}

function schedNote(noteStr, startT, row, rd) {
  // Duration: rows until the next note OR NOTE_OFF (wrapping), capped at
  // PATTERN_LEN - 1 to prevent voice stacking when a note is alone in the
  // pattern. `null` cells mean "sustain", so we skip past them.
  let durRows = PATTERN_LEN - 1;
  for (let i = 1; i < PATTERN_LEN; i++) {
    const next = channel[(row + i) % PATTERN_LEN].note;
    if (next !== null) { // any non-null event terminates: new note or NOTE_OFF
      durRows = i;
      break;
    }
  }
  const dur = durRows * rd;

  const src = audio.createBufferSource();
  src.buffer = sample;
  src.loop = true;
  src.loopStart = 0;
  src.loopEnd = SAMPLE_LEN / SAMPLE_RATE;
  src.playbackRate.value = playbackRateFor(noteStr);

  const gain = audio.createGain();
  src.connect(gain);
  gain.connect(masterGain);

  // Tiny fade in/out to avoid clicks
  const end = startT + dur;
  const fade = Math.min(0.01, dur * 0.1);
  gain.gain.setValueAtTime(0, startT);
  gain.gain.linearRampToValueAtTime(0.3, startT + fade);
  gain.gain.setValueAtTime(0.3, end - fade);
  gain.gain.linearRampToValueAtTime(0, end);

  src.start(startT);
  src.stop(end + 0.05);
}

// ── Rendering ────────────────────────────────────────────────

const canvas = document.getElementById("grid");
const ctx = canvas.getContext("2d");

const ROW_H = 40;
const W = 200;
const H = ROW_H * PATTERN_LEN;

const dpr = window.devicePixelRatio || 1;
canvas.width = W * dpr;
canvas.height = H * dpr;
canvas.style.width = W + "px";
canvas.style.height = H + "px";
ctx.scale(dpr, dpr);

function renderLoop() {
  draw();
  rafId = requestAnimationFrame(renderLoop);
}

function draw() {
  ctx.fillStyle = "#0a0a1e";
  ctx.fillRect(0, 0, W, H);

  const playing = schedId !== null;
  const activeRow = playing
    ? Math.floor((audio.currentTime - songStart) / getRowDuration()) % PATTERN_LEN
    : -1;

  for (let i = 0; i < PATTERN_LEN; i++) {
    drawRow(i, i * ROW_H, i === activeRow);
  }
}

function drawRow(ri, y, isCurrent) {
  ctx.fillStyle = isCurrent ? "rgba(255,204,0,0.15)"
                            : (ri % 2 === 0 ? "#0c0c22" : "#0a0a1c");
  ctx.fillRect(0, y, W, ROW_H);

  // Row number
  ctx.fillStyle = "#777";
  ctx.font = "14px monospace";
  ctx.textBaseline = "middle";
  ctx.fillText(ri.toString(), 12, y + ROW_H / 2);

  // Note text
  const cell = channel[ri];
  let label, color;
  if (cell.note === null)          { label = "---"; color = "#333"; }
  else if (cell.note === NOTE_OFF) { label = NOTE_OFF; color = "#cc4444"; }
  else                             { label = cell.note; color = "#00dd66"; }
  ctx.fillStyle = color;
  ctx.font = "16px monospace";
  ctx.fillText(label, 50, y + ROW_H / 2);
}

// ── UI ───────────────────────────────────────────────────────

const playBtn = document.getElementById("play");
playBtn.addEventListener("click", () => {
  if (schedId !== null) {
    stopPlay();
    playBtn.textContent = "Play";
  } else {
    startPlay();
    playBtn.textContent = "Stop";
  }
});
