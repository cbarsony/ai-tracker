// Lead/melodic timbres — samples 10–19
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

// 10 — Bright Lead: saw + boosted upper harmonics
export const BRIGHT_LEAD = {
  name: "Bright Lead",
  baseNote: "C-4",
  sampleRate: 44100,
  loopStart: 0,
  loopEnd: LENGTH,
  data: generate(additive([[1, 0.4], [2, 0.2], [3, 0.15], [4, 0.1], [5, 0.1], [6, 0.05]]))
};

// 11 — Soft Lead: triangle + faint harmonics
export const SOFT_LEAD = {
  name: "Soft Lead",
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
    const h5 = 0.05 * Math.sin(TWO_PI * 5 * i / n);
    return 127 * (tri * 0.95 + h5);
  })
};

// 12 — Nasal Lead: odd harmonics, boosted 3rd and 5th
export const NASAL_LEAD = {
  name: "Nasal Lead",
  baseNote: "C-4",
  sampleRate: 44100,
  loopStart: 0,
  loopEnd: LENGTH,
  data: generate(additive([[1, 0.45], [3, 0.30], [5, 0.20], [7, 0.05]]))
};

// 13 — Bell Tone: inharmonic partials, metallic
export const BELL_TONE = {
  name: "Bell Tone",
  baseNote: "C-4",
  sampleRate: 44100,
  loopStart: 0,
  loopEnd: LENGTH,
  data: generate((i, n) => {
    const p = TWO_PI * i / n;
    return 127 * (0.4 * Math.sin(p) + 0.25 * Math.sin(2.756 * p) + 0.2 * Math.sin(4.07 * p) + 0.15 * Math.sin(6.22 * p));
  })
};

// 14 — Organ 1: fundamental + 2nd + 3rd, simple organ
export const ORGAN_1 = {
  name: "Organ 1",
  baseNote: "C-4",
  sampleRate: 44100,
  loopStart: 0,
  loopEnd: LENGTH,
  data: generate(additive([[1, 0.5], [2, 0.3], [3, 0.2]]))
};

// 15 — Organ 2: drawbar-style: 1st, 2nd, 4th, 8th
export const ORGAN_2 = {
  name: "Organ 2",
  baseNote: "C-4",
  sampleRate: 44100,
  loopStart: 0,
  loopEnd: LENGTH,
  data: generate(additive([[1, 0.4], [2, 0.3], [4, 0.2], [8, 0.1]]))
};

// 16 — Flute Tone: sine + faint 2nd + fainter 3rd
export const FLUTE_TONE = {
  name: "Flute Tone",
  baseNote: "C-4",
  sampleRate: 44100,
  loopStart: 0,
  loopEnd: LENGTH,
  data: generate(additive([[1, 0.85], [2, 0.10], [3, 0.05]]))
};

// 17 — Reed Tone: all harmonics, slow rolloff, clarinet-like
export const REED_TONE = {
  name: "Reed Tone",
  baseNote: "C-4",
  sampleRate: 44100,
  loopStart: 0,
  loopEnd: LENGTH,
  data: generate(additive([[1, 0.35], [2, 0.18], [3, 0.14], [4, 0.10], [5, 0.08], [6, 0.06], [7, 0.05], [8, 0.04]]))
};

// 18 — Chip Arp: multi-cycle waveform with pitch movement baked in
export const CHIP_ARP = {
  name: "Chip Arp",
  baseNote: "C-4",
  sampleRate: 44100,
  loopStart: 0,
  loopEnd: LENGTH,
  data: generate((i, n) => {
    // Two cycles with different frequencies baked into one period
    const phase1 = TWO_PI * 2 * i / n;
    const phase2 = TWO_PI * 3 * i / n;
    const blend = i / n;
    return 127 * ((1 - blend) * Math.sin(phase1) * 0.7 + blend * Math.sin(phase2) * 0.7);
  })
};

// 19 — PWM Static: ~33% duty cycle pulse, between square and 25%
export const PWM_STATIC = {
  name: "PWM Static",
  baseNote: "C-4",
  sampleRate: 44100,
  loopStart: 0,
  loopEnd: LENGTH,
  data: generate((i, n) => (i / n) < (1 / 3) ? 127 : -128)
};
