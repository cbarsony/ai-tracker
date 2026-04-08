import { NOTE_NAMES } from "./note-util.js";
import { init, playNote, stopNote, getState } from "./audio-engine.js";

const noteSelect = document.getElementById("note-select");
const playBtn = document.getElementById("play-btn");
const stopBtn = document.getElementById("stop-btn");
const statusEl = document.getElementById("status");

// Populate note selector
for (const name of NOTE_NAMES) {
  const option = document.createElement("option");
  option.value = name;
  option.textContent = name;
  if (name === "C-4") option.selected = true;
  noteSelect.appendChild(option);
}

let initialized = false;

function updateStatus() {
  statusEl.textContent = getState();
}

playBtn.addEventListener("click", () => {
  if (!initialized) {
    init();
    initialized = true;
  }
  playNote("00", noteSelect.value);
  updateStatus();
});

stopBtn.addEventListener("click", () => {
  stopNote();
  updateStatus();
});
