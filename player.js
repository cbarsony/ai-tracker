import { buildSchedule } from "./scheduler.js";

const DEFAULT_BPM = 140;
const ROOT_NOTE = 60; // C-4 plays each sample at its natural speed

export class Player {
  constructor(song) {
    this.song = song;
    this.audioContext = null;
    this.buffers = null;
    this.sources = [];
  }

  async play(fromRow = 0) {
    if (!this.audioContext) this.audioContext = new AudioContext();
    if (!this.buffers) this.buffers = await this.loadSamples();
    await this.audioContext.resume();

    this.stop(); // clear any previous run

    // Schedule the whole song upfront: the audio clock keeps the timing.
    const origin = this.audioContext.currentTime;
    const events = buildSchedule(this.song, DEFAULT_BPM, fromRow);

    for (const event of events) {
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
    for (const source of this.sources) {
      try {
        source.stop();
      } catch {
        // already stopped/ended
      }
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
