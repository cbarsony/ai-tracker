import { calculatePlaybackRate } from "./note-util.js";
import { getSample, getAudioBuffer } from "./sample-bank.js";
import { createMachine } from "./state-machine.js";
import { Pattern } from "./model.js";

// ── Constants ────────────────────────────────────────────────

const PATTERN_LEN = 16;
const ROWS_PER_BEAT = 4;
const SAMPLE_ID = "00";

// Canvas layout (logical pixels, scaled by devicePixelRatio)
const ROW_H = 28;
const HDR_H = 28;
const ROW_NUM_W = 44;
const W = 280;
const H = HDR_H + PATTERN_LEN * ROW_H;
const CELL_X = ROW_NUM_W;
const CELL_W = W - ROW_NUM_W;

// Playback scroll: now-marker sits 5 rows below header
const NOW_Y = HDR_H + 5 * ROW_H;

// Colors
const COL = {
  bg:       "#0a0a1e",
  hdrBg:    "#0f0f2a",
  hdrTxt:   "#888",
  rowEven:  "#0c0c22",
  rowOdd:   "#0a0a1c",
  rowNum:   "#555",
  rowNumBt: "#777",
  empty:    "#333",
  note:     "#00dd66",
  marker:   "#ffcc00",
  sel:      "rgba(255,255,255,0.12)",
  selBdr:   "#ffffff",
  playRow:  "rgba(255,204,0,0.15)",
  div:      "#222",
  beatLn:   "#2a2a44",
};

// Lookahead scheduler
const LOOKAHEAD = 0.1;
const SCHED_MS = 25;

// FT2 keyboard layout → semitone index
const SEM_NAMES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const KEY_LO = { z:0, s:1, x:2, d:3, c:4, v:5, g:6, b:7, h:8, n:9, j:10, m:11 };
const KEY_HI = { q:0, "2":1, w:2, "3":3, e:4, r:5, "5":6, t:7, "6":8, y:9, "7":10, u:11 };

// ── Module state ─────────────────────────────────────────────

let canvas, ctx, dpr;
let audioCtx = null;
let getAudioCtx = null;

let pattern = null;
let channel = null;
let selRow = 0;
let octave = 4;
let bpm = 120;

let machine = null;

// Scheduler state
let songStart = 0;
let loopStart = 0;
let nextSchedRow = 0;
let schedId = null;
let rafId = null;
let nodes = [];

let onChange = null;

// ── Public API ───────────────────────────────────────────────
/**
 * Initializes the grid editor on the given canvas element.
 * @param {*} canvasEl The canvas element to render the grid editor on.
 * @param {*} options Configuration options for the grid editor. 
 * @param {function} options.getAudioContext A function that returns the AudioContext.
 * @param {function} [options.onChange] A callback function that is called when the grid state changes.
 */
export function initGrid(canvasEl, options) {
  canvas = canvasEl;
  getAudioCtx = options.getAudioContext;
  onChange = options.onChange || null;

  dpr = window.devicePixelRatio || 1;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = W + "px";
  canvas.style.height = H + "px";
  ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);

  pattern = new Pattern(PATTERN_LEN, 1);
  channel = pattern.channel(0);

  machine = createMachine({
    initial: "stopped",
    states: {
      stopped: { on: { PLAY: { target: "playing", action: startPlay } } },
      playing: { on: { STOP: { target: "stopped", action: stopPlay } } },
    },
  });

  canvas.addEventListener("click", onCanvasClick);
  canvas.tabIndex = 0;
  canvas.addEventListener("keydown", onKey);

  draw();
}

export function togglePlay() {
  machine.send(machine.getState() === "stopped" ? "PLAY" : "STOP");
  if (machine.getState() === "stopped") draw();
  fireChange();
}

export function getState()  { return machine?.getState() ?? "stopped"; }
export function getBpm()    { return bpm; }
export function getOctave() { return octave; }

export function setBpm(v)    { bpm = Math.max(30, Math.min(300, v)); }
export function setOctave(v) { octave = Math.max(1, Math.min(8, v)); fireChange(); }

// ── Playback ─────────────────────────────────────────────────

function rowDur() { return 60 / (bpm * ROWS_PER_BEAT); }

function startPlay() {
  audioCtx = getAudioCtx();
  songStart = audioCtx.currentTime + 0.05;
  loopStart = songStart;
  nextSchedRow = 0;
  nodes = [];
  schedule();
  schedId = setInterval(schedule, SCHED_MS);
  renderLoop();
}

function stopPlay() {
  if (schedId !== null) { clearInterval(schedId); schedId = null; }
  if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
  for (const n of nodes) {
    try { n.src.stop(); } catch (_) {}
    try { n.src.disconnect(); } catch (_) {}
    try { n.gain.disconnect(); } catch (_) {}
  }
  nodes = [];
}

// ── Lookahead scheduler ──────────────────────────────────────

function schedule() {
  const rd = rowDur();
  const horizon = audioCtx.currentTime + LOOKAHEAD;

  while (true) {
    const t = loopStart + nextSchedRow * rd;
    if (t > horizon) break;

    if (channel[nextSchedRow].note) {
      schedNote(channel[nextSchedRow].note, t, nextSchedRow, rd);
    }

    nextSchedRow++;
    if (nextSchedRow >= PATTERN_LEN) {
      nextSchedRow = 0;
      loopStart += PATTERN_LEN * rd;
    }
  }
}

function schedNote(noteStr, startT, row, rd) {
  // Duration: rows until next note (wrapping), or full pattern
  let durRows = PATTERN_LEN;
  for (let i = 1; i < PATTERN_LEN; i++) {
    if (channel[(row + i) % PATTERN_LEN].note !== null) {
      durRows = i;
      break;
    }
  }
  const dur = durRows * rd;

  const sample = getSample(SAMPLE_ID);
  const buffer = getAudioBuffer(SAMPLE_ID, audioCtx);
  if (!sample || !buffer) return;

  const rate = calculatePlaybackRate(noteStr, sample.baseNote);

  const src = audioCtx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  src.loopStart = sample.loopStart / sample.sampleRate;
  src.loopEnd = sample.loopEnd / sample.sampleRate;
  src.playbackRate.value = rate;

  const gain = audioCtx.createGain();
  src.connect(gain);
  gain.connect(audioCtx.destination);

  // Envelope: fade in/out to prevent clicks
  const end = startT + dur;
  const fade = Math.min(0.01, dur * 0.1);
  gain.gain.setValueAtTime(0, startT);
  gain.gain.linearRampToValueAtTime(0.3, startT + fade);
  gain.gain.setValueAtTime(0.3, end - fade);
  gain.gain.linearRampToValueAtTime(0, end);

  src.start(startT);
  src.stop(end + 0.05);

  const nodeObj = { src, gain };
  nodes.push(nodeObj);
  src.onended = () => {
    try { src.disconnect(); } catch (_) {}
    try { gain.disconnect(); } catch (_) {}
    const i = nodes.indexOf(nodeObj);
    if (i !== -1) nodes.splice(i, 1);
  };
}

// ── Note preview (plays short blip when editing) ─────────────

function previewNote(noteStr) {
  if (!audioCtx) return;
  const sample = getSample(SAMPLE_ID);
  const buffer = getAudioBuffer(SAMPLE_ID, audioCtx);
  if (!sample || !buffer) return;

  const rate = calculatePlaybackRate(noteStr, sample.baseNote);
  const src = audioCtx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  src.loopStart = sample.loopStart / sample.sampleRate;
  src.loopEnd = sample.loopEnd / sample.sampleRate;
  src.playbackRate.value = rate;

  const gain = audioCtx.createGain();
  src.connect(gain);
  gain.connect(audioCtx.destination);

  const now = audioCtx.currentTime;
  gain.gain.setValueAtTime(0.25, now);
  gain.gain.linearRampToValueAtTime(0, now + 0.2);
  src.start();
  src.stop(now + 0.25);
}

// ── Rendering ────────────────────────────────────────────────

function renderLoop() {
  draw();
  rafId = requestAnimationFrame(renderLoop);
}

function draw() {
  ctx.fillStyle = COL.bg;
  ctx.fillRect(0, 0, W, H);
  drawHeader();

  if (machine?.getState() === "playing") {
    drawPlayingView();
  } else {
    drawStoppedView();
  }
}

function drawHeader() {
  ctx.fillStyle = COL.hdrBg;
  ctx.fillRect(0, 0, W, HDR_H);
  ctx.fillStyle = COL.hdrTxt;
  ctx.font = "bold 11px monospace";
  ctx.textBaseline = "middle";
  ctx.fillText("ROW", 8, HDR_H / 2);
  ctx.fillText("NOTE", CELL_X + 10, HDR_H / 2);
  ctx.strokeStyle = COL.div;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, HDR_H - 0.5);
  ctx.lineTo(W, HDR_H - 0.5);
  ctx.stroke();
}

function drawStoppedView() {
  for (let i = 0; i < PATTERN_LEN; i++) {
    drawRow(i, HDR_H + i * ROW_H, false, i === selRow);
  }
}

function drawPlayingView() {
  const elapsed = audioCtx.currentTime - songStart;
  const rd = rowDur();
  const totalRows = elapsed / rd;
  const curRow = ((totalRows % PATTERN_LEN) + PATTERN_LEN) % PATTERN_LEN;
  const intRow = Math.floor(curRow);
  const frac = curRow - intRow;

  // Clip rows to content area (below header)
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, HDR_H, W, H - HDR_H);
  ctx.clip();

  for (let i = -6; i <= 12; i++) {
    const ri = ((intRow + i) % PATTERN_LEN + PATTERN_LEN) % PATTERN_LEN;
    const y = NOW_Y + (i - frac) * ROW_H;
    if (y + ROW_H < HDR_H || y > H) continue;
    drawRow(ri, y, i === 0, false);
  }

  ctx.restore();

  // Now-marker line (drawn outside clip for full visibility)
  ctx.save();
  ctx.strokeStyle = COL.marker;
  ctx.lineWidth = 2;
  ctx.shadowColor = COL.marker;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(0, NOW_Y);
  ctx.lineTo(W, NOW_Y);
  ctx.stroke();
  ctx.restore();
}

function drawRow(ri, y, isCurrent, isSel) {
  // Background
  if (isCurrent) {
    ctx.fillStyle = COL.playRow;
  } else if (isSel) {
    ctx.fillStyle = COL.sel;
  } else {
    ctx.fillStyle = ri % 2 === 0 ? COL.rowEven : COL.rowOdd;
  }
  ctx.fillRect(0, y, W, ROW_H);

  // Beat separator (every 4 rows)
  if (ri % ROWS_PER_BEAT === 0) {
    ctx.strokeStyle = COL.beatLn;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(W, y + 0.5);
    ctx.stroke();
  }

  // Row number (hex)
  ctx.fillStyle = ri % ROWS_PER_BEAT === 0 ? COL.rowNumBt : COL.rowNum;
  ctx.font = "12px monospace";
  ctx.textBaseline = "middle";
  ctx.fillText(ri.toString(16).toUpperCase().padStart(2, "0"), 10, y + ROW_H / 2);

  // Column divider
  ctx.strokeStyle = COL.div;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(ROW_NUM_W - 0.5, y);
  ctx.lineTo(ROW_NUM_W - 0.5, y + ROW_H);
  ctx.stroke();

  // Note text
  const cell = channel[ri];
  ctx.fillStyle = cell.note ? COL.note : COL.empty;
  ctx.font = "13px monospace";
  ctx.fillText(cell.note || "---", CELL_X + 10, y + ROW_H / 2);

  // Selection border
  if (isSel) {
    ctx.strokeStyle = COL.selBdr;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(CELL_X + 2, y + 1.5, CELL_W - 4, ROW_H - 3);
  }
}

// ── Input handling ───────────────────────────────────────────

function onCanvasClick(e) {
  canvas.focus();
  // Ensure AudioContext exists on first click (user gesture)
  if (getAudioCtx) audioCtx = getAudioCtx();

  if (machine?.getState() === "playing") return;

  const rect = canvas.getBoundingClientRect();
  const y = e.clientY - rect.top;
  if (y < HDR_H) return;

  const row = Math.floor((y - HDR_H) / ROW_H);
  if (row >= 0 && row < PATTERN_LEN) {
    selRow = row;
    draw();
  }
}

function onKey(e) {
  // Space toggles play/stop always
  if (e.code === "Space") {
    e.preventDefault();
    togglePlay();
    return;
  }

  // No editing while playing
  if (machine?.getState() === "playing") return;
  if (e.ctrlKey || e.altKey || e.metaKey) return;

  // Delete
  if (e.code === "Delete" || e.code === "Backspace") {
    e.preventDefault();
    channel[selRow].note = null;
    selRow = Math.min(selRow + 1, PATTERN_LEN - 1);
    draw();
    return;
  }

  // Navigation
  if (e.code === "ArrowUp") {
    e.preventDefault();
    selRow = Math.max(0, selRow - 1);
    draw();
    return;
  }
  if (e.code === "ArrowDown") {
    e.preventDefault();
    selRow = Math.min(PATTERN_LEN - 1, selRow + 1);
    draw();
    return;
  }

  // Octave change
  if (e.key === "+" || e.code === "NumpadAdd") {
    e.preventDefault();
    setOctave(octave + 1);
    return;
  }
  if (e.key === "-" || e.code === "NumpadSubtract") {
    e.preventDefault();
    setOctave(octave - 1);
    return;
  }

  // Note input (FT2 keyboard layout)
  const k = e.key.toLowerCase();
  let semi = null;
  let octOff = 0;

  if (k in KEY_LO)      { semi = KEY_LO[k]; octOff = 0; }
  else if (k in KEY_HI) { semi = KEY_HI[k]; octOff = 1; }

  if (semi !== null) {
    e.preventDefault();
    const o = octave + octOff;
    if (o >= 1 && o <= 8) {
      const noteStr = `${SEM_NAMES[semi]}-${o}`;
      channel[selRow].note = noteStr;
      previewNote(noteStr);
      selRow = Math.min(selRow + 1, PATTERN_LEN - 1);
      draw();
    }
  }
}

function fireChange() {
  if (onChange) onChange();
}
