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
      gain.connect(this.audioContext.destination);
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

  // Fire-and-forget audition of a single note. Bypasses the scheduler and is
  // not tracked in `this.sources`, so it rings out naturally and is never cut
  // by `stop()`. Lazily boots the audio context so it works before first play.
  async previewNote(pitch, instrumentId) {
    if (!this.audioContext) this.audioContext = new AudioContext();
    if (!this.buffers) this.buffers = await this.loadSamples();
    await this.audioContext.resume();

    const source = this.audioContext.createBufferSource();
    source.buffer = this.buffers[instrumentId];
    source.playbackRate.value = 2 ** ((pitchToMidi(pitch) - ROOT_NOTE) / 12);
    source.connect(this.audioContext.destination);
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
