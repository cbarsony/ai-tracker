// Cell format: 8 chars - "NNNIIEEE"
//   NNN: note        - "C-4", "C#5", "---" (empty), "===" (note off)
//   II:  instrument   - hex index, "00".."FF"
//   EEE: effect       - "Txx" sets BPM (xx hex), "Vxx" sets volume (xx decimal 00-99), or "---" for none
//
// For the timing feature we only care about two things per cell:
//   - is there a note to play? (midi + instrument)
//   - does it change the tempo?

const NOTE_NAMES = [
  "C-",
  "C#",
  "D-",
  "D#",
  "E-",
  "F-",
  "F#",
  "G-",
  "G#",
  "A-",
  "A#",
  "B-",
];

export function parseCell(text) {
  const result = {};

  const noteText = text.slice(0, 3);
  if (noteText !== "---" && noteText !== "===") {
    const semitone = NOTE_NAMES.indexOf(noteText.slice(0, 2));
    const octave = parseInt(noteText[2], 10);
    const instrument = parseInt(text.slice(3, 5), 16);
    result.note = { midi: (octave + 1) * 12 + semitone, instrument };
  }

  const effect = text.slice(5, 8);
  if (effect[0] === "T") {
    result.tempo = parseInt(effect.slice(1), 16);
  }
  if (effect[0] === "V") {
    result.volume = parseInt(effect.slice(1), 10); // decimal 00-99
  }

  return result;
}

// MIDI number -> 3-char note, e.g. 60 -> "C-4". Inverse of parseCell's note.
export function formatNote(midi) {
  const octave = Math.floor(midi / 12) - 1;
  return NOTE_NAMES[midi % 12] + octave;
}

// Return a copy of `cell` with its note + instrument set, effect preserved.
export function writeNote(cell, midi, instrument) {
  const inst = instrument.toString(16).toUpperCase().padStart(2, "0");
  return formatNote(midi) + inst + cell.slice(5, 8);
}

// Return a copy of `cell` with its note + instrument cleared, effect preserved.
export function clearNote(cell) {
  return "-----" + cell.slice(5, 8);
}
