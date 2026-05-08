const SEMITONES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export class TrackerNotation {
  static noteTextToMidi(noteText) {
    const match = /^([A-G])([#-])(\d)$/.exec(noteText);
    if (!match) throw new Error(`Invalid note: ${noteText}`);

    const [, name, accidental, octaveText] = match;
    const sharp = accidental === "#" ? 1 : 0;
    return (Number(octaveText) + 1) * 12 + SEMITONES[name] + sharp;
  }

  static midiToFrequency(midiNote) {
    return 440 * Math.pow(2, (midiNote - 69) / 12);
  }
}