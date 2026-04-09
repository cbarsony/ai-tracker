import { NOTE_NAMES } from "./note-util.js";
import { getAllSampleMeta } from "./sample-bank.js";
import { init, playNote, stopNote, stopAll, getChannelState, getChannelCount } from "./audio-engine.js";

const channelSelect = document.getElementById("channel-select");
const sampleSelect = document.getElementById("sample-select");
const noteSelect = document.getElementById("note-select");
const playBtn = document.getElementById("play-btn");
const stopBtn = document.getElementById("stop-btn");
const stopAllBtn = document.getElementById("stop-all-btn");

// Populate channel selector
const channelCount = getChannelCount();
for (let i = 0; i < channelCount; i++) {
  const option = document.createElement("option");
  option.value = i;
  option.textContent = i;
  channelSelect.appendChild(option);
}

// Populate sample selector
for (const { id, name } of getAllSampleMeta()) {
  const option = document.createElement("option");
  option.value = id;
  option.textContent = `${id} - ${name}`;
  sampleSelect.appendChild(option);
}

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
  for (let i = 0; i < channelCount; i++) {
    document.getElementById(`status-${i}`).textContent = getChannelState(i);
  }
}

playBtn.addEventListener("click", () => {
  if (!initialized) {
    init();
    initialized = true;
  }
  const ch = parseInt(channelSelect.value, 10);
  playNote(ch, sampleSelect.value, noteSelect.value);
  updateStatus();
});

stopBtn.addEventListener("click", () => {
  const ch = parseInt(channelSelect.value, 10);
  stopNote(ch);
  updateStatus();
});

stopAllBtn.addEventListener("click", () => {
  stopAll();
  updateStatus();
});
