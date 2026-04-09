import { SQUARE_WAVE } from "../samples/square-wave.js";
import { SINE, TRIANGLE, SAWTOOTH, PULSE_25, PULSE_12, HALF_RECT_SINE, ABS_SINE, STAIRCASE_4, STAIRCASE_8 } from "../samples/basic-waves.js";
import { WARM_BASS, THICK_BASS, BUZZ_BASS, SUB_BASS, PLUCK_BASS, ROUND_BASS } from "../samples/bass.js";
import { BRIGHT_LEAD, SOFT_LEAD, NASAL_LEAD, BELL_TONE, ORGAN_1, ORGAN_2, FLUTE_TONE, REED_TONE, CHIP_ARP, PWM_STATIC } from "../samples/leads.js";
import { KICK, SNARE, HIHAT_CLOSED, HIHAT_OPEN, CLAP, TOM } from "../samples/drums.js";

const samples = new Map();
const audioBuffers = new Map();

samples.set("00", SQUARE_WAVE);
samples.set("01", SINE);
samples.set("02", TRIANGLE);
samples.set("03", SAWTOOTH);
samples.set("04", PULSE_25);
samples.set("05", PULSE_12);
samples.set("06", HALF_RECT_SINE);
samples.set("07", ABS_SINE);
samples.set("08", STAIRCASE_4);
samples.set("09", STAIRCASE_8);
samples.set("0A", WARM_BASS);
samples.set("0B", THICK_BASS);
samples.set("0C", BUZZ_BASS);
samples.set("0D", SUB_BASS);
samples.set("0E", PLUCK_BASS);
samples.set("0F", ROUND_BASS);
samples.set("10", BRIGHT_LEAD);
samples.set("11", SOFT_LEAD);
samples.set("12", NASAL_LEAD);
samples.set("13", BELL_TONE);
samples.set("14", ORGAN_1);
samples.set("15", ORGAN_2);
samples.set("16", FLUTE_TONE);
samples.set("17", REED_TONE);
samples.set("18", CHIP_ARP);
samples.set("19", PWM_STATIC);
samples.set("1A", KICK);
samples.set("1B", SNARE);
samples.set("1C", HIHAT_CLOSED);
samples.set("1D", HIHAT_OPEN);
samples.set("1E", CLAP);
samples.set("1F", TOM);

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
