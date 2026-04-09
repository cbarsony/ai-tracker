// Bass timbres — samples 0A–0F
// All 64-sample single-cycle waveforms, baseNote C-4, sampleRate 44100

const LENGTH = 64;
const TWO_PI = 2 * Math.PI;

function generate(fn) {
  const data = new Int8Array(LENGTH);
  for (let i = 0; i < LENGTH; i++) {
    data[i] = Math.round(fn(i, LENGTH));
  }
  return data;
}

function additive(harmonics) {
  return (i, n) => {
    let sum = 0;
    for (const [harmonic, amplitude] of harmonics) {
      sum += amplitude * Math.sin(TWO_PI * harmonic * i / n);
    }
    return 127 * sum;
  };
}

// 0A — Warm Bass: fundamental + slight 2nd harmonic
export const WARM_BASS = {
  name: "Warm Bass",
  baseNote: "C-4",
  sampleRate: 44100,
  loopStart: 0,
  loopEnd: LENGTH,
  data: generate(additive([[1, 0.85], [2, 0.15]]))
};

// 0B — Thick Bass: strong fundamental + 3rd harmonic
export const THICK_BASS = {
  name: "Thick Bass",
  baseNote: "C-4",
  sampleRate: 44100,
  loopStart: 0,
  loopEnd: LENGTH,
  data: generate(additive([[1, 0.75], [3, 0.25]]))
};

// 0C — Buzz Bass: square-ish with even harmonics, growly
export const BUZZ_BASS = {
  name: "Buzz Bass",
  baseNote: "C-4",
  sampleRate: 44100,
  loopStart: 0,
  loopEnd: LENGTH,
  data: generate(additive([[1, 0.6], [2, 0.2], [3, 0.15], [4, 0.05]]))
};

// 0D — Sub Bass: nearly pure sine, deep sub
export const SUB_BASS = {
  name: "Sub Bass",
  baseNote: "C-4",
  sampleRate: 44100,
  loopStart: 0,
  loopEnd: LENGTH,
  data: generate(additive([[1, 0.97], [2, 0.03]]))
};

// 0E — Pluck Bass: saw-like with fast harmonic decay shape
export const PLUCK_BASS = {
  name: "Pluck Bass",
  baseNote: "C-4",
  sampleRate: 44100,
  loopStart: 0,
  loopEnd: LENGTH,
  data: generate(additive([[1, 0.5], [2, 0.25], [3, 0.125], [4, 0.0625], [5, 0.03]]))
};

// 0F — Round Bass: triangle + slight 2nd, mellow
export const ROUND_BASS = {
  name: "Round Bass",
  baseNote: "C-4",
  sampleRate: 44100,
  loopStart: 0,
  loopEnd: LENGTH,
  data: generate((i, n) => {
    const phase = i / n;
    let tri;
    if (phase < 0.25) tri = phase * 4;
    else if (phase < 0.75) tri = 1 - (phase - 0.25) * 4;
    else tri = -1 + (phase - 0.75) * 4;
    const sine2 = 0.12 * Math.sin(TWO_PI * 2 * i / n);
    return 127 * (tri * 0.88 + sine2);
  })
};
