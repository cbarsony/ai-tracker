// Cell format: 8 chars - "NNNIIEEE"
//   NNN: note        - "C-4", "C#5", "---" (empty), "===" (note off)
//   II:  instrument   - hex index, "00".."FF"
//   EEE: effect       - "Txx" sets BPM (xx hex), or "---" for none
//
// For the timing feature we only care about two things per cell:
//   - is there a note to play? (midi + instrument)
//   - does it change the tempo?

const NOTE_NAMES = ["C-", "C#", "D-", "D#", "E-", "F-", "F#", "G-", "G#", "A-", "A#", "B-"];

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

  return result;
}
