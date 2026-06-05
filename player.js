import { buildSchedule } from "./scheduler.js";

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

  // Make sure the audio context exists, samples are decoded, and the context
  // is running. Shared by full playback and single-note preview.
  async ensureAudio() {
    if (!this.audioContext) this.audioContext = new AudioContext();
    if (!this.buffers) this.buffers = await this.loadSamples();
    await this.audioContext.resume();
  }

  // Start a single note immediately and return a handle to stop it later.
  // Used for polyphonic preview, where each held key keeps one note sounding.
  async startNote(midi, instrument) {
    await this.ensureAudio();
    const source = this.audioContext.createBufferSource();
    source.buffer = this.buffers[instrument];
    source.playbackRate.value = 2 ** ((midi - ROOT_NOTE) / 12);
    const gain = this.audioContext.createGain();
    source.connect(gain);
    gain.connect(this.audioContext.destination);
    source.start();
    return { source, gain };
  }

  // Stop a preview note, with a short fade-out to avoid a click on key release.
  stopNote(handle) {
    if (!handle) return;
    const { source, gain } = handle;
    const end = this.audioContext.currentTime + 0.02;
    gain.gain.setValueAtTime(gain.gain.value, this.audioContext.currentTime);
    gain.gain.linearRampToValueAtTime(0, end);
    source.stop(end);
  }

  async play(fromRow = 0) {
    await this.ensureAudio();

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
      gain.connect(this.audioContext.destination);
      source.start(origin + event.time);
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

  async loadSamples() {
    return Promise.all(
      this.song.instruments.map(async (instrument) => {
        const response = await fetch(instrument.sample);
        return this.audioContext.decodeAudioData(await response.arrayBuffer());
      }),
    );
  }
}
