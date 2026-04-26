import { Cell } from "./cell.js";
import {
  getAudioTime,
  initAudio,
  isPlaying,
  startNoteAt,
  startScheduler,
  stopPlay,
  stopSourceAt,
} from "./audio.js";

const TIMER_INTERVAL = 25; // ms between scheduler ticks
const SCHEDULE_AHEAD_TIME = 0.1; // seconds of audio scheduled in advance
const BPM = 120;
const ROWS_PER_BEAT = 4;
const ROW_DURATION = 60 / BPM / ROWS_PER_BEAT; // seconds per row

const pattern = [
  new Cell("C-4", 1),
  new Cell(null), // sustain previous note
  new Cell("E-4", 1),
  new Cell("-"), // note-off
  new Cell("G-4", 1),
  new Cell(null), // sustain
  new Cell(null), // sustain
  new Cell("C-5", 1),
];

// Scheduler state — when the next row should sound, and which row it is.
let nextRowTime = 0;
let nextRowIndex = 0;

// Sustain state, owned by the scheduler. `activeSource` is the
// BufferSourceNode currently sounding (or scheduled to start soon);
// it is stopped exactly when the next non-empty cell is scheduled.
//
// Race-condition notes:
//   * Both reads and writes happen only inside `scheduler()` and the
//     play/stop click handler — both run on the JS main thread, so no
//     two callbacks ever interleave on this state.
//   * On Stop, `clearTimeout` (inside stopPlay) prevents any further
//     scheduler tick, then we synchronously drop `activeSource` before
//     the AudioContext is closed, so no stale node can leak into the
//     next session.
let activeSource = null;

// Visual queue: rows already scheduled, waiting for their playback moment.
const rowsInQueue = [];
let currentRow = -1;
let rafId = null;

const playBtn = document.getElementById("play");
playBtn.addEventListener("click", async () => {
  if (isPlaying()) {
    // stopPlay() clears the scheduler timeout *before* it closes the
    // AudioContext, so no scheduler tick can run between these lines.
    await stopPlay();
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    rowsInQueue.length = 0;
    currentRow = -1;
    // Drop the source ref synchronously — the context is already closed
    // so the node is dead, but we mustn't carry it into the next session.
    activeSource = null;
    playBtn.textContent = "Play";
    draw();
  } else {
    initAudio();
    nextRowIndex = 0;
    nextRowTime = getAudioTime();
    activeSource = null;
    startScheduler({
      scheduleAheadTime: SCHEDULE_AHEAD_TIME,
      timerInterval: TIMER_INTERVAL,
      onTick: scheduler,
    });
    rafId = requestAnimationFrame(draw);
    playBtn.textContent = "Stop";
  }
});

// Schedule every row whose start falls inside the lookahead window.
// Using `while` (not `if`) avoids missing rows on a delayed timer tick
// or at very high tempos.
//
// Sustain semantics (tracker convention):
//   * empty cell  (note === null)  → keep the active note ringing
//   * real note   ("C-4", "F#5"…)  → stop active note at this row's start,
//                                     start the new note at the same time
//   * note-off    ("-")            → stop active note at this row's start
function scheduler(scheduleUntil) {
  while (nextRowTime < scheduleUntil) {
    const cell = pattern[nextRowIndex];
    const note = cell.note;

    if (note === null) {
      // Sustain: do nothing — `activeSource` keeps looping.
    } else {
      // Either a real note or a note-off — both stop whatever is sounding
      // exactly at this row boundary, so the cut is sample-accurate.
      if (activeSource) {
        stopSourceAt(activeSource, nextRowTime);
        activeSource = null;
      }
      if (note !== "-") {
        activeSource = startNoteAt(note, nextRowTime);
      }
    }

    rowsInQueue.push({ row: nextRowIndex, time: nextRowTime });

    // Advance by duration, not wall clock, so tempo changes apply
    // immediately on the next iteration.
    nextRowTime += ROW_DURATION;
    nextRowIndex = (nextRowIndex + 1) % pattern.length;
  }
}

// Visuals run on requestAnimationFrame, but the decision of which row
// is currently sounding is made against the audio clock — not rAF time.
function draw() {
  const now = getAudioTime();
  let rowChanged = false;
  let rowStartTime = 0;
  while (rowsInQueue.length > 0 && rowsInQueue[0].time <= now) {
    const entry = rowsInQueue.shift();
    currentRow = entry.row;
    rowStartTime = entry.time;
    rowChanged = true;
  }

  if (rowChanged) {
    renderGrid(now, rowStartTime);
  }

  if (isPlaying()) {
    rafId = requestAnimationFrame(draw);
  }
}

// Mimic a music tracker grid editor in the console: each non-playing row is
// dim, the currently sounding row is highlighted with a `>` playhead, and a
// header shows the important timing values.
function renderGrid(now, rowStartTime) {
  const pad2 = (n) => String(n).padStart(2, "0");
  const f3 = (n) => n.toFixed(3);

  console.clear();
  console.log(
    `BPM ${BPM}   row ${ROW_DURATION.toFixed(4)}s   ` +
      `t=${f3(now)}s   row-start=${f3(rowStartTime)}s   ` +
      `next-sched=${f3(nextRowTime)}s   queued=${rowsInQueue.length}`,
  );
  console.log("┌─────┬──────┬──────┐");
  console.log("│ Row │ Note │ Inst │");
  console.log("├─────┼──────┼──────┤");
  for (let i = 0; i < pattern.length; i++) {
    const cell = pattern[i];
    const marker = i === currentRow ? ">" : " ";
    // Tracker convention: "···" = sustain (empty), "---" = note-off.
    let note;
    if (cell.note === null) note = "···";
    else if (cell.note === "-") note = "---";
    else note = cell.note;
    note = note.padEnd(4, " ");
    const inst = cell.instrument == null ? "··" : String(cell.instrument).padStart(2, "0");
    console.log(`│${marker} ${pad2(i)} │ ${note} │  ${inst}  │`);
  }
  console.log("└─────┴──────┴──────┘");
}
