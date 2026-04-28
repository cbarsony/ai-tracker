export const squareWave = new Int8Array([
  127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127,
  127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127,
  127, 127, -128, -128, -128, -128, -128, -128, -128, -128, -128, -128, -128,
  -128, -128, -128, -128, -128, -128, -128, -128, -128, -128, -128, -128, -128,
  -128, -128, -128, -128, -128, -128, -128, -128,
]);

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
