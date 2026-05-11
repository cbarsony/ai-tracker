export const NOTE_OFF = -1;

const SEMITONES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export class Cell {
  constructor(note, instrument, effect) {
    const hasNote = typeof note === "number" && note !== NOTE_OFF;
    if (hasNote && instrument === null) {
      throw new Error("A note cell must include an instrument number");
    }

    this.note = note;
    this.instrument = instrument;
    this.effect = effect;
  }
}

export function parseCell(cellText, rowIndex, columnIndex) {
  if (typeof cellText !== "string" || cellText.length !== 8) {
    throw new Error(
      `Invalid cell at row ${rowIndex}, column ${columnIndex}: ${cellText}`,
    );
  }

  const noteText = cellText.slice(0, 3);
  const instrumentText = cellText.slice(3, 5);
  const effectText = cellText.slice(5, 8);

  if (effectText !== "---") {
    throw new Error(
      `Effects are not implemented yet at row ${rowIndex}, column ${columnIndex}: ${effectText}`,
    );
  }

  if (noteText === "---") {
    if (instrumentText !== "--") {
      throw new Error(
        `Empty cell cannot include an instrument at row ${rowIndex}, column ${columnIndex}: ${cellText}`,
      );
    }

    return new Cell(null, null, effectText);
  }

  if (noteText === "===") {
    return new Cell(NOTE_OFF, null, effectText);
  }

  if (instrumentText === "--") {
    throw new Error(
      `Note without instrument at row ${rowIndex}, column ${columnIndex}: ${cellText}`,
    );
  }

  return new Cell(
    noteTextToMidi(noteText, rowIndex, columnIndex),
    parseInstrumentNumber(instrumentText, rowIndex, columnIndex),
    effectText,
  );
}

function parseInstrumentNumber(instrumentText, rowIndex, columnIndex) {
  if (!/^[0-9a-fA-F]{2}$/.test(instrumentText)) {
    throw new Error(
      `Invalid instrument at row ${rowIndex}, column ${columnIndex}: ${instrumentText}`,
    );
  }

  return Number.parseInt(instrumentText, 16);
}

function noteTextToMidi(noteText, rowIndex, columnIndex) {
  const match = /^([A-G])([#-])(\d)$/.exec(noteText);
  if (!match) {
    throw new Error(
      `Invalid note at row ${rowIndex}, column ${columnIndex}: ${noteText}`,
    );
  }

  const [, name, accidental, octaveText] = match;
  const sharpOffset = accidental === "#" ? 1 : 0;
  return (Number(octaveText) + 1) * 12 + SEMITONES[name] + sharpOffset;
}
