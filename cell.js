export const NOTE_OFF = -1;

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

export function isEmpty(cell) {
  return cell === null || cell === undefined;
}

export function isNoteOff(cell) {
  return !isEmpty(cell) && cell.note === NOTE_OFF;
}

export function formatNote(midi) {
  const octave = Math.floor(midi / 12) - 1;
  const name = NOTE_NAMES[((midi % 12) + 12) % 12];
  return `${name}${octave}`;
}

export function formatInstrument(instrument) {
  return instrument.toString(16).toUpperCase().padStart(2, "0");
}

export function formatCell(cell) {
  if (isEmpty(cell)) {
    return "--- --";
  }
  if (cell.note === NOTE_OFF) {
    return "=== --";
  }
  return `${formatNote(cell.note)} ${formatInstrument(cell.instrument)}`;
}
