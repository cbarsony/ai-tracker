import { parseCell } from "./cell.js";

export const ROWS_PER_BEAT = 4;

// Pure function: song in, plain event objects out.
// Walks every row once so BPM changes before `startRow` still count,
// collects only the events from `startRow` onward, and normalizes
// times so that `startRow` lands at t = 0.
export function buildSchedule(song, startBpm, startRow = 0) {
  const events = [];
  let bpm = startBpm;
  let time = 0;

  song.pattern.forEach((row, rowIndex) => {
    const cells = row.map(parseCell);

    // A tempo effect applies on its own row (it sets the row's duration too).
    for (const cell of cells) {
      if (cell.tempo) bpm = cell.tempo;
    }

    if (rowIndex >= startRow) {
      for (const cell of cells) {
        if (cell.note) {
          const event = { time, ...cell.note };
          if (cell.volume !== undefined) event.volume = cell.volume;
          events.push(event);
        }
      }
      time += 60 / (bpm * ROWS_PER_BEAT);
    }
  });

  return events;
}
