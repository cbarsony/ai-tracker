export const squareWave = new Int8Array([
  127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127,
  127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127,
  127, 127, -128, -128, -128, -128, -128, -128, -128, -128, -128, -128, -128,
  -128, -128, -128, -128, -128, -128, -128, -128, -128, -128, -128, -128, -128,
  -128, -128, -128, -128, -128, -128, -128, -128,
]);

export function makeBassWaveBuffer(audioCtx) {
  const sampleRate = audioCtx.sampleRate;
  const length = Math.floor(sampleRate / 55);
  const buffer = audioCtx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < length; i++) {
    const phase = i / length;
    const saw = 2 * phase - 1;
    const square = phase < 0.5 ? 1 : -1;
    data[i] = saw * 0.45 + square * 0.35;
  }

  return buffer;
}

export function makePadWaveBuffer(audioCtx) {
  const sampleRate = audioCtx.sampleRate;
  const length = Math.floor(sampleRate / 55);
  const buffer = audioCtx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < length; i++) {
    const phase = i / length;
    const fundamental = Math.sin(2 * Math.PI * phase);
    const second = Math.sin(2 * Math.PI * phase * 2) * 0.25;
    const third = Math.sin(2 * Math.PI * phase * 3) * 0.12;
    data[i] = fundamental * 0.7 + second + third;
  }

  return buffer;
}

export function makeKickBuffer(audioCtx) {
  const sampleRate = audioCtx.sampleRate;
  const length = Math.floor(sampleRate * 0.35);
  const buffer = audioCtx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const progress = i / length;
    const frequency = 140 * Math.pow(45 / 140, progress);
    const phase = 2 * Math.PI * frequency * t;
    const body = Math.sin(phase) * Math.pow(1 - progress, 3);
    const click = (Math.random() * 2 - 1) * Math.pow(1 - progress, 28) * 0.25;
    data[i] = body + click;
  }

  return buffer;
}

export function makePluckBuffer(audioCtx) {
  const sampleRate = audioCtx.sampleRate;
  const length = Math.floor(sampleRate * 0.22);
  const buffer = audioCtx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  const baseFrequency = 440;

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const progress = i / length;
    const env = Math.pow(1 - progress, 4);
    const tone =
      Math.sin(2 * Math.PI * baseFrequency * t) * 0.7 +
      Math.sin(2 * Math.PI * baseFrequency * 2 * t) * 0.22 +
      Math.sin(2 * Math.PI * baseFrequency * 3 * t) * 0.08;
    data[i] = tone * env;
  }

  return buffer;
}

/**
 * Build a hi-hat AudioBuffer: short burst of high-frequency noise with a
 * fast exponential decay.
 */
export function makeHihatBuffer(audioCtx) {
  const sampleRate = audioCtx.sampleRate;
  const length = Math.floor(sampleRate * 0.05); // ~50 ms
  const buffer = audioCtx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    const env = Math.pow(1 - i / length, 4); // sharp decay
    data[i] = (Math.random() * 2 - 1) * env * 0.6;
  }
  return buffer;
}

/**
 * Build a snare AudioBuffer: noise mixed with a low tone, with a medium
 * exponential decay.
 */
export function makeSnareBuffer(audioCtx) {
  const sampleRate = audioCtx.sampleRate;
  const length = Math.floor(sampleRate * 0.18); // ~180 ms
  const buffer = audioCtx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const env = Math.pow(1 - i / length, 2);
    const noise = (Math.random() * 2 - 1) * 0.7;
    const tone = Math.sin(2 * Math.PI * 180 * t) * 0.5;
    data[i] = (noise + tone) * env;
  }
  return buffer;
}
