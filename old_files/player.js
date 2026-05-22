import { NOTE_OFF, isEmpty } from "./cell.js";

const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_SECONDS = 0.1;
const SAMPLE_FADE_SECONDS = 0.005;
const BPM = 140;
const ROWS_PER_BEAT = 4;
const DEFAULT_ROOT_NOTE = 60;

export function notePitch(note, rootNote = DEFAULT_ROOT_NOTE) {
  return 2 ** ((note - rootNote) / 12);
}

export class Player {
  constructor(song) {
    this.song = song;
    this.audioContext = null;
    this.timerId = null;
    this.nextRowTime = 0;
    this.nextRowIndex = 0;
    this.currentRowIndex = -1;
    this.instrumentBuffers = null;
    this.activeSampleNodes = new Set();
    this.rowChangeTimeouts = new Set();
    this.onRowChange = null;
  }

  isPlaying() {
    return this.timerId !== null;
  }

  async start(fromRow = 0) {
    await this.initAudio();
    await this.audioContext.resume();

    this.parsedPattern = this.buildPattern(this.song);
    this.nextRowIndex = fromRow % this.parsedPattern.length;
    this.nextRowTime = this.audioContext.currentTime;

    this.schedulerTick();
    this.timerId = setInterval(() => this.schedulerTick(), LOOKAHEAD_MS);
  }

  async previewNote(instrumentIndex, midiNote) {
    await this.initAudio();
    await this.audioContext.resume();
    const instrument = this.instrumentBuffers[instrumentIndex];
    if (!instrument) return;
    this.playSample(instrument, midiNote, this.audioContext.currentTime);
  }

  stop() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }

    for (const id of this.rowChangeTimeouts) clearTimeout(id);
    this.rowChangeTimeouts.clear();

    this.fadeOutActiveSamples();
    this.currentRowIndex = -1;
    if (this.onRowChange) {
      this.onRowChange(-1);
    }
  }

  async previewNote(note, instrumentIndex) {
    try {
      await this.initAudio();
      await this.audioContext.resume();
    } catch (error) {
      console.error(error);
      return;
    }

    const instrument = this.instrumentBuffers[instrumentIndex];
    if (!instrument) {
      return;
    }

    this.playSample(instrument, note, this.audioContext.currentTime);
  }

  async initAudio() {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }

    if (!this.instrumentBuffers) {
      this.instrumentBuffers = await this.loadInstruments(this.song.instruments);
    }
  }

  async loadInstruments(instruments) {
    return Promise.all(
      instruments.map(async (instrument, index) => ({
        ...instrument,
        index,
        buffer: await this.decodeSample(instrument.sample, instrument.name),
      })),
    );
  }

  async decodeSample(sampleUrl, instrumentName) {
    const response = await fetch(sampleUrl);
    if (!response.ok) {
      throw new Error(`Could not load sample for ${instrumentName}`);
    }

    return this.audioContext.decodeAudioData(await response.arrayBuffer());
  }

  schedulerTick() {
    const rowDuration = 60 / (BPM * ROWS_PER_BEAT);
    const pattern = this.song.pattern;
    if (!Array.isArray(pattern) || pattern.length === 0) {
      return;
    }

    while (
      this.nextRowTime <
      this.audioContext.currentTime + SCHEDULE_AHEAD_SECONDS
    ) {
      this.scheduleRow(this.parsedPattern[this.nextRowIndex], this.nextRowTime);
      this.scheduleRowChangeCallback(this.nextRowIndex, this.nextRowTime);
      this.nextRowTime += rowDuration;
      this.nextRowIndex = (this.nextRowIndex + 1) % this.parsedPattern.length;
    }
  }

  scheduleRowChangeCallback(rowIndex, time) {
    if (!this.onRowChange) return;
    const delay = Math.max(0, (time - this.audioContext.currentTime) * 1000);
    const id = setTimeout(() => {
      this.rowChangeTimeouts.delete(id);
      this.onRowChange(rowIndex);
    }, delay);
    this.rowChangeTimeouts.add(id);
  }

  scheduleRow(row, time) {
    if (!Array.isArray(row)) {
      return;
    }
    for (const cell of row) {
      if (isEmpty(cell) || cell.note === NOTE_OFF) {
        continue;
      }

      const instrument = this.instrumentBuffers[cell.instrument];
      if (!instrument) {
        throw new Error(`Unknown instrument number: ${cell.instrument}`);
      }

      this.playSample(instrument, cell.note, time);
    }
  }

  playSample(instrument, note, time) {
    const source = this.audioContext.createBufferSource();
    const gain = this.audioContext.createGain();
    const volume = instrument.volume ?? 1;
    const playbackRate = notePitch(note, instrument.rootNote ?? DEFAULT_ROOT_NOTE);
    const duration = instrument.buffer.duration / playbackRate;
    const fadeInDuration = Math.min(SAMPLE_FADE_SECONDS, duration / 2);
    const fadeOutDuration = Math.min(SAMPLE_FADE_SECONDS, duration / 2);
    const endTime = time + duration;

    source.buffer = instrument.buffer;
    source.playbackRate.setValueAtTime(playbackRate, time);
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(volume, time + fadeInDuration);

    if (endTime > time + fadeOutDuration) {
      gain.gain.setValueAtTime(volume, endTime - fadeOutDuration);
      gain.gain.linearRampToValueAtTime(0, endTime);
    }

    source.connect(gain);
    gain.connect(this.audioContext.destination);
    const sampleNode = { source, gain };
    this.activeSampleNodes.add(sampleNode);
    source.addEventListener("ended", () => {
      gain.disconnect();
      this.activeSampleNodes.delete(sampleNode);
    });
    source.start(time);
  }

  fadeOutActiveSamples() {
    if (!this.audioContext) {
      return;
    }

    const now = this.audioContext.currentTime;
    const stopTime = now + SAMPLE_FADE_SECONDS;

    for (const sampleNode of this.activeSampleNodes) {
      const { source, gain } = sampleNode;
      this.rampGainToZero(gain.gain, now, stopTime);

      try {
        source.stop(stopTime);
      } catch {
        this.activeSampleNodes.delete(sampleNode);
      }
    }
  }

  rampGainToZero(gainParam, startTime, endTime) {
    if (typeof gainParam.cancelAndHoldAtTime === "function") {
      gainParam.cancelAndHoldAtTime(startTime);
    } else {
      gainParam.cancelScheduledValues(startTime);
      gainParam.setValueAtTime(gainParam.value, startTime);
    }

    gainParam.linearRampToValueAtTime(0, endTime);
  }
}
