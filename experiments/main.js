/** @type {AudioContext|null} */
let audio = null;
/** @type {AudioBuffer|null} */
let sample = null;

document.getElementById("play").addEventListener("click", () => {
  ensureAudio();

  const sound = audio.createBufferSource();
  sound.buffer = sample;
  sound.loop = true;
  sound.loopStart = 0;
  sound.loopEnd = 64 / 44100;

  sound.connect(audio.destination);
  sound.start();

  sound.stop(audio.currentTime + 0.3);
});

function ensureAudio() {
  if (audio) return;

  audio = new AudioContext();

  // Convert Int8 (-128..127) to Float32 (-1..~1)
  const squareWaveNormalized = new Float32Array(squareWave.length);
  for (let i = 0; i < squareWave.length; i++) {
    squareWaveNormalized[i] = squareWave[i] / 128;
  }

  sample = audio.createBuffer(1, squareWaveNormalized.length, 44100);
  sample.copyToChannel(squareWaveNormalized, 0);
}

const squareWave = new Int8Array([
  127, 127, 127, 127, 127, 127, 127, 127,
  127, 127, 127, 127, 127, 127, 127, 127,
  127, 127, 127, 127, 127, 127, 127, 127,
  127, 127, 127, 127, 127, 127, 127, 127,
 -128,-128,-128,-128,-128,-128,-128,-128,
 -128,-128,-128,-128,-128,-128,-128,-128,
 -128,-128,-128,-128,-128,-128,-128,-128,
 -128,-128,-128,-128,-128,-128,-128,-128,
]);

function changeVolume(waveData, volume) {
  const sample = new Float32Array(waveData.length);
  for (let i = 0; i < waveData.length; i++) {
    sample[i] = waveData[i] * volume;
  }
  return sample;
}
