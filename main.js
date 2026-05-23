import { createMachine } from "./statechart.js";
import { song } from "./song.js";

const BPM = 140;
const ROWS_PER_BEAT = 4;

// ---- Note parsing ----

const NOTE_SEMITONES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const BASE_SEMITONES = 4 * 12; // samples are tuned to C4

function parseCell(cell) {
  if (cell === "--------") return null;
  return {
    noteName: cell[0],
    accidental: cell[1],
    octave: parseInt(cell[2]),
    instrumentIndex: parseInt(cell.slice(3, 5)),
    effectType: cell[5],
    effectParam: cell.slice(6, 8),
  };
}

// ---- Schedule building ----

function buildSchedule(song, startBpm, startRow = 0) {
  let bpm = startBpm;
  let time = 0;
  let startTime = 0;
  const events = [];

  for (let rowIndex = 0; rowIndex < song.pattern.length; rowIndex++) {
    if (rowIndex === startRow) startTime = time;
    const stepDuration = 60 / (bpm * ROWS_PER_BEAT);

    for (const cell of song.pattern[rowIndex]) {
      const parsed = parseCell(cell);
      if (!parsed) continue;

      if (parsed.effectType === "T") {
        bpm = parseInt(parsed.effectParam, 16);
      }

      if (parsed.noteName !== "-" && rowIndex >= startRow) {
        const semitones =
          NOTE_SEMITONES[parsed.noteName] +
          parsed.octave * 12 +
          (parsed.accidental === "#" ? 1 : 0);
        const playbackRate = 2 ** ((semitones - BASE_SEMITONES) / 12);
        events.push({ time: time - startTime, instrumentIndex: parsed.instrumentIndex, playbackRate });
      }
    }

    time += stepDuration;
  }

  return events;
}

// ---- Player ----

class Player {
  constructor() {
    this.audioBuffers = null;
    this.scheduledNodes = [];
  }

  async loadSamples(audioContext) {
    if (this.audioBuffers) return;
    this.audioBuffers = await Promise.all(
      song.instruments.map(async ({ sample }) => {
        const res = await fetch(sample);
        const buf = await res.arrayBuffer();
        return audioContext.decodeAudioData(buf);
      })
    );
  }

  scheduleAll(audioContext, startRow = 0) {
    const events = buildSchedule(song, BPM, startRow);
    const origin = audioContext.currentTime + 0.05;

    for (const { time, instrumentIndex, playbackRate } of events) {
      const { volume } = song.instruments[instrumentIndex];

      const gain = audioContext.createGain();
      gain.gain.value = volume;
      gain.connect(audioContext.destination);

      const source = audioContext.createBufferSource();
      source.buffer = this.audioBuffers[instrumentIndex];
      source.playbackRate.value = playbackRate;
      source.connect(gain);
      source.start(origin + time);
      this.scheduledNodes.push(source);
    }
  }

  stop() {
    for (const node of this.scheduledNodes) {
      try { node.stop(); } catch { /* already stopped */ }
    }
    this.scheduledNodes = [];
  }
}

const playButton = document.getElementById("play");
let audioContext = null;
const player = new Player();

const machine = createMachine(
  {
    /** @xstate-layout N4IgpgJg5mDOIC5QAoC2BDAxgCwJYDswBKAOklwBcCoBiAFQHkBxJgGQFEB9ABVYEEAmgG0ADAF1EoAA4B7WJVwz8kkAA9EAVgBMADhIBGHQHZtAZi0AWcwE5rFgDQgAnon3mSIz550bfR29YaAL5BjmhYeISksBToAE5U+LQAynR8AEp07AAiohJIILLyVEoq6ggaAGxaJLr6ulpa1jqVFhb6ji4IOvokGl4iWiJW+ho6FlohYRg4BMQkMfGJKWmZnABifACSHLniKkUKpQXl1iK9OnUWvpajIhqdroZ9OqamFiLWlZe+GqZTIHCsyiJCkABt0E5qPRmGwuLxBHkDnIjsoTogtBojCRjP1dO1Kp82g5nBjfCQTJ59CIjK1hjoRDoAUDIvNwZDoQA5dgADTonHSDAA6kiCocSmjQOUjHp+jLTCJzFojKNMY8ENZsZiqRpqVpTPpqvpmTNWaQwHE4jI4jCWBwePxhPsxSiJWVEGcaqZKZYjBZNYYHqSEFpKr03m8rEYFTpY0yAfgZBA4CoWXMiMjiopJWpEABaDrBvMaEgBMvl5qVE0RdNkCAKJKZ1HuhAEgy43RGGX3MOVdWYyq1frnXX6ZoWSpGavA+aLBLUJtu9EIb6D4eDUyE7RhrTqwIvSP6CdjqzDadm0EQqGNl1Z45SxAWIzqsfWPoDVq2SpjJ-n2sWq04kXbMW2pQkSG+ExMX0GDvkVftGhIAlJ0qSpvUVQx-hCIIgA */
    initial: "editing",
    states: {
      editing: {
        on: {
          TOGGLE_PLAY: "starting",
        },
      },
      starting: {
        entry: "onStartPlayback",
        on: {
          STARTED: "playing",
          START_FAILED: "error",
        },
      },
      playing: {
        entry: "startScheduler",
        exit: "stopScheduler",
        on: {
          TOGGLE_PLAY: "editing",
          NEXT_ROW: { actions: "logNextRow" },
        },
      },
      error: {
        entry: "showError",
        on: {
          TOGGLE_PLAY: "editing",
        },
      },
    },
  },
  {
    actions: {
      onStartPlayback: () => {
        if (!audioContext) audioContext = new AudioContext();
        audioContext.resume()
          .then(() => player.loadSamples(audioContext))
          .then(() => machine.send("STARTED"))
          .catch(() => machine.send("START_FAILED"));
      },
      startScheduler: () => player.scheduleAll(audioContext),
      stopScheduler: () => player.stop(),
    },
  },
);

playButton.addEventListener("click", () => machine.send("TOGGLE_PLAY"));
