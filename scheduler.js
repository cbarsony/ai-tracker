import { EFFECT_KEY } from "./song.js";

export const ROWS_PER_BEAT = 4;

export const NOTE_NAMES = [
  "C-", "C#", "D-", "D#", "E-", "F-",
  "F#", "G-", "G#", "A-", "A#", "B-",
];

// Pure function: song in, plain event objects out.
// Walks every row once so BPM changes before `startRow` still count,
// collects only the events from `startRow` onward, and normalizes
// times so that `startRow` lands at t = 0.
export function buildSchedule(song, startBpm, startRow = 0) {
  const events = [];
  let bpm = startBpm;
  let time = 0;

  song.pattern.forEach((row, rowIndex) => {
    // A tempo effect applies on its own row (it sets the row's duration too).
    for (const cell of row) {
      if (cell?.effect?.key === EFFECT_KEY.TEMPO) {
        bpm = parseInt(cell.effect.value, 16);
      }
    }

    if (rowIndex >= startRow) {
      for (const cell of row) {
        if (cell?.pitch) {
          const event = {
            time,
            midi: pitchToMidi(cell.pitch),
            instrument: cell.instrumentId,
          };
          if (cell.effect?.key === EFFECT_KEY.VOLUME) {
            event.volume = parseInt(cell.effect.value, 10);
          }
          events.push(event);
        }
      }

      events.push({ time, type: "tick", row: rowIndex });

      time += 60 / (bpm * ROWS_PER_BEAT);
    }
  });

  events.push({ time, type: "end" });

  return events;
}

export function pitchToMidi(pitch) {
  const semitone = NOTE_NAMES.indexOf(pitch.slice(0, 2));
  const octave = parseInt(pitch[2], 10);
  return (octave + 1) * 12 + semitone;
}
