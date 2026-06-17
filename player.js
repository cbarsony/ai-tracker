import { buildSchedule, pitchToMidi } from "./scheduler.js";

const ROOT_NOTE = 60; // C-4 plays each sample at its natural speed

function waitForAudioClock(audioContext) {
  return new Promise((resolve) => {
    const initial = audioContext.currentTime;
    const wallStart = performance.now();
    function check() {
      if (audioContext.currentTime > initial) {
        console.log(`audio clock started in ${(performance.now() - wallStart).toFixed(1)} ms`);
        resolve();
      } else {
        requestAnimationFrame(check);
      }
    }
    requestAnimationFrame(check);
  });
}

export class Player {
  constructor(song, onNextRow, onSongEnd) {
    this.song = song;
    this.audioContext = null;
    this.buffers = null;
    this.sources = [];
    this.timeouts = [];
    this.onNextRow = onNextRow;
    this.onSongEnd = onSongEnd;
  }

  // Returns a hard-limiter node wired to the destination, created once per
  // AudioContext. Prevents clipping when multiple voices play simultaneously.
  getLimiter() {
    if (!this.limiter) {
      this.limiter = this.audioContext.createDynamicsCompressor();
      this.limiter.threshold.value = -3;  // dB — start limiting just below 0
      this.limiter.knee.value = 0;        // hard knee
      this.limiter.ratio.value = 20;      // near-brick-wall
      this.limiter.attack.value = 0.001;  // 1 ms
      this.limiter.release.value = 0.1;   // 100 ms
      this.limiter.connect(this.audioContext.destination);
    }
    return this.limiter;
  }

  async play(fromRow = 0) {
    if (!this.audioContext) this.audioContext = new AudioContext();
    if (!this.buffers) this.buffers = await this.loadSamples();
    await this.audioContext.resume();

    await waitForAudioClock(this.audioContext);

    this.stop();

    const origin = this.audioContext.currentTime;
    const events = buildSchedule(this.song, this.song.bpm, fromRow);

    for (const event of events) {
      if (event.type === "tick") {
        const timeoutId = setTimeout(() => {
          this.onNextRow(event.row);
        }, event.time * 1000);

        this.timeouts.push(timeoutId);

        continue;
      }

      if (event.type === "end") {
        const timeoutId = setTimeout(() => {
          this.onSongEnd();
        }, event.time * 1000);

        this.timeouts.push(timeoutId);

        continue;
      }

      const source = this.audioContext.createBufferSource();
      source.buffer = this.buffers[event.instrument];
      source.playbackRate.value = 2 ** ((event.midi - ROOT_NOTE) / 12);
      const gain = this.audioContext.createGain();
      gain.gain.value = event.volume !== undefined ? event.volume / 100 : 1;
      source.connect(gain);
      gain.connect(this.getLimiter());
      source.start(origin + event.time);
      if (event.stopTime !== undefined) {
        source.stop(origin + event.stopTime);
      }
      this.sources.push(source);
    }
  }

  stop() {
    for (const id of this.timeouts) clearTimeout(id);
    this.timeouts = [];

    for (const source of this.sources) {
      source.stop();
    }
    this.sources = [];
  }

  // Polyphonic jam preview: up to 4 simultaneous voices, keyed by event.code.
  // If a 5th key is pressed the oldest voice is stolen. Lazily boots the audio
  // context so it works before first play.
  async startPreview(code, pitch, instrumentId) {
    if (!this.audioContext) this.audioContext = new AudioContext();
    if (!this.buffers) this.buffers = await this.loadSamples();
    await this.audioContext.resume();

    // Voice steal: evict oldest entry when at the 4-voice limit.
    if (!this.jamVoices) this.jamVoices = new Map();
    if (this.jamVoices.size >= 4) {
      const [oldestCode, oldestSource] = this.jamVoices.entries().next().value;
      oldestSource.stop();
      this.jamVoices.delete(oldestCode);
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = this.buffers[instrumentId];
    source.playbackRate.value = 2 ** ((pitchToMidi(pitch) - ROOT_NOTE) / 12);
    source.connect(this.getLimiter());
    source.start();
    source.onended = () => this.jamVoices.delete(code);
    this.jamVoices.set(code, source);
  }

  stopPreview(code) {
    if (!this.jamVoices) return;
    const source = this.jamVoices.get(code);
    if (source) {
      source.stop();
      this.jamVoices.delete(code);
    }
  }

  // Kept for backwards compatibility with any callers outside jamming.
  async previewNote(pitch, instrumentId) {
    if (!this.audioContext) this.audioContext = new AudioContext();
    if (!this.buffers) this.buffers = await this.loadSamples();
    await this.audioContext.resume();

    const source = this.audioContext.createBufferSource();
    source.buffer = this.buffers[instrumentId];
    source.playbackRate.value = 2 ** ((pitchToMidi(pitch) - ROOT_NOTE) / 12);
    source.connect(this.getLimiter());
    source.start();
  }

  async loadSamples() {
    return Promise.all(
      this.song.instruments.map(async (instrument) => {
        const response = await fetch(instrument.sample);
        return this.audioContext.decodeAudioData(await response.arrayBuffer());
      }),
    );
  }
}
