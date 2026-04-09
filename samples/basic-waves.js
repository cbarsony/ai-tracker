// Basic waveforms — samples 01–09
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

// 01 — Sine Wave: pure fundamental
export const SINE = {
  name: "Sine Wave",
  baseNote: "C-4",
  sampleRate: 44100,
  loopStart: 0,
  loopEnd: LENGTH,
  data: generate((i, n) => 127 * Math.sin(TWO_PI * i / n))
};

// 02 — Triangle Wave: odd harmonics, 1/n² rolloff
export const TRIANGLE = {
  name: "Triangle Wave",
  baseNote: "C-4",
  sampleRate: 44100,
  loopStart: 0,
  loopEnd: LENGTH,
  data: generate((i, n) => {
    const phase = i / n;
    if (phase < 0.25) return 127 * (phase * 4);
    if (phase < 0.75) return 127 * (1 - (phase - 0.25) * 4);
    return 127 * (-1 + (phase - 0.75) * 4);
  })
};

// 03 — Sawtooth Wave: all harmonics, 1/n rolloff
export const SAWTOOTH = {
  name: "Sawtooth Wave",
  baseNote: "C-4",
  sampleRate: 44100,
  loopStart: 0,
  loopEnd: LENGTH,
  data: generate((i, n) => 127 * (1 - 2 * i / n))
};

// 04 — Pulse 25%: narrow pulse, nasal/reedy
export const PULSE_25 = {
  name: "Pulse 25%",
  baseNote: "C-4",
  sampleRate: 44100,
  loopStart: 0,
  loopEnd: LENGTH,
  data: generate((i, n) => (i / n) < 0.25 ? 127 : -128)
};

// 05 — Pulse 12.5%: very narrow pulse, thin/buzzy
export const PULSE_12 = {
  name: "Pulse 12.5%",
  baseNote: "C-4",
  sampleRate: 44100,
  loopStart: 0,
  loopEnd: LENGTH,
  data: generate((i, n) => (i / n) < 0.125 ? 127 : -128)
};

// 06 — Half-Rect Sine: half-wave rectified sine, warm even harmonics
export const HALF_RECT_SINE = {
  name: "Half-Rect Sine",
  baseNote: "C-4",
  sampleRate: 44100,
  loopStart: 0,
  loopEnd: LENGTH,
  data: generate((i, n) => {
    const s = Math.sin(TWO_PI * i / n);
    return 127 * (s > 0 ? s : 0);
  })
};

// 07 — Abs Sine: full-wave rectified sine, organ-like
export const ABS_SINE = {
  name: "Abs Sine",
  baseNote: "C-4",
  sampleRate: 44100,
  loopStart: 0,
  loopEnd: LENGTH,
  data: generate((i, n) => 127 * Math.abs(Math.sin(TWO_PI * i / n)))
};

// 08 — Staircase 4: 4-level quantized sine, lofi digital
export const STAIRCASE_4 = {
  name: "Staircase 4",
  baseNote: "C-4",
  sampleRate: 44100,
  loopStart: 0,
  loopEnd: LENGTH,
  data: generate((i, n) => {
    const s = Math.sin(TWO_PI * i / n);
    return 127 * (Math.round(s * 2) / 2);
  })
};

// 09 — Staircase 8: 8-level quantized sine, smoother digital
export const STAIRCASE_8 = {
  name: "Staircase 8",
  baseNote: "C-4",
  sampleRate: 44100,
  loopStart: 0,
  loopEnd: LENGTH,
  data: generate((i, n) => {
    const s = Math.sin(TWO_PI * i / n);
    return 127 * (Math.round(s * 4) / 4);
  })
};
