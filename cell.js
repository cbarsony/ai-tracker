export const NOTE_OFF = -1;

export class Cell {
  /**
   * Represents a single cell in the tracker.
   *
   * @param {number|null} note The MIDI note number or null for no note. 0 - 127, or -1 for NOTE_OFF.
   * @param {number|null} instrument The instrument number or null for no instrument.
   */
  constructor(note, instrument) {
    const isRealNote = typeof note === "number" && note !== NOTE_OFF;
    if (isRealNote && !instrument) {
      throw new Error("Note without instrument");
    }

    this.note = note ?? null;
    this.instrument = instrument || null;
  }
}
