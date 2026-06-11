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

// A table-like song: rows of fixed-width cell strings, mirroring the grid.
// Starts at the default 140 BPM, then row 08 drops to 0x46 = 70 BPM so the
// tempo change is easy to hear when evaluating the scheduler.
const xpattern = [
  //       00          01          02          03
  /*00*/ ["C-400---", "--------", "--------", "--------"],
  /*01*/ ["--------", "--------", "--------", "--------"],
  /*02*/ ["C-402---", "E-303---", "--------", "--------"],
  /*03*/ ["--------", "--------", "--------", "--------"],
  /*04*/ ["C-401---", "--------", "--------", "--------"],
  /*05*/ ["--------", "--------", "--------", "--------"],
  /*06*/ ["C-402---", "E-303---", "--------", "--------"],
  /*07*/ ["--------", "--------", "--------", "--------"],
  /*08*/ ["C-400T46", "--------", "--------", "--------"],
  /*09*/ ["--------", "--------", "--------", "--------"],
  /*10*/ ["C-402---", "G-303---", "--------", "--------"],
  /*11*/ ["--------", "--------", "--------", "--------"],
  /*12*/ ["C-401V10", "--------", "--------", "--------"],
  /*13*/ ["--------", "D-303---", "--------", "--------"],
  /*14*/ ["C-400---", "--------", "--------", "--------"],
  /*15*/ ["--------", "--------", "--------", "--------"],
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
