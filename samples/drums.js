// Drum/percussion samples — samples 1A–1F
// One-shot waveforms (loopEnd: 0), longer than tonal samples (256–512 samples)
// baseNote C-4, sampleRate 44100

const TWO_PI = 2 * Math.PI;

// 1A — Kick: sine burst decaying to silence, pitched kick
export const KICK = (() => {
  const length = 512;
  const data = new Int8Array(length);
  for (let i = 0; i < length; i++) {
    const t = i / length;
    // Pitch sweep from high to low
    const freq = 4 + (1 - t) * 12;
    const env = Math.exp(-5 * t);
    data[i] = Math.round(127 * env * Math.sin(TWO_PI * freq * t));
  }
  return {
    name: "Kick",
    baseNote: "C-4",
    sampleRate: 44100,
    loopStart: 0,
    loopEnd: 0,
    data
  };
})();

// 1B — Snare: noise-like burst with tonal component
export const SNARE = (() => {
  const length = 512;
  const data = new Int8Array(length);
  // Simple PRNG for deterministic noise
  let seed = 12345;
  function noise() {
    seed = (seed * 16807 + 0) % 2147483647;
    return (seed / 2147483647) * 2 - 1;
  }
  for (let i = 0; i < length; i++) {
    const t = i / length;
    const env = Math.exp(-6 * t);
    const tonal = 0.4 * Math.sin(TWO_PI * 3 * t);
    const noisy = 0.6 * noise();
    data[i] = Math.round(127 * env * (tonal + noisy));
  }
  return {
    name: "Snare",
    baseNote: "C-4",
    sampleRate: 44100,
    loopStart: 0,
    loopEnd: 0,
    data
  };
})();

// 1C — Hi-Hat Closed: short noise burst, metallic
export const HIHAT_CLOSED = (() => {
  const length = 256;
  const data = new Int8Array(length);
  let seed = 54321;
  function noise() {
    seed = (seed * 16807 + 0) % 2147483647;
    return (seed / 2147483647) * 2 - 1;
  }
  for (let i = 0; i < length; i++) {
    const t = i / length;
    const env = Math.exp(-12 * t);
    data[i] = Math.round(127 * env * noise());
  }
  return {
    name: "Hi-Hat Closed",
    baseNote: "C-4",
    sampleRate: 44100,
    loopStart: 0,
    loopEnd: 0,
    data
  };
})();

// 1D — Hi-Hat Open: longer noise burst, sustain ring
export const HIHAT_OPEN = (() => {
  const length = 512;
  const data = new Int8Array(length);
  let seed = 67890;
  function noise() {
    seed = (seed * 16807 + 0) % 2147483647;
    return (seed / 2147483647) * 2 - 1;
  }
  for (let i = 0; i < length; i++) {
    const t = i / length;
    const env = Math.exp(-3 * t);
    data[i] = Math.round(127 * env * noise());
  }
  return {
    name: "Hi-Hat Open",
    baseNote: "C-4",
    sampleRate: 44100,
    loopStart: 0,
    loopEnd: 0,
    data
  };
})();

// 1E — Clap: double-peak noise burst
export const CLAP = (() => {
  const length = 512;
  const data = new Int8Array(length);
  let seed = 11111;
  function noise() {
    seed = (seed * 16807 + 0) % 2147483647;
    return (seed / 2147483647) * 2 - 1;
  }
  for (let i = 0; i < length; i++) {
    const t = i / length;
    // Two peaks: one at start, one slightly after
    const peak1 = Math.exp(-15 * t);
    const peak2 = 0.7 * Math.exp(-10 * Math.abs(t - 0.15));
    const env = Math.max(peak1, peak2) * Math.exp(-3 * t);
    data[i] = Math.round(127 * env * noise());
  }
  return {
    name: "Clap",
    baseNote: "C-4",
    sampleRate: 44100,
    loopStart: 0,
    loopEnd: 0,
    data
  };
})();

// 1F — Tom: sine burst, lower pitch, longer decay
export const TOM = (() => {
  const length = 512;
  const data = new Int8Array(length);
  for (let i = 0; i < length; i++) {
    const t = i / length;
    const freq = 2.5 + (1 - t) * 3;
    const env = Math.exp(-3.5 * t);
    data[i] = Math.round(127 * env * Math.sin(TWO_PI * freq * t));
  }
  return {
    name: "Tom",
    baseNote: "C-4",
    sampleRate: 44100,
    loopStart: 0,
    loopEnd: 0,
    data
  };
})();
