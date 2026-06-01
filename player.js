import { buildSchedule } from "./scheduler.js";

const DEFAULT_BPM = 140;
const ROOT_NOTE = 60; // C-4 plays each sample at its natural speed

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

  async play(fromRow = 0) {
    if (!this.audioContext) this.audioContext = new AudioContext();
    if (!this.buffers) this.buffers = await this.loadSamples();
    await this.audioContext.resume();

    this.stop(); // clear any previous run

    // Schedule the whole song upfront: the audio clock keeps the timing.
    const origin = this.audioContext.currentTime;
    const events = buildSchedule(this.song, DEFAULT_BPM, fromRow);

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
