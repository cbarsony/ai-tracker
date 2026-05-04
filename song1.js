const pattern = [
  //       kick       snare      hi-hat     bass       pluck      pad
  /*00*/ ["C-2|---", "---|---", "F#2|---", "C-2|---", "C-5|---", "C-3|---"],
  /*01*/ ["---|---", "---|---", "---|---", "===|---", "---|---", "---|---"],
  /*02*/ ["---|---", "---|---", "F#2|---", "===|---", "E-5|---", "---|---"],
  /*03*/ ["---|---", "---|---", "---|---", "C-2|---", "---|---", "---|---"],
  /*04*/ ["---|---", "D-2|---", "F#2|---", "G-2|---", "G-5|---", "---|---"],
  /*05*/ ["---|---", "---|---", "---|---", "===|---", "---|---", "---|---"],
  /*06*/ ["---|---", "---|---", "F#2|---", "A#2|---", "E-5|---", "---|---"],
  /*07*/ ["---|---", "---|---", "---|---", "===|---", "---|---", "---|---"],
  /*08*/ ["C-2|---", "---|---", "F#2|---", "A#1|---", "A#4|---", "---|---"],
  /*09*/ ["---|---", "---|---", "---|---", "===|---", "---|---", "---|---"],
  /*10*/ ["---|---", "---|---", "F#2|---", "===|---", "D-5|---", "---|---"],
  /*11*/ ["---|---", "---|---", "---|---", "A#1|---", "---|---", "---|---"],
  /*12*/ ["---|---", "D-2|---", "F#2|---", "F-2|---", "F-5|---", "---|---"],
  /*13*/ ["---|---", "---|---", "---|---", "===|---", "---|---", "---|---"],
  /*14*/ ["---|---", "---|---", "F#2|---", "G-2|---", "D-5|---", "---|---"],
  /*15*/ ["---|---", "---|---", "F#2|---", "===|---", "---|---", "---|---"],

  /*16*/ ["C-2|---", "---|---", "F#2|---", "G#1|---", "G-4|---", "A#2|---"],
  /*17*/ ["---|---", "---|---", "---|---", "===|---", "---|---", "---|---"],
  /*18*/ ["---|---", "---|---", "F#2|---", "===|---", "C-5|---", "---|---"],
  /*19*/ ["---|---", "---|---", "---|---", "G#1|---", "---|---", "---|---"],
  /*20*/ ["---|---", "D-2|---", "F#2|---", "D#2|---", "D#5|---", "---|---"],
  /*21*/ ["---|---", "---|---", "---|---", "===|---", "---|---", "---|---"],
  /*22*/ ["---|---", "---|---", "F#2|---", "G-2|---", "C-5|---", "---|---"],
  /*23*/ ["---|---", "---|---", "---|---", "===|---", "---|---", "---|---"],
  /*24*/ ["C-2|---", "---|---", "F#2|---", "G-1|---", "G-4|---", "---|---"],
  /*25*/ ["---|---", "---|---", "---|---", "===|---", "---|---", "---|---"],
  /*26*/ ["---|---", "---|---", "F#2|---", "G-1|---", "B-4|---", "---|---"],
  /*27*/ ["---|---", "---|---", "---|---", "===|---", "---|---", "---|---"],
  /*28*/ ["---|---", "D-2|---", "F#2|---", "D-2|---", "D-5|---", "---|---"],
  /*29*/ ["---|---", "---|---", "---|---", "===|---", "---|---", "---|---"],
  /*30*/ ["C-2|---", "---|---", "F#2|---", "G-2|---", "G-5|---", "---|---"],
  /*31*/ ["---|---", "---|---", "F#2|---", "A#2|---", "---|---", "---|---"],

  /*32*/ ["C-2|---", "---|---", "F#2|---", "C-2|---", "C-5|---", "G#2|---"],
  /*33*/ ["---|---", "---|---", "---|---", "===|---", "---|---", "---|---"],
  /*34*/ ["---|---", "---|---", "F#2|---", "C-2|---", "E-5|---", "---|---"],
  /*35*/ ["---|---", "---|---", "---|---", "===|---", "---|---", "---|---"],
  /*36*/ ["---|---", "D-2|---", "F#2|---", "G-2|---", "G-5|---", "---|---"],
  /*37*/ ["---|---", "---|---", "---|---", "===|---", "---|---", "---|---"],
  /*38*/ ["---|---", "---|---", "F#2|---", "A#2|---", "C-6|---", "---|---"],
  /*39*/ ["---|---", "---|---", "---|---", "===|---", "---|---", "---|---"],
  /*40*/ ["C-2|---", "---|---", "F#2|---", "A#1|---", "A#4|---", "---|---"],
  /*41*/ ["---|---", "---|---", "---|---", "===|---", "---|---", "---|---"],
  /*42*/ ["---|---", "---|---", "F#2|---", "A#1|---", "D-5|---", "---|---"],
  /*43*/ ["---|---", "---|---", "---|---", "===|---", "---|---", "---|---"],
  /*44*/ ["---|---", "D-2|---", "F#2|---", "F-2|---", "F-5|---", "---|---"],
  /*45*/ ["---|---", "---|---", "---|---", "===|---", "---|---", "---|---"],
  /*46*/ ["C-2|---", "---|---", "F#2|---", "G-2|---", "A#5|---", "---|---"],
  /*47*/ ["---|---", "---|---", "F#2|---", "A#2|---", "---|---", "---|---"],

  /*48*/ ["C-2|---", "---|---", "F#2|---", "G#1|---", "G-4|---", "G-2|---"],
  /*49*/ ["---|---", "---|---", "---|---", "===|---", "---|---", "---|---"],
  /*50*/ ["---|---", "---|---", "F#2|---", "G#1|---", "C-5|---", "---|---"],
  /*51*/ ["---|---", "---|---", "---|---", "===|---", "---|---", "---|---"],
  /*52*/ ["---|---", "D-2|---", "F#2|---", "D#2|---", "D#5|---", "---|---"],
  /*53*/ ["---|---", "---|---", "---|---", "===|---", "---|---", "---|---"],
  /*54*/ ["---|---", "---|---", "F#2|---", "G-2|---", "G-5|---", "---|---"],
  /*55*/ ["---|---", "---|---", "---|---", "===|---", "---|---", "---|---"],
  /*56*/ ["C-2|---", "---|---", "F#2|---", "G-1|---", "G-4|---", "---|---"],
  /*57*/ ["---|---", "---|---", "---|---", "===|---", "---|---", "---|---"],
  /*58*/ ["---|---", "---|---", "F#2|---", "G-1|---", "B-4|---", "---|---"],
  /*59*/ ["---|---", "---|---", "---|---", "===|---", "---|---", "---|---"],
  /*60*/ ["---|---", "D-2|---", "F#2|---", "D-2|---", "D-5|---", "---|---"],
  /*61*/ ["---|---", "---|---", "---|---", "===|---", "---|---", "---|---"],
  /*62*/ ["---|---", "---|---", "F#2|---", "G-2|---", "E-5|---", "---|---"],
  /*63*/ ["---|---", "---|---", "F#2|---", "A#2|---", "G-5|---", "---|---"],
];

/**
 * @typedef {Object} SampleGeneratorContext
 * @property {number} sampleRate Audio sample rate in Hz.
 *
 * @callback SampleGenerator
 * @param {SampleGeneratorContext} context
 * @returns {Float32Array} Mono PCM samples. Every value must be between -1 and 1.
 *
 * @typedef {Object} Instrument
 * @property {string} description Human-readable description of the sound.
 * @property {SampleGenerator} [generator] Creates mono PCM samples for this instrument.
 * @property {Float32Array} [samples] Prebuilt mono PCM samples between -1 and 1.
 * @property {boolean} loop
 * @property {boolean} pitched
 * @property {number} [baseFrequency]
 * @property {number} volume
 * @property {number} attack
 * @property {number} durationRows
 */

/** @type {SampleGenerator} */
function makeBassSamples({ sampleRate }) {
  const length = Math.floor(sampleRate / 55);
  const samples = new Float32Array(length);

  for (let i = 0; i < length; i++) {
    const phase = i / length;
    const saw = 2 * phase - 1;
    const square = phase < 0.5 ? 1 : -1;
    samples[i] = saw * 0.45 + square * 0.35;
  }

  return samples;
}

/** @type {SampleGenerator} */
function makePadSamples({ sampleRate }) {
  const length = Math.floor(sampleRate / 55);
  const samples = new Float32Array(length);

  for (let i = 0; i < length; i++) {
    const phase = i / length;
    const fundamental = Math.sin(2 * Math.PI * phase);
    const second = Math.sin(2 * Math.PI * phase * 2) * 0.25;
    const third = Math.sin(2 * Math.PI * phase * 3) * 0.12;
    samples[i] = fundamental * 0.7 + second + third;
  }

  return samples;
}

/** @type {SampleGenerator} */
function makeKickSamples({ sampleRate }) {
  const length = Math.floor(sampleRate * 0.35);
  const samples = new Float32Array(length);

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const progress = i / length;
    const frequency = 140 * Math.pow(45 / 140, progress);
    const phase = 2 * Math.PI * frequency * t;
    const body = Math.sin(phase) * Math.pow(1 - progress, 3);
    const click = (Math.random() * 2 - 1) * Math.pow(1 - progress, 28) * 0.25;
    samples[i] = body + click;
  }

  return samples;
}

/** @type {SampleGenerator} */
function makePluckSamples({ sampleRate }) {
  const length = Math.floor(sampleRate * 0.22);
  const samples = new Float32Array(length);
  const baseFrequency = 440;

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const progress = i / length;
    const env = Math.pow(1 - progress, 4);
    const tone =
      Math.sin(2 * Math.PI * baseFrequency * t) * 0.7 +
      Math.sin(2 * Math.PI * baseFrequency * 2 * t) * 0.22 +
      Math.sin(2 * Math.PI * baseFrequency * 3 * t) * 0.08;
    samples[i] = tone * env;
  }

  return samples;
}

/** @type {SampleGenerator} */
function makeHihatSamples({ sampleRate }) {
  const length = Math.floor(sampleRate * 0.05);
  const samples = new Float32Array(length);

  for (let i = 0; i < length; i++) {
    const env = Math.pow(1 - i / length, 4);
    samples[i] = (Math.random() * 2 - 1) * env * 0.6;
  }

  return samples;
}

/** @type {SampleGenerator} */
function makeSnareSamples({ sampleRate }) {
  const length = Math.floor(sampleRate * 0.18);
  const samples = new Float32Array(length);

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const env = Math.pow(1 - i / length, 2);
    const noise = (Math.random() * 2 - 1) * 0.7;
    const tone = Math.sin(2 * Math.PI * 180 * t) * 0.5;
    samples[i] = (noise + tone) * env;
  }

  return samples;
}

export const SONG = {
  bpm: 120,
  rowsPerBeat: 4,

  channels: ["Kick", "Snare", "Hi-hat", "Bass", "Pluck", "Pad"],

  pattern: pattern,

  /** @type {Record<string, Instrument>} */
  instruments: {
    Kick: {
      description:
        "Short electronic kick with a falling sine body and a tiny noisy click at the attack.",
      generator: makeKickSamples,
      loop: false,
      pitched: false,
      volume: 0.85,
      attack: 0.001,
      durationRows: 3,
    },
    Snare: {
      description:
        "Short snare made from bright noise mixed with a low tonal body and a medium decay.",
      generator: makeSnareSamples,
      loop: false,
      pitched: false,
      volume: 0.35,
      attack: 0.001,
      durationRows: 2,
    },
    "Hi-hat": {
      description:
        "Very short closed hi-hat: sharp high-frequency noise with a fast, crisp decay.",
      generator: makeHihatSamples,
      loop: false,
      pitched: false,
      volume: 0.18,
      attack: 0.001,
      durationRows: 1,
    },
    Bass: {
      description:
        "Looped low bass waveform combining saw and square shapes for a buzzy, solid synth bass.",
      generator: makeBassSamples,
      loop: true,
      pitched: true,
      baseFrequency: 55,
      volume: 0.22,
      attack: 0.004,
      durationRows: 2,
    },
    Pluck: {
      description:
        "Brief bright pluck with a 440 Hz sine tone plus harmonics and a quick natural fade.",
      generator: makePluckSamples,
      loop: false,
      pitched: true,
      baseFrequency: 440,
      volume: 0.18,
      attack: 0.001,
      durationRows: 2,
    },
    Pad: {
      description:
        "Looped warm pad waveform with a soft fundamental and gentle upper harmonics.",
      generator: makePadSamples,
      loop: true,
      pitched: true,
      baseFrequency: 55,
      volume: 0.1,
      attack: 0.08,
      durationRows: 16,
    },
  },
};
