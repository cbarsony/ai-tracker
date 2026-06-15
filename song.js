class Note {
  constructor(pitch, instrumentId, effect) {
    this.pitch = pitch;
    this.instrumentId = instrumentId;
    this.effect = effect;
  }
}

export class EndNote { }

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
  [new Note("C-4", 0, null), null, null, null],
  [null, null, null, null],
  [new Note("C-4", 2, null), new Note("E-3", 3), null, null],
  [null, null, null, null],
  [new Note("C-4", 1, null), null, null, null],
  [null, null, null, null],
  [new Note("C-4", 2, null), new Note("E-3", 3), null, null],
  [null, null, null, null],
  [new Note("C-4", 0, null), null, null, null],
  [null, null, null, null],
  [new Note("C-4", 2, null), new Note("E-3", 3), null, null],
  [null, null, null, null],
  [new Note("C-4", 1, null), null, null, null],
  [null, null, null, null],
  [new Note("C-4", 2, null), new Note("E-3", 3), null, null],
  [null, null, null, null],
];

const instruments = [
  { name: "kick", sample: "samples/kick.wav" },
  { name: "snare", sample: "samples/snare.wav" },
  { name: "hihat-closed", sample: "samples/hihat.wav" },
  { name: "bass", sample: "samples/bass.wav" },
];

export const song = {
  pattern,
  instruments,
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
