export class Cell {
  constructor(note, instrument) {
    if (note && note !== "-" && !instrument) {
      throw new Error("Note without instrument");
    }

    this.note = note || null;
    this.instrument = instrument || null;
  }
}
