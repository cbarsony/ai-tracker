import { SQUARE_WAVE } from "../samples/square-wave.js";

const samples = new Map();
const audioBuffers = new Map();

samples.set("00", SQUARE_WAVE);

function int8ToFloat32(int8Array) {
  const float32 = new Float32Array(int8Array.length);
  for (let i = 0; i < int8Array.length; i++) {
    float32[i] = int8Array[i] / 128;
  }
  return float32;
}

export function getSample(id) {
  return samples.get(id) ?? null;
}

export function getAudioBuffer(id, audioContext) {
  if (audioBuffers.has(id)) return audioBuffers.get(id);

  const sample = getSample(id);
  if (!sample) return null;

  const float32Data = int8ToFloat32(sample.data);
  const buffer = audioContext.createBuffer(1, float32Data.length, sample.sampleRate);
  buffer.copyToChannel(float32Data, 0);
  audioBuffers.set(id, buffer);
  return buffer;
}

export function getSampleCount() {
  return samples.size;
}

export function getAllSampleMeta() {
  const meta = [];
  for (const [id, sample] of samples) {
    meta.push({ id, name: sample.name });
  }
  return meta;
}
