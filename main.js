import {
  makeBassWaveBuffer,
  makeHihatBuffer,
  makeKickBuffer,
  makePadWaveBuffer,
  makePluckBuffer,
  makeSnareBuffer,
} from "./waveforms.js";
import { SONG } from "./song1.js";

const NOTE_OFF = -1;
const EMPTY_CELL = "---|--";

const SAMPLE_RATE = 44100;
const LOOKAHEAD = 25;
const SCHEDULE_AHEAD_TIME = 0.1;
const ROW_DURATION = 60 / (SONG.bpm * SONG.rowsPerBeat);

const BUFFER_FACTORIES = {
  kick: makeKickBuffer,
  snare: makeSnareBuffer,
  hihat: makeHihatBuffer,
  bass: makeBassWaveBuffer,
  pluck: makePluckBuffer,
  pad: makePadWaveBuffer,
};

const SEMITONES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

let Audio = null;
let Instruments = null;
let TimerId = null;

const tracks = buildTracks(SONG);

function buildTracks(song) {
  const channelCount = song.channels.length;

  return song.channels.map((name, channelIndex) => {
    const rows = Array.from({ length: song.patternLength }, (_, rowIndex) => {
      const cellText =
        song.pattern[rowIndex * channelCount + channelIndex] ?? EMPTY_CELL;
      return parseCell(cellText);
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

function parseCell(cellText) {
  const [noteText, instrumentText] = cellText.split("|");
  const instrument =
    instrumentText && instrumentText !== "--" ? instrumentText : null;

  if (noteText === "---") return { note: null, instrument: null };
  if (noteText === "===") return { note: NOTE_OFF, instrument: null };

  return { note: noteTextToMidi(noteText), instrument };
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
    `t${Audio.currentTime.toFixed(3)} ${track.name} row ${track.row}: ${cell.note}/${cell.instrument} (${track.nextRowTime.toFixed(3)})`,
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

  const instrument = Instruments[cell.instrument];
  if (!instrument) {
    throw new Error(`Unknown instrument: ${cell.instrument}`);
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
      instrument.baseFrequency ?? SAMPLE_RATE / instrument.buffer.length;
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

  for (const [id, instrument] of Object.entries(SONG.instruments)) {
    Instruments[id] = {
      ...instrument,
      buffer: BUFFER_FACTORIES[instrument.buffer](Audio),
    };
  }
}
