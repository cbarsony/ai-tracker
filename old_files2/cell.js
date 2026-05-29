// Cell format: 8 chars - "NNNIIEEE"
//   NNN: note - "C-4", "C#5", "---" (empty), "===" (note off)
//   II:  instrument index in hex - "00" .. "FF"
//   EEE: effect - type char + 2 hex digits, or "---"
//
// Effects:
//   Vxx - set this note's volume (xx hex, 0..FF maps to 0..1)
//   Txx - set tempo / BPM (xx hex, 20..255 BPM)
//
// Examples:
//   "C-400V40" - play C4 on instrument 00 at volume 0x40/0xFF
//   "C#502T5A" - play C#5 on instrument 02 and set BPM to 0x5A
//   "===-----" - note off (no effect)
//   "--------" - empty cell

export const EMPTY_CELL = "--------";
export const NOTE_OFF_CELL = "===-----";

export const NOTE_NAMES = ["C-", "C#", "D-", "D#", "E-", "F-", "F#", "G-", "G#", "A-", "A#", "B-"];

export function isEmpty(cellText) {
  return cellText.slice(0, 3) === "---";
}

export function isNoteOff(cellText) {
  return cellText.slice(0, 3) === "===";
}

export function midiToNoteText(midi) {
  const octave = Math.floor(midi / 12) - 1;
  return NOTE_NAMES[((midi % 12) + 12) % 12] + octave;
}

export function noteTextToMidi(noteText) {
  const name = noteText.slice(0, 2);
  const octave = parseInt(noteText[2], 10);
  const semitone = NOTE_NAMES.indexOf(name);
  if (semitone < 0 || Number.isNaN(octave)) return null;
  return (octave + 1) * 12 + semitone;
}

export function hex2(n) {
  return n.toString(16).toUpperCase().padStart(2, "0");
}

function parseEffect(cellText) {
  const eff = cellText.slice(5, 8);
  if (eff === "---") return null;
  const type = eff[0];
  const param = parseInt(eff.slice(1), 16);
  if (Number.isNaN(param)) return null;
  return { type, param };
}

export function parseCell(cellText) {
  const effect = parseEffect(cellText);
  if (isEmpty(cellText)) {
    return effect ? { effect } : null;
  }
  if (isNoteOff(cellText)) {
    return { noteOff: true, effect };
  }
  const midi = noteTextToMidi(cellText);
  const instrument = parseInt(cellText.slice(3, 5), 16);
  if (midi === null || Number.isNaN(instrument)) return null;
  return { midi, instrument, effect };
}
