import { Cell, NOTE_OFF } from "./cell.js";
import { squareWave, makeHihatBuffer, makeSnareBuffer } from "./waveforms.js";

const SAMPLE_RATE = 44100;
const BPM = 120;
const ROWS_PER_BEAT = 4;
const LOOKAHEAD = 25;
const SCHEDULE_AHEAD_TIME = 0.1;
const ROW_DURATION = 60 / (BPM * ROWS_PER_BEAT);

let Audio = null;
let Instruments = null;
let TimerId = null;

const pattern1 = [
  new Cell(60, 1),
  new Cell(62, 1),
  new Cell(-1), // note off
  new Cell(65, 1),
  new Cell(67, 1),
  new Cell(null), // sustain
  new Cell(null), // sustain
  new Cell(72, 1),
];

const pattern2 = [
  new Cell(60, 2),
  new Cell(-1),
  new Cell(60, 2),
  new Cell(-1),
  new Cell(60, 3),
  new Cell(null),
  new Cell(60, 2),
  new Cell(60, 2),
];

const tracks = [makeTrack(pattern1), makeTrack(pattern2)];

function makeTrack(pattern) {
  return {
    pattern,
    row: 0,
    nextRowTime: 0,
    currentSource: null,
    currentSourceStopTime: 0,
  };
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
  await Audio.resume(); // ensure context is running before scheduling

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
  console.log("tick");
  for (const track of tracks) {
    while (track.nextRowTime < Audio.currentTime + SCHEDULE_AHEAD_TIME) {
      scheduleRow(track);
      track.nextRowTime += ROW_DURATION;
      track.row = (track.row + 1) % track.pattern.length;
    }
  }
}

function scheduleRow(track) {
  const cell = track.pattern[track.row];
  console.log(
    `t${Audio.currentTime.toFixed(3)} Row ${track.row}: ${cell.note}/${cell.instrument} (${track.nextRowTime.toFixed(3)})`,
  );

  if (cell.note === NOTE_OFF) {
    if (track.currentSource) {
      track.currentSource.stop(track.nextRowTime);
      track.currentSource = null;
    }
    return;
  }

  if (cell.note === null) {
    // Sustain: extend the current source's stop time
    if (track.currentSource) {
      track.currentSourceStopTime += ROW_DURATION;
      track.currentSource.stop(track.currentSourceStopTime);
    }
    return;
  }

  // New note: cut off the previous source and start a new one
  if (track.currentSource) {
    track.currentSource.stop(track.nextRowTime);
  }

  const instrument = Instruments[cell.instrument];
  const source = Audio.createBufferSource();
  source.buffer = instrument.buffer;
  source.loop = instrument.loop;
  if (instrument.pitched) {
    const freq = noteToFrequency(cell.note);
    source.playbackRate.value =
      freq / (SAMPLE_RATE / instrument.buffer.length);
  }
  source.onended = () => {
    if (track.currentSource === source) track.currentSource = null;
  };

  const gainNode = Audio.createGain();
  gainNode.gain.value = instrument.volume;
  source.connect(gainNode);
  gainNode.connect(Audio.destination);
  source.start(track.nextRowTime);

  track.currentSourceStopTime = track.nextRowTime + ROW_DURATION;
  source.stop(track.currentSourceStopTime);

  track.currentSource = source;
}

export function initAudio() {
  if (Audio) return;

  Audio = new AudioContext();

  // Instrument 1: square wave (pitched, looped)
  const normalized = new Float32Array(squareWave.length);
  for (let i = 0; i < squareWave.length; i++) {
    normalized[i] = squareWave[i] / 128;
  }
  const squareBuffer = Audio.createBuffer(1, normalized.length, SAMPLE_RATE);
  squareBuffer.copyToChannel(normalized, 0);

  Instruments = {
    1: { buffer: squareBuffer, loop: true,  pitched: true,  volume: 0.05 },
    2: { buffer: makeHihatBuffer(Audio), loop: false, pitched: false, volume: 0.2  },
    3: { buffer: makeSnareBuffer(Audio), loop: false, pitched: false, volume: 0.1  },
  };
}
