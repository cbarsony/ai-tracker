// Sentinel values for the `note` field of a Cell:
//   * null      → sustain (keep the previous note ringing)
//   * NOTE_OFF  → note-off (cut the active note at this row)
//   * 0..127    → MIDI note number (C-1 = 0, A4 = 69, etc.)
export const NOTE_OFF = -1;

export class Cell {
  constructor(note, instrument) {
    const isRealNote = typeof note === "number" && note !== NOTE_OFF;
    if (isRealNote && !instrument) {
      throw new Error("Note without instrument");
    }

    this.note = note ?? null;
    this.instrument = instrument || null;
  }
}
