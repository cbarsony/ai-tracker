class Note {
  constructor(pitch, instrumentId, effect) {
    this.pitch = pitch;
    this.instrumentId = instrumentId;
    this.effect = effect;
  }
}

class EndNote {}

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
  [new Note("C-4", 0, new Effect(EFFECT_KEY.VOLUME, "32")), null, null, null],
  [null, null, null, null],
  [new Note("C-4", 2, null), new Note("E-3", 1), null, null],
  [null, null, null, null],
  [new Note("C-4", 0, new Effect(EFFECT_KEY.TEMPO, 80)), null, null, null],
  [null, null, null, null],
  [new Note("C-4", 2, null), new Note("E-3", 1), null, null],
  [null, null, null, null],
  [new Note("C-4", 0, null), null, null, null],
  [null, null, null, null],
  [new Note("C-4", 2, null), new Note("E-3", 1), null, null],
  [null, null, null, null],
  [new Note("C-4", 0, null), null, null, null],
  [null, null, null, null],
  [new Note("C-4", 2, null), new Note("E-3", 1), null, null],
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
  addNote: (channelId, rowId, pitch) => {
    this.pattern[rowId][channelId] = new Note(pitch, instrumentId, effect);
  },
};
