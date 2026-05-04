import { SONG } from "./song1.js";

const NOTE_OFF = -1;

const LOOKAHEAD = 25;
const SCHEDULE_AHEAD_TIME = 0.1;
const ROW_DURATION = 60 / (SONG.bpm * SONG.rowsPerBeat);

const SEMITONES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

let Audio = null;
let Instruments = null;
let TimerId = null;

const tracks = buildTracks(SONG);

function buildTracks(song) {
  const channelCount = song.channels.length;

  return song.channels.map((name, channelIndex) => {
    const rows = song.pattern.map((patternRow, rowIndex) => {
      validatePatternRow(patternRow, rowIndex, channelCount);
      return parseCell(patternRow[channelIndex], rowIndex, channelIndex);
    });

    return {
      name,
      rows,
      row: 0,
      nextRowTime: 0,
      currentSource: null,
      currentSourceStopTime: 0,
    };
  });
}

function validatePatternRow(patternRow, rowIndex, channelCount) {
  if (!Array.isArray(patternRow)) {
    throw new Error(`Pattern row ${rowIndex} must be an array`);
  }

  if (patternRow.length !== channelCount) {
    throw new Error(
      `Pattern row ${rowIndex} has ${patternRow.length} cells, expected ${channelCount}`,
    );
  }
}

function parseCell(cellText, rowIndex, channelIndex) {
  const match = /^(---|===|[A-G][#-]\d)\|(.{3})$/.exec(cellText);
  if (!match) {
    throw new Error(
      `Invalid cell at row ${rowIndex}, channel ${channelIndex}: ${cellText}`,
    );
  }

  const [, noteText, effect] = match;

  if (noteText === "---") return { note: null, effect };
  if (noteText === "===") return { note: NOTE_OFF, effect };

  return { note: noteTextToMidi(noteText), effect };
}

function noteTextToMidi(noteText) {
  const match = /^([A-G])([#-])(\d)$/.exec(noteText);
  if (!match) throw new Error(`Invalid note: ${noteText}`);

  const [, name, accidental, octaveText] = match;
  const sharp = accidental === "#" ? 1 : 0;
  return (Number(octaveText) + 1) * 12 + SEMITONES[name] + sharp;
}

const playButton = document.getElementById("play");
playButton.addEventListener("click", async () => {
  if (TimerId) {
    stop();
  } else {
    await start();
  }
});

async function start() {
  initAudio();
  await Audio.resume();

  const startTime = Audio.currentTime;
  for (const track of tracks) {
    track.row = 0;
    track.nextRowTime = startTime;
    track.currentSource = null;
    track.currentSourceStopTime = 0;
  }

  schedulerTick();
  TimerId = setInterval(schedulerTick, LOOKAHEAD);
  playButton.textContent = "Stop";
}

function stop() {
  clearInterval(TimerId);
  TimerId = null;

  for (const track of tracks) {
    if (track.currentSource) {
      try {
        track.currentSource.stop();
      } catch (_) {
        // already stopped
      }
      track.currentSource = null;
    }
  }

  playButton.textContent = "Play";
}

function noteToFrequency(note) {
  return 440 * Math.pow(2, (note - 69) / 12);
}

function schedulerTick() {
  for (const track of tracks) {
    while (track.nextRowTime < Audio.currentTime + SCHEDULE_AHEAD_TIME) {
      scheduleRow(track);
      track.nextRowTime += ROW_DURATION;
      track.row = (track.row + 1) % track.rows.length;
    }
  }
}

function scheduleRow(track) {
  const cell = track.rows[track.row];

  console.log(
    `t${Audio.currentTime.toFixed(3)} ${track.name} row ${track.row}: ${cell.note}|${cell.effect} (${track.nextRowTime.toFixed(3)})`,
  );

  if (cell.note === NOTE_OFF) {
    if (track.currentSource) {
      track.currentSource.stop(track.nextRowTime);
      track.currentSource = null;
    }
    return;
  }

  if (cell.note === null) {
    // Empty row: let whatever is playing on this channel keep playing.
    return;
  }

  const instrument = Instruments[track.name];
  if (!instrument) {
    throw new Error(`Unknown instrument for channel: ${track.name}`);
  }

  // Channels are monophonic: cut the previous note before starting a new one.
  if (track.currentSource) {
    track.currentSource.stop(track.nextRowTime);
  }

  const source = Audio.createBufferSource();
  source.buffer = instrument.buffer;
  source.loop = instrument.loop;
  if (instrument.pitched) {
    const freq = noteToFrequency(cell.note);
    const sourceBaseFrequency =
      instrument.baseFrequency ??
      instrument.buffer.sampleRate / instrument.buffer.length;
    source.playbackRate.value = freq / sourceBaseFrequency;
  }
  source.onended = () => {
    if (track.currentSource === source) track.currentSource = null;
  };

  const gainNode = Audio.createGain();
  const stopTime = track.nextRowTime + ROW_DURATION * instrument.durationRows;
  gainNode.gain.setValueAtTime(0, track.nextRowTime);
  gainNode.gain.linearRampToValueAtTime(
    instrument.volume,
    track.nextRowTime + instrument.attack,
  );
  gainNode.gain.setValueAtTime(
    instrument.volume,
    track.nextRowTime + instrument.attack,
  );
  gainNode.gain.linearRampToValueAtTime(0.0001, stopTime);
  source.connect(gainNode);
  gainNode.connect(Audio.destination);
  source.start(track.nextRowTime);
  source.stop(stopTime);

  track.currentSource = source;
  track.currentSourceStopTime = stopTime;
}

export function initAudio() {
  if (Audio) return;

  Audio = new AudioContext();
  Instruments = {};

  for (const channelName of SONG.channels) {
    const instrument = SONG.instruments[channelName];
    if (!instrument) {
      throw new Error(`Missing instrument for channel: ${channelName}`);
    }

    Instruments[channelName] = {
      ...instrument,
      buffer: makeInstrumentBuffer(instrument),
    };
  }
}

function makeInstrumentBuffer(instrument) {
  const sampleRate = Audio.sampleRate;
  const samples = instrument.samples ?? instrument.generator?.({ sampleRate });

  validateInstrumentSamples(samples, instrument.description);

  const buffer = Audio.createBuffer(1, samples.length, sampleRate);
  buffer.copyToChannel(samples, 0);
  return buffer;
}

function validateInstrumentSamples(samples, description) {
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
