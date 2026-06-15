import { EFFECT_KEY, EndNote } from "./song.js";

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
  // channelIndex -> most recent note event still ringing on that channel,
  // so a later note-off on the same channel can stamp its stop time.
  const openNotes = {};

  song.pattern.forEach((row, rowIndex) => {
    // A tempo effect applies on its own row (it sets the row's duration too).
    for (const cell of row) {
      if (cell?.effect?.key === EFFECT_KEY.TEMPO) {
        bpm = parseInt(cell.effect.value, 16);
      }
    }

    if (rowIndex >= startRow) {
      row.forEach((cell, channelIndex) => {
        // A note-off cuts whatever note is ringing on this channel.
        if (cell instanceof EndNote) {
          if (openNotes[channelIndex]) {
            openNotes[channelIndex].stopTime = time;
            delete openNotes[channelIndex];
          }
          return;
        }

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
          openNotes[channelIndex] = event;
        }
      });

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
