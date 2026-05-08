import { TrackerNotation } from "../tracker/tracker-notation.js";
import { RuntimeInstrument } from "./runtime-instrument.js";

export class AudioEngine {
  constructor(song) {
    this.song = song;
    this.context = null;
    this.instruments = null;
  }

  get currentTime() {
    return this.context.currentTime;
  }

  init() {
    if (this.context) return;

    this.context = new AudioContext();
    this.instruments = {};

    for (const channelName of this.song.channels) {
      const instrument = this.song.getInstrument
        ? this.song.getInstrument(channelName)
        : this.song.instruments[channelName];
      if (!instrument) {
        throw new Error(`Missing instrument for channel: ${channelName}`);
      }

      this.instruments[channelName] = new RuntimeInstrument(
        instrument,
        this.makeInstrumentBuffer(instrument),
      );
    }
  }

  async resume() {
    await this.context.resume();
  }

  stopTrackNow(track) {
    if (!track.currentSource) return;

    try {
      track.currentSource.stop();
    } catch (_) {
      // already stopped
    }

    track.clearSource();
  }

  scheduleCell(track, cell, rowDuration) {
    if (cell.isNoteOff) {
      this.stopTrackAtRowTime(track);
      return;
    }

    if (cell.isEmpty) {
      return;
    }

    const instrument = this.instruments[track.name];
    if (!instrument) {
      throw new Error(`Unknown instrument for channel: ${track.name}`);
    }

    this.stopTrackAtRowTime(track);
    this.startInstrumentNote(track, cell, instrument, rowDuration);
  }

  stopTrackAtRowTime(track) {
    if (!track.currentSource) return;

    track.currentSource.stop(track.nextRowTime);
    track.clearSource();
  }

  startInstrumentNote(track, cell, instrument, rowDuration) {
    const source = this.context.createBufferSource();
    source.buffer = instrument.buffer;
    source.loop = instrument.loop;

    if (instrument.pitched) {
      const frequency = TrackerNotation.midiToFrequency(cell.note);
      const sourceBaseFrequency =
        instrument.baseFrequency ??
        instrument.buffer.sampleRate / instrument.buffer.length;
      source.playbackRate.value = frequency / sourceBaseFrequency;
    }

    source.onended = () => track.clearSource(source);

    const gainNode = this.context.createGain();
    const stopTime = track.nextRowTime + rowDuration * instrument.durationRows;
    const volume = instrument.volume * cell.effect.volumeMultiplier;

    gainNode.gain.setValueAtTime(0, track.nextRowTime);
    gainNode.gain.linearRampToValueAtTime(
      volume,
      track.nextRowTime + instrument.attack,
    );
    gainNode.gain.setValueAtTime(volume, track.nextRowTime + instrument.attack);
    gainNode.gain.linearRampToValueAtTime(0.0001, stopTime);

    source.connect(gainNode);
    gainNode.connect(this.context.destination);
    source.start(track.nextRowTime);
    source.stop(stopTime);

    track.rememberSource(source, stopTime);
  }

  makeInstrumentBuffer(instrument) {
    const sampleRate = this.context.sampleRate;
    const samples = instrument.samples ?? instrument.generator?.({ sampleRate });

    this.validateInstrumentSamples(samples, instrument.description);

    const buffer = this.context.createBuffer(1, samples.length, sampleRate);
    buffer.copyToChannel(samples, 0);
    return buffer;
  }

  validateInstrumentSamples(samples, description) {
    const label = description ? ` (${description})` : "";

    if (!(samples instanceof Float32Array)) {
      throw new Error(`Instrument samples${label} must be a Float32Array`);
    }

    if (samples.length === 0) {
      throw new Error(`Instrument samples${label} must not be empty`);
    }

    let clippedSampleCount = 0;
    let peak = 0;

    for (let i = 0; i < samples.length; i++) {
      const sample = samples[i];
      if (!Number.isFinite(sample)) {
        throw new Error(
          `Instrument sample ${i}${label} must be a finite number; received ${sample}`,
        );
      }

      peak = Math.max(peak, Math.abs(sample));

      if (sample < -1) {
        samples[i] = -1;
        clippedSampleCount++;
      } else if (sample > 1) {
        samples[i] = 1;
        clippedSampleCount++;
      }
    }

    if (clippedSampleCount > 0) {
      console.warn(
        `Instrument samples${label} had ${clippedSampleCount} value(s) outside -1..1; peak was ${peak}. Values were clamped.`,
      );
    }
  }
}