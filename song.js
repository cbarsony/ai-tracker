class Note {
  constructor(pitch, instrumentId, effect) {
    this.pitch = pitch;
    this.instrumentId = instrumentId;
    this.effect = effect;
  }
}

export class EndNote {}

export const EFFECT_KEY = {
  TEMPO: "T",
  VOLUME: "V",
};

class Effect {
  /**
   *
   * @param {EFFECT_KEY} key
   * @param {string} value
   */
  constructor(key, value) {
    this.key = key;
    this.value = value;
  }
}

const pattern = [
  [new Note("C-4", 0, null), new Note("C-4", 7, null), new Note("G-4", 4, null), new Note("C-5", 5)],
  [null, null, null, null],
  [new Note("C-4", 2, null), new Note("C-3", 3), null, null],
  [null, null, null, null],
  [new Note("C-4", 1, null), null, new Note("G-4", 4, null), null],
  [null, null, null, null],
  [new Note("C-4", 2, null), new Note("C-3", 3), new Note("F-4", 4, null), null],
  [null, null, null, null],
  [new Note("C-4", 0, null), null, new Note("G-4", 4, null), null],
  [null, null, null, null],
  [new Note("C-4", 2, null), new Note("C-3", 3), null, null],
  [null, null, null, null],
  [new Note("C-4", 1, null), null, null, new Note("D#5", 5)],
  [null, null, null, null],
  [new Note("C-4", 2, null), new Note("C-3", 3), new Note("C-4", 4, null), new Note("D-5", 5)],
  [null, null, null, null],
  [new Note("C-4", 0, null), null, new Note("G-4", 4, null), new Note("C-5", 5)],
  [null, null, null, null],
  [new Note("C-4", 2, null), new Note("C-3", 3), null, null],
  [null, null, null, null],
  [new Note("C-4", 1, null), null, new Note("G-4", 4, null), null],
  [null, null, null, null],
  [new Note("C-4", 2, null), new Note("C-3", 3), new Note("F-4", 4, null), null],
  [null, null, null, null],
  [new Note("C-4", 0, null), null, new Note("G-4", 4, null), null],
  [null, null, null, null],
  [new Note("C-4", 2, null), new Note("C-3", 3), null, null],
  [null, null, null, null],
  [new Note("C-4", 1, null), null, null, new Note("C-5", 5)],
  [null, null, null, null],
  [new Note("C-4", 2, null), new Note("C-3", 3), new Note("C-5", 4, null), new Note("D-5", 5)],
  [null, null, null, null],
];

const instruments = [
  { name: "kick", sample: "samples/kick.wav" },
  { name: "snare", sample: "samples/snare.wav" },
  { name: "hihat-closed", sample: "samples/hihat.wav" },
  { name: "bass", sample: "samples/bass.wav" },
  { name: "pluck", sample: "samples/pluck.wav" },
  { name: "lead", sample: "samples/lead.wav" },
  { name: "pad", sample: "samples/pad.wav" },
  { name: "crash", sample: "samples/crash.wav" },
];

export const song = {
  pattern,
  instruments,
  channels: 4,
  bpm: 140,
};

export function addNote(rowId, channelId, pitch, instrumentId) {
  song.pattern[rowId][channelId] = new Note(pitch, instrumentId, null);
}

export function deleteNote(rowId, channelId) {
  song.pattern[rowId][channelId] = null;
}

export function noteOff(rowId, channelId) {
  song.pattern[rowId][channelId] = new EndNote();
}
