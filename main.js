import { Cell, NOTE_OFF } from "./cell.js";
import {
  makeBassWaveBuffer,
  makeHihatBuffer,
  makeKickBuffer,
  makePadWaveBuffer,
  makePluckBuffer,
  makeSnareBuffer,
} from "./waveforms.js";

const SAMPLE_RATE = 44100;
const BPM = 120;
const ROWS_PER_BEAT = 4;
const LOOKAHEAD = 25;
const SCHEDULE_AHEAD_TIME = 0.1;
const ROW_DURATION = 60 / (BPM * ROWS_PER_BEAT);

let Audio = null;
let Instruments = null;
let TimerId = null;

const PATTERN_LENGTH = 64;

const INSTRUMENTS = {
  KICK: 1,
  SNARE: 2,
  HIHAT: 3,
  BASS: 4,
  PLUCK: 5,
  PAD: 6,
};

const rest = () => new Cell(null);
const off = () => new Cell(NOTE_OFF);
const note = (midiNote, instrument) => new Cell(midiNote, instrument);

const pattern1 = Array.from({ length: PATTERN_LENGTH }, (_, row) => {
  const hits = [];

  if (row % 16 === 0 || row % 16 === 8 || row === 30 || row === 46) {
    hits.push(note(36, INSTRUMENTS.KICK));
  }

  if (row % 16 === 4 || row % 16 === 12) {
    hits.push(note(38, INSTRUMENTS.SNARE));
  }

  if (row % 2 === 0) {
    hits.push(note(42, INSTRUMENTS.HIHAT));
  }

  if (row % 16 === 15 || row === 63) {
    hits.push(note(42, INSTRUMENTS.HIHAT));
  }

  return hits.length ? hits : rest();
});

const bassNotes = [
  36, null, null, 36, 43, null, 46, null,
  34, null, null, 34, 41, null, 43, null,
  32, null, null, 32, 39, null, 43, null,
  31, null, 31, null, 38, null, 43, 46,
  36, null, 36, null, 43, null, 46, null,
  34, null, 34, null, 41, null, 43, 46,
  32, null, 32, null, 39, null, 43, null,
  31, null, 31, null, 38, null, 43, 46,
];
const pattern2 = bassNotes.map((midiNote) =>
  midiNote === null ? off() : note(midiNote, INSTRUMENTS.BASS),
);

const pluckNotes = [
  72, null, 76, null, 79, null, 76, null,
  70, null, 74, null, 77, null, 74, null,
  67, null, 72, null, 75, null, 72, null,
  67, null, 71, null, 74, null, 79, null,
  72, null, 76, null, 79, null, 84, null,
  70, null, 74, null, 77, null, 82, null,
  67, null, 72, null, 75, null, 79, null,
  67, null, 71, null, 74, null, 76, 79,
];
const pattern3 = pluckNotes.map((midiNote) =>
  midiNote === null ? rest() : note(midiNote, INSTRUMENTS.PLUCK),
);

const pattern4 = Array.from({ length: PATTERN_LENGTH }, (_, row) => {
  if (row === 0) return note(48, INSTRUMENTS.PAD);
  if (row > 0 && row < 16) return rest();
  if (row === 16) return note(46, INSTRUMENTS.PAD);
  if (row > 16 && row < 32) return rest();
  if (row === 32) return note(44, INSTRUMENTS.PAD);
  if (row > 32 && row < 48) return rest();
  if (row === 48) return note(43, INSTRUMENTS.PAD);
  return rest();
});

const tracks = [
  makeTrack(pattern1),
  makeTrack(pattern2),
  makeTrack(pattern3),
  makeTrack(pattern4),
];

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
  for (const track of tracks) {
    while (track.nextRowTime < Audio.currentTime + SCHEDULE_AHEAD_TIME) {
      scheduleRow(track);
      track.nextRowTime += ROW_DURATION;
      track.row = (track.row + 1) % track.pattern.length;
    }
  }
}

function scheduleRow(track) {
  const rowCells = track.pattern[track.row];
  const cells = Array.isArray(rowCells) ? rowCells : [rowCells];

  for (const cell of cells) {
    scheduleCell(track, cell);
  }
}

function scheduleCell(track, cell) {
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

  const instrument = Instruments[cell.instrument];

  // New note: cut off the previous source and start a new one
  if (instrument.monophonic && track.currentSource) {
    track.currentSource.stop(track.nextRowTime);
  }

  const source = Audio.createBufferSource();
  source.buffer = instrument.buffer;
  source.loop = instrument.loop;
  if (instrument.pitched) {
    const freq = noteToFrequency(cell.note);
    const sourceBaseFrequency =
      instrument.baseFrequency ?? SAMPLE_RATE / instrument.buffer.length;
    source.playbackRate.value = freq / sourceBaseFrequency;
  }
  source.onended = () => {
    if (track.currentSource === source) track.currentSource = null;
  };

  const gainNode = Audio.createGain();
  gainNode.gain.setValueAtTime(0, track.nextRowTime);
  gainNode.gain.linearRampToValueAtTime(
    instrument.volume,
    track.nextRowTime + instrument.attack,
  );
  gainNode.gain.setValueAtTime(
    instrument.volume,
    track.nextRowTime + instrument.attack,
  );
  gainNode.gain.linearRampToValueAtTime(
    0.0001,
    track.nextRowTime + ROW_DURATION * instrument.durationRows,
  );
  source.connect(gainNode);
  gainNode.connect(Audio.destination);
  source.start(track.nextRowTime);

  track.currentSourceStopTime = track.nextRowTime + ROW_DURATION * instrument.durationRows;
  source.stop(track.currentSourceStopTime);

  if (instrument.monophonic) {
    track.currentSource = source;
  }
}

export function initAudio() {
  if (Audio) return;

  Audio = new AudioContext();

  Instruments = {
    [INSTRUMENTS.KICK]: {
      buffer: makeKickBuffer(Audio),
      loop: false,
      pitched: false,
      volume: 0.85,
      attack: 0.001,
      durationRows: 3,
      monophonic: false,
    },
    [INSTRUMENTS.SNARE]: {
      buffer: makeSnareBuffer(Audio),
      loop: false,
      pitched: false,
      volume: 0.35,
      attack: 0.001,
      durationRows: 2,
      monophonic: false,
    },
    [INSTRUMENTS.HIHAT]: {
      buffer: makeHihatBuffer(Audio),
      loop: false,
      pitched: false,
      volume: 0.18,
      attack: 0.001,
      durationRows: 1,
      monophonic: false,
    },
    [INSTRUMENTS.BASS]: {
      buffer: makeBassWaveBuffer(Audio),
      loop: true,
      pitched: true,
      baseFrequency: 55,
      volume: 0.22,
      attack: 0.004,
      durationRows: 2,
      monophonic: true,
    },
    [INSTRUMENTS.PLUCK]: {
      buffer: makePluckBuffer(Audio),
      loop: false,
      pitched: true,
      baseFrequency: 440,
      volume: 0.18,
      attack: 0.001,
      durationRows: 2,
      monophonic: false,
    },
    [INSTRUMENTS.PAD]: {
      buffer: makePadWaveBuffer(Audio),
      loop: true,
      pitched: true,
      baseFrequency: 55,
      volume: 0.1,
      attack: 0.08,
      durationRows: 16,
      monophonic: true,
    },
  };
}
