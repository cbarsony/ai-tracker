import { NOTE_OFF, isEmpty } from "./cell.js";
import { LOOP_TYPES, getLoopSettings } from "./sample-loop.js";

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
    this.channelLoopNodes = new Map();
    this.onRowChange = null;
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

    this.playSample(instrument, note, this.audioContext.currentTime, {
      maxDuration: 1.5,
    });
  }

  async previewInstrument(instrumentIndex, note) {
    await this.initAudio();
    await this.audioContext.resume();

    const instrument = this.instrumentBuffers[instrumentIndex];
    if (!instrument) {
      return null;
    }

    const startTime = this.audioContext.currentTime;
    const playbackRate = notePitch(note, instrument.rootNote ?? DEFAULT_ROOT_NOTE);
    const sampleNode = this.playSample(instrument, note, startTime);

    return {
      startTime,
      playbackRate,
      stop: () => this.stopSampleNode(sampleNode, this.audioContext.currentTime),
      isStopped: () => !this.activeSampleNodes.has(sampleNode),
    };
  }

  async initAudio() {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
      this.masterAnalyser = this.audioContext.createAnalyser();
      this.masterAnalyser.fftSize = 2048;
      this.masterAnalyser.connect(this.audioContext.destination);
      this._clipBuffer = new Float32Array(this.masterAnalyser.fftSize);
      this._lastClipWarnTime = -Infinity;
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

  async getInstrumentBuffer(instrumentIndex) {
    await this.initAudio();
    return this.instrumentBuffers[instrumentIndex]?.buffer ?? null;
  }

  updateInstrumentLoop(instrumentIndex, loop) {
    if (!this.instrumentBuffers?.[instrumentIndex]) {
      return;
    }
    this.instrumentBuffers[instrumentIndex].loop = loop;
  }

  async decodeSample(sampleUrl, instrumentName) {
    const response = await fetch(sampleUrl);
    if (!response.ok) {
      throw new Error(`Could not load sample for ${instrumentName}`);
    }

    return this.audioContext.decodeAudioData(await response.arrayBuffer());
  }

  checkClipping() {
    this.masterAnalyser.getFloatTimeDomainData(this._clipBuffer);
    let peak = 0;
    for (let i = 0; i < this._clipBuffer.length; i++) {
      const abs = Math.abs(this._clipBuffer[i]);
      if (abs > peak) peak = abs;
    }
    if (peak > 1.0) {
      const now = this.audioContext.currentTime;
      if (now - this._lastClipWarnTime >= 1.0) {
        this._lastClipWarnTime = now;
        console.warn(`[Player] Audio clipping detected: peak level ${peak.toFixed(3)} at t=${now.toFixed(3)}s`);
      }
    }
  }

  schedulerTick() {
    this.checkClipping();
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
    for (let channelIndex = 0; channelIndex < row.length; channelIndex += 1) {
      const cell = row[channelIndex];
      if (isEmpty(cell)) {
        continue;
      }

      if (cell.note === NOTE_OFF) {
        this.stopChannelLoop(channelIndex, time);
        continue;
      }

      const instrument = this.instrumentBuffers[cell.instrument];
      if (!instrument) {
        throw new Error(`Unknown instrument number: ${cell.instrument}`);
      }

      this.stopChannelLoop(channelIndex, time);
      const sampleNode = this.playSample(instrument, cell.note, time, {
        channelIndex,
      });
      if (sampleNode?.isLooping) {
        this.channelLoopNodes.set(channelIndex, sampleNode);
      }
    }
  }

  playSample(instrument, note, time, options = {}) {
    const source = this.audioContext.createBufferSource();
    const gain = this.audioContext.createGain();
    const volume = instrument.volume ?? 1;
    const playbackRate = notePitch(note, instrument.rootNote ?? DEFAULT_ROOT_NOTE);
    const loop = getLoopSettings(instrument, instrument.buffer.duration);
    const isLooping = loop.enabled && loop.end > loop.start;
    const sourceBuffer = isLooping
      ? this.getLoopSourceBuffer(instrument, loop)
      : instrument.buffer;
    const loopEnd = loop.type === LOOP_TYPES.PING_PONG ? sourceBuffer.duration : loop.end;
    const duration = options.maxDuration ?? instrument.buffer.duration / playbackRate;
    const fadeInDuration = Math.min(SAMPLE_FADE_SECONDS, duration / 2);
    const fadeOutDuration = Math.min(SAMPLE_FADE_SECONDS, duration / 2);
    const endTime = isLooping && options.maxDuration === undefined ? null : time + duration;

    source.buffer = sourceBuffer;
    source.loop = isLooping;
    if (isLooping) {
      source.loopStart = loop.start;
      source.loopEnd = loopEnd;
    }
    source.playbackRate.setValueAtTime(playbackRate, time);
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(volume, time + fadeInDuration);

    if (endTime !== null && endTime > time + fadeOutDuration) {
      gain.gain.setValueAtTime(volume, endTime - fadeOutDuration);
      gain.gain.linearRampToValueAtTime(0, endTime);
    }

    source.connect(gain);
    gain.connect(this.masterAnalyser);
    const sampleNode = {
      source,
      gain,
      channelIndex: options.channelIndex ?? null,
      isLooping,
    };
    this.activeSampleNodes.add(sampleNode);
    source.addEventListener("ended", () => {
      gain.disconnect();
      this.activeSampleNodes.delete(sampleNode);
      if (
        sampleNode.channelIndex !== null &&
        this.channelLoopNodes.get(sampleNode.channelIndex) === sampleNode
      ) {
        this.channelLoopNodes.delete(sampleNode.channelIndex);
      }
    });
    source.start(time);
    if (endTime !== null) {
      source.stop(endTime);
    }
    return sampleNode;
  }

  getLoopSourceBuffer(instrument, loop) {
    if (loop.type !== LOOP_TYPES.PING_PONG) {
      return instrument.buffer;
    }

    const cacheKey = `${loop.start}:${loop.end}:${instrument.buffer.length}:${instrument.buffer.sampleRate}`;
    if (instrument.pingPongLoopCache?.key === cacheKey) {
      return instrument.pingPongLoopCache.buffer;
    }

    const buffer = this.createPingPongLoopBuffer(instrument.buffer, loop);
    instrument.pingPongLoopCache = { key: cacheKey, buffer };
    return buffer;
  }

  createPingPongLoopBuffer(buffer, loop) {
    const sampleRate = buffer.sampleRate;
    const startFrame = Math.max(0, Math.min(buffer.length - 1, Math.floor(loop.start * sampleRate)));
    const endFrame = Math.max(
      startFrame + 1,
      Math.min(buffer.length, Math.ceil(loop.end * sampleRate)),
    );
    const loopFrameCount = endFrame - startFrame;
    const outputLength = endFrame + loopFrameCount;
    const output = this.audioContext.createBuffer(
      buffer.numberOfChannels,
      outputLength,
      sampleRate,
    );

    for (let channelIndex = 0; channelIndex < buffer.numberOfChannels; channelIndex += 1) {
      const inputData = buffer.getChannelData(channelIndex);
      const outputData = output.getChannelData(channelIndex);

      outputData.set(inputData.subarray(0, endFrame), 0);
      for (let frame = 0; frame < loopFrameCount; frame += 1) {
        outputData[endFrame + frame] = inputData[endFrame - 1 - frame];
      }
    }

    return output;
  }

  stopChannelLoop(channelIndex, time) {
    const sampleNode = this.channelLoopNodes.get(channelIndex);
    if (!sampleNode) {
      return;
    }

    this.stopSampleNode(sampleNode, time);
    this.channelLoopNodes.delete(channelIndex);
  }

  stopSampleNode(sampleNode, time) {
    const stopTime = time + SAMPLE_FADE_SECONDS;
    this.rampGainToZero(sampleNode.gain.gain, time, stopTime);

    try {
      sampleNode.source.stop(stopTime);
    } catch {
      this.activeSampleNodes.delete(sampleNode);
    }
  }

  fadeOutActiveSamples() {
    if (!this.audioContext) {
      return;
    }

    const now = this.audioContext.currentTime;

    for (const sampleNode of this.activeSampleNodes) {
      this.stopSampleNode(sampleNode, now);
    }
    this.channelLoopNodes.clear();
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
