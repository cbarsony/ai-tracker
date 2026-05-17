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
    // Per-channel currently-playing looped voice; needs explicit cutoff.
    this.channelLoopVoices = new Map();
    this.onRowChange = null;
    this.onInstrumentsLoaded = null;
  }

  getBuffer(instrumentIndex) {
    if (!this.instrumentBuffers) return null;
    const entry = this.instrumentBuffers[instrumentIndex];
    return entry ? entry.buffer : null;
  }

  isPlaying() {
    return this.timerId !== null;
  }

  async start() {
    await this.initAudio();
    await this.audioContext.resume();

    this.nextRowIndex = 0;
    this.currentRowIndex = -1;
    this.nextRowTime = this.audioContext.currentTime;

    this.schedulerTick();
    this.timerId = setInterval(() => this.schedulerTick(), LOOKAHEAD_MS);
  }

  stop() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }

    this.fadeOutActiveSamples();
    this.channelLoopVoices.clear();
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

    this.playSample(instrument, note, this.audioContext.currentTime, null);
  }

  // Play a single voice for the sample editor and return a handle that the
  // caller can use to query the playhead position or stop playback.
  async previewInstrument(instrumentIndex, note) {
    await this.initAudio();
    await this.audioContext.resume();

    const instrument = this.instrumentBuffers[instrumentIndex];
    if (!instrument) {
      return null;
    }

    const startTime = this.audioContext.currentTime;
    const playbackRate = notePitch(
      note,
      instrument.rootNote ?? DEFAULT_ROOT_NOTE,
    );
    const sampleNode = this.playSample(instrument, note, startTime, null);
    if (!sampleNode) return null;

    let stopped = false;
    sampleNode.source.addEventListener("ended", () => {
      stopped = true;
    });

    return {
      startTime,
      playbackRate,
      isStopped: () => stopped,
      stop: () => {
        if (stopped) return;
        stopped = true;
        this.fadeOutSampleAt(sampleNode, this.audioContext.currentTime);
      },
    };
  }

  async initAudio() {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }

    if (!this.instrumentBuffers) {
      this.instrumentBuffers = await this.loadInstruments(this.song.instruments);
      if (this.onInstrumentsLoaded) {
        this.onInstrumentsLoaded();
      }
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
      if (this.nextRowIndex >= pattern.length) {
        this.nextRowIndex = 0;
      }
      const row = pattern[this.nextRowIndex];
      const scheduledRowIndex = this.nextRowIndex;
      const scheduledTime = this.nextRowTime;
      this.scheduleRow(row, scheduledTime);
      this.scheduleRowHighlight(scheduledRowIndex, scheduledTime);
      this.nextRowTime += rowDuration;
      this.nextRowIndex = (this.nextRowIndex + 1) % pattern.length;
    }
  }

  scheduleRowHighlight(rowIndex, time) {
    if (!this.onRowChange) {
      return;
    }
    const delayMs = Math.max(0, (time - this.audioContext.currentTime) * 1000);
    setTimeout(() => {
      if (this.timerId === null) {
        return;
      }
      this.currentRowIndex = rowIndex;
      this.onRowChange(rowIndex);
    }, delayMs);
  }

  scheduleRow(row, time) {
    if (!Array.isArray(row)) {
      return;
    }
    row.forEach((cell, channel) => {
      if (isEmpty(cell)) {
        return;
      }

      if (cell.note === NOTE_OFF) {
        this.cutChannelLoopVoice(channel, time);
        return;
      }

      const instrument = this.instrumentBuffers[cell.instrument];
      if (!instrument) {
        throw new Error(`Unknown instrument number: ${cell.instrument}`);
      }

      // A new note on this channel always cuts any still-playing looped voice.
      this.cutChannelLoopVoice(channel, time);
      this.playSample(instrument, cell.note, time, channel);
    });
  }

  cutChannelLoopVoice(channel, time) {
    const voice = this.channelLoopVoices.get(channel);
    if (!voice) return;
    this.channelLoopVoices.delete(channel);
    this.fadeOutSampleAt(voice, time);
  }

  playSample(instrument, note, time, channel) {
    const source = this.audioContext.createBufferSource();
    const gain = this.audioContext.createGain();
    const volume = instrument.volume ?? 1;
    const playbackRate = notePitch(note, instrument.rootNote ?? DEFAULT_ROOT_NOTE);
    const loop = instrument.loop;
    const looping = !!(loop && loop.enabled);

    source.buffer = instrument.buffer;
    source.playbackRate.setValueAtTime(playbackRate, time);

    if (looping) {
      source.loop = true;
      source.loopStart = Math.max(0, loop.start ?? 0);
      source.loopEnd = Math.min(
        instrument.buffer.duration,
        loop.end ?? instrument.buffer.duration,
      );
    }

    const fadeInDuration = looping
      ? SAMPLE_FADE_SECONDS
      : Math.min(SAMPLE_FADE_SECONDS, (instrument.buffer.duration / playbackRate) / 2);

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(volume, time + fadeInDuration);

    if (!looping) {
      const duration = instrument.buffer.duration / playbackRate;
      const fadeOutDuration = Math.min(SAMPLE_FADE_SECONDS, duration / 2);
      const endTime = time + duration;
      if (endTime > time + fadeOutDuration) {
        gain.gain.setValueAtTime(volume, endTime - fadeOutDuration);
        gain.gain.linearRampToValueAtTime(0, endTime);
      }
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

    if (looping && channel !== null && channel !== undefined) {
      this.channelLoopVoices.set(channel, sampleNode);
    }

    return sampleNode;
  }

  fadeOutSampleAt(sampleNode, time) {
    const { source, gain } = sampleNode;
    const stopTime = time + SAMPLE_FADE_SECONDS;
    if (typeof gain.gain.cancelAndHoldAtTime === "function") {
      gain.gain.cancelAndHoldAtTime(time);
    } else {
      gain.gain.cancelScheduledValues(time);
      gain.gain.setValueAtTime(gain.gain.value, time);
    }
    gain.gain.linearRampToValueAtTime(0, stopTime);
    try {
      source.stop(stopTime);
    } catch {
      this.activeSampleNodes.delete(sampleNode);
    }
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
