import { parseCell } from "./cell.js";

const BPM_DEFAULT = 140;
const ROWS_PER_BEAT = 4;
const SCHEDULE_LEAD_SECONDS = 0.05;
const SAMPLE_FADE_SECONDS = 0.005;
const DEFAULT_ROOT_NOTE = 60;

export function notePitch(midi, rootNote = DEFAULT_ROOT_NOTE) {
  return 2 ** ((midi - rootNote) / 12);
}

// Builds a flat schedule of all notes for the song.
// Pure function: takes song + starting BPM + starting row, returns
//   { events: [{ time, instrument, midi, volume }], rowTimes: number[], duration }
// where `time` and `rowTimes[i]` are seconds relative to playback start.
// Rows before `startRow` get negative rowTimes (won't match any elapsed time).
// BPM-change effects ("Txx") apply on their own row (option A).
export function buildSchedule(song, startBpm, startRow) {
  const events = [];
  const rowTimes = [];
  let bpm = startBpm;
  let time = 0;
  let startTime = 0;

  for (let r = 0; r < song.pattern.length; r++) {
    if (r === startRow) startTime = time;
    rowTimes.push(time);

    for (const cellText of song.pattern[r]) {
      const parsed = parseCell(cellText);
      if (!parsed) continue;

      let noteVolume = song.instruments[parsed.instrument]?.volume ?? 1;
      if (parsed.effect?.type === "T") bpm = parsed.effect.param;
      if (parsed.effect?.type === "V") noteVolume = parsed.effect.param / 0xff;

      if (r >= startRow && parsed.midi !== undefined && !parsed.noteOff) {
        events.push({
          time: time - startTime,
          instrument: parsed.instrument,
          midi: parsed.midi,
          volume: noteVolume,
        });
      }
    }

    time += 60 / (bpm * ROWS_PER_BEAT);
  }

  return {
    events,
    rowTimes: rowTimes.map((t) => t - startTime),
    duration: time - startTime,
  };
}

export class Player {
  constructor(song) {
    this.song = song;
    this.audioContext = null;
    this.instrumentBuffers = null;
    this.scheduledNodes = [];
    this.rowTimes = [];
    this.duration = 0;
    this.startedAt = 0;
    this.lastReportedRow = -1;
    this.rafId = null;
    this.onRowChange = null;
    this.onEnd = null;
  }

  isPlaying() {
    return this.rafId !== null;
  }

  async initAudio() {
    if (!this.audioContext) this.audioContext = new AudioContext();
    if (!this.instrumentBuffers) {
      this.instrumentBuffers = await Promise.all(
        this.song.instruments.map(async (inst) => {
          const res = await fetch(inst.sample);
          if (!res.ok) throw new Error(`Could not load sample for ${inst.name}`);
          const buf = await res.arrayBuffer();
          return { ...inst, buffer: await this.audioContext.decodeAudioData(buf) };
        }),
      );
    }
    await this.audioContext.resume();
  }

  async previewNote(instrumentIndex, midiNote) {
    await this.initAudio();
    const inst = this.instrumentBuffers[instrumentIndex];
    if (!inst) return;
    this.playSample(inst, midiNote, this.audioContext.currentTime, inst.volume ?? 1);
  }

  async start(fromRow = 0) {
    await this.initAudio();

    const { events, rowTimes, duration } = buildSchedule(this.song, BPM_DEFAULT, fromRow);
    const origin = this.audioContext.currentTime + SCHEDULE_LEAD_SECONDS;

    this.scheduledNodes = [];
    for (const ev of events) {
      const inst = this.instrumentBuffers[ev.instrument];
      if (!inst) {
        console.warn(`Unknown instrument: ${ev.instrument}`);
        continue;
      }
      const node = this.playSample(inst, ev.midi, origin + ev.time, ev.volume);
      this.scheduledNodes.push(node);
    }

    this.rowTimes = rowTimes;
    this.duration = duration;
    this.startedAt = origin;
    this.lastReportedRow = -1;
    this.startRowTracking();
  }

  stop() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.fadeOutAllNodes();
    this.scheduledNodes = [];
    this.lastReportedRow = -1;
    if (this.onRowChange) this.onRowChange(-1);
  }

  startRowTracking() {
    const tick = () => {
      const elapsed = this.audioContext.currentTime - this.startedAt;
      if (elapsed >= this.duration) {
        this.rafId = null;
        if (this.onEnd) this.onEnd();
        return;
      }
      const row = currentRow(elapsed, this.rowTimes);
      if (row !== this.lastReportedRow) {
        this.lastReportedRow = row;
        if (this.onRowChange) this.onRowChange(row);
      }
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  playSample(inst, midi, time, volume) {
    const ctx = this.audioContext;
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    const playbackRate = notePitch(midi, inst.rootNote ?? DEFAULT_ROOT_NOTE);
    const duration = inst.buffer.duration / playbackRate;
    const fade = Math.min(SAMPLE_FADE_SECONDS, duration / 2);

    source.buffer = inst.buffer;
    source.playbackRate.value = playbackRate;
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(volume, time + fade);
    gain.gain.setValueAtTime(volume, time + duration - fade);
    gain.gain.linearRampToValueAtTime(0, time + duration);

    source.connect(gain).connect(ctx.destination);
    source.addEventListener("ended", () => gain.disconnect());
    source.start(time);
    return source;
  }

  fadeOutAllNodes() {
    if (!this.audioContext) return;
    const stop = this.audioContext.currentTime + SAMPLE_FADE_SECONDS;
    for (const source of this.scheduledNodes) {
      try {
        source.stop(stop);
      } catch {
        /* already stopped or never started */
      }
    }
  }
}

// Largest i with rowTimes[i] in [0, elapsed]; -1 if none.
function currentRow(elapsed, rowTimes) {
  let result = -1;
  for (let i = 0; i < rowTimes.length; i++) {
    const t = rowTimes[i];
    if (t < 0) continue;
    if (t <= elapsed) result = i;
    else break;
  }
  return result;
}
