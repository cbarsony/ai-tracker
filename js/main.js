import { initGrid, togglePlay, getState, setBpm, getOctave, setOctave } from "./grid-editor.js";

const canvas = document.getElementById("grid-canvas");
const bpmInput = document.getElementById("bpm");
const playBtn = document.getElementById("play-btn");
const statusEl = document.getElementById("status");
const octEl = document.getElementById("oct");

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function updateUI() {
  const st = getState();
  statusEl.textContent = st;
  playBtn.textContent = st === "playing" ? "\u25A0 Stop" : "\u25B6 Play";
  octEl.textContent = getOctave();
}

initGrid(canvas, { getAudioContext, onChange: updateUI });

playBtn.addEventListener("click", () => {
  togglePlay();
  updateUI();
  canvas.focus();
});

bpmInput.addEventListener("input", () => {
  setBpm(parseInt(bpmInput.value, 10) || 120);
});

updateUI();
