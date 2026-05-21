import { createMachine } from "./statechart.js";
import { appMachineConfig } from "./app-machine.js";
import { Scheduler } from "./scheduler.js";
import { song } from "./song.js";

const BPM = 140;
const ROWS_PER_BEAT = 4;
const ROW_DURATION_SECONDS = 60 / (BPM * ROWS_PER_BEAT);

// A cell whose first three chars are "---" carries no note.
function notesInRow(row) {
  return row
    .map((cell, channel) => ({ channel, note: cell.slice(0, 3) }))
    .filter(({ note }) => note !== "---");
}

const playButton = document.getElementById("play");
const statusEl = document.getElementById("status");

let audioContext = null;
let scheduler = null;

const machine = createMachine(appMachineConfig, {
  actions: {
    startScheduler: () => {
      if (!audioContext) audioContext = new AudioContext();
      audioContext.resume();

      scheduler = new Scheduler({
        audioContext,
        rowDurationSeconds: ROW_DURATION_SECONDS,
        onNextRow: (event) => machine.send({ type: "NEXT_ROW", ...event }),
      });
      scheduler.start();
    },
    stopScheduler: () => {
      scheduler?.stop();
      scheduler = null;
    },
    logNextRow: (event) => {
      const row = song.pattern[event.rowIndex % song.pattern.length];
      const notes = notesInRow(row);
      const notesText = notes.length
        ? " notes: " + notes.map((n) => `ch${n.channel}=${n.note}`).join(", ")
        : "";
      console.log(`row ${event.rowIndex} @ ${event.time.toFixed(3)}s${notesText}`);
    },
  },
});

machine.subscribe((state) => {
  statusEl.textContent = state === "playing" ? "Playing" : "Stopped";
  playButton.textContent = state === "playing" ? "Stop" : "Play";
});

playButton.addEventListener("click", () => machine.send("TOGGLE_PLAY"));
