import { song } from "./song.js";
import { NOTE_OFF, parseCell } from "./cell.js";

const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_SECONDS = 0.1;
const SAMPLE_FADE_SECONDS = 0.005;
const BPM = 140;
const ROWS_PER_BEAT = 4;

const playButton = document.getElementById("play");
const statusText = document.getElementById("status");

let audioContext = null;
let timerId = null;
let nextRowTime = 0;
let nextRowIndex = 0;
let parsedPattern = null;
let instrumentBuffers = null;
const activeSampleNodes = new Set();

playButton.addEventListener("click", async () => {
  playButton.disabled = true;

  try {
    if (timerId) {
      stop();
    } else {
      await start();
    }
  } catch (error) {
    console.error(error);
    stop(error.message);
  } finally {
    playButton.disabled = false;
    playButton.focus();
  }
});

async function start() {
  await initAudio();
  await audioContext.resume();

  parsedPattern = buildPattern(song);
  nextRowIndex = 0;
  nextRowTime = audioContext.currentTime;

  schedulerTick();
  timerId = setInterval(schedulerTick, LOOKAHEAD_MS);
  playButton.textContent = "Stop";
  setStatus("Playing");
}

function stop(status = "Stopped") {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }

  fadeOutActiveSamples();

  playButton.textContent = "Play";
  setStatus(status);
}

async function initAudio() {
  if (!audioContext) {
    audioContext = new AudioContext();
  }

  if (!instrumentBuffers) {
    instrumentBuffers = await loadInstruments(song.instruments);
  }
}

async function loadInstruments(instruments) {
  return Promise.all(
    instruments.map(async (instrument, index) => ({
      ...instrument,
      index,
      buffer: await decodeSample(instrument.sample, instrument.name),
    })),
  );
}

async function decodeSample(sampleUrl, instrumentName) {
  const response = await fetch(sampleUrl);
  if (!response.ok) {
    throw new Error(`Could not load sample for ${instrumentName}`);
  }

  return audioContext.decodeAudioData(await response.arrayBuffer());
}

function buildPattern(currentSong) {
  const columnCount = currentSong.pattern[0]?.length ?? 0;

  return currentSong.pattern.map((row, rowIndex) => {
    if (!Array.isArray(row) || row.length !== columnCount) {
      throw new Error(
        `Pattern row ${rowIndex} must have ${columnCount} columns`,
      );
    }

    return row.map((cellText, columnIndex) =>
      parseCell(cellText, rowIndex, columnIndex),
    );
  });
}

function schedulerTick() {
  const rowDuration = 60 / (BPM * ROWS_PER_BEAT);

  while (nextRowTime < audioContext.currentTime + SCHEDULE_AHEAD_SECONDS) {
    scheduleRow(parsedPattern[nextRowIndex], nextRowTime);
    nextRowTime += rowDuration;
    nextRowIndex = (nextRowIndex + 1) % parsedPattern.length;
  }
}

function scheduleRow(row, time) {
  for (const cell of row) {
    if (cell.note === null || cell.note === NOTE_OFF) {
      continue;
    }

    const instrument = instrumentBuffers[cell.instrument];
    if (!instrument) {
      throw new Error(`Unknown instrument number: ${cell.instrument}`);
    }

    playSample(instrument, time);
  }
}

function playSample(instrument, time) {
  const source = audioContext.createBufferSource();
  const gain = audioContext.createGain();
  const volume = instrument.volume ?? 1;
  const duration = instrument.buffer.duration;
  const fadeInDuration = Math.min(SAMPLE_FADE_SECONDS, duration / 2);
  const fadeOutDuration = Math.min(SAMPLE_FADE_SECONDS, duration / 2);
  const endTime = time + duration;

  source.buffer = instrument.buffer;
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(volume, time + fadeInDuration);

  if (endTime > time + fadeOutDuration) {
    gain.gain.setValueAtTime(volume, endTime - fadeOutDuration);
    gain.gain.linearRampToValueAtTime(0, endTime);
  }

  source.connect(gain);
  gain.connect(audioContext.destination);
  const sampleNode = { source, gain };
  activeSampleNodes.add(sampleNode);
  source.addEventListener("ended", () => {
    gain.disconnect();
    activeSampleNodes.delete(sampleNode);
  });
  source.start(time);
}

function fadeOutActiveSamples() {
  if (!audioContext) {
    return;
  }

  const now = audioContext.currentTime;
  const stopTime = now + SAMPLE_FADE_SECONDS;

  for (const sampleNode of activeSampleNodes) {
    const { source, gain } = sampleNode;
    rampGainToZero(gain.gain, now, stopTime);

    try {
      source.stop(stopTime);
    } catch {
      activeSampleNodes.delete(sampleNode);
    }
  }
}

function rampGainToZero(gainParam, startTime, endTime) {
  if (typeof gainParam.cancelAndHoldAtTime === "function") {
    gainParam.cancelAndHoldAtTime(startTime);
  } else {
    gainParam.cancelScheduledValues(startTime);
    gainParam.setValueAtTime(gainParam.value, startTime);
  }

  gainParam.linearRampToValueAtTime(0, endTime);
}

function setStatus(message) {
  if (statusText) {
    statusText.textContent = message;
  }
}
