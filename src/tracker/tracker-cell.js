import { TrackerNotation } from "./tracker-notation.js";
import { VolumeEffect } from "./volume-effect.js";

export const NOTE_OFF = -1;

export class TrackerCell {
  constructor(note, effect) {
    this.note = note;
    this.effect = effect;
  }

  get isEmpty() {
    return this.note === null;
  }

  get isNoteOff() {
    return this.note === NOTE_OFF;
  }

  static parse(cellText, rowIndex, channelIndex) {
    const match = /^(---|===|[A-G][#-]\d)\|(.{3})$/.exec(cellText);
    if (!match) {
      throw new Error(
        `Invalid cell at row ${rowIndex}, channel ${channelIndex}: ${cellText}`,
      );
    }

    const [, noteText, effectText] = match;
    const effect = VolumeEffect.parse(effectText, rowIndex, channelIndex);

    if (noteText === "---") return new TrackerCell(null, effect);
    if (noteText === "===") return new TrackerCell(NOTE_OFF, effect);

    return new TrackerCell(TrackerNotation.noteTextToMidi(noteText), effect);
  }
}