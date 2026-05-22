import { createMachine } from "./statechart.js";
import { song } from "./song.js";

const BPM = 140;

const ROWS_PER_BEAT = 4;

/** milliseconds */
const INTERVAL_TIME = 25;

/** seconds */
const LOOKAHEAD_TIME = 0.1;

const playButton = document.getElementById("play");

// TODO: add jsdoc
let audioContext = null;

class Scheduler {
  constructor(getTime) {
    this.nextRowTime = null;
    this.timerId = null;
    this.getTime = getTime;
  }

  start() {
    this.nextRowTime = this.getTime();
    this.timerId = setInterval(() => {
      const rowDuration = 60 / (BPM * ROWS_PER_BEAT);
      // DESIGN CHOICE: Use 'if' instead of 'while' for scheduling rows.
      // This means if the JS thread is delayed and multiple rows fall into the lookahead window,
      // only one row will be scheduled and the rest will be skipped (rare with a large lookahead).
      // Rationale: Skipped notes are less musically disturbing than delayed notes (which sound sloppy).
      // This keeps all played notes tightly in time, at the cost of rare skips during heavy browser stalls.

      // Detect and warn if a note (row) is skipped due to a delayed tick.
      const now = this.getTime();
      let skipped = 0;
      while (this.nextRowTime < now) {
        // The nextRowTime is already in the past, so it was missed/skipped.
        skipped++;
        this.nextRowTime += rowDuration;
      }
      if (skipped > 0) {
        console.warn(`Scheduler: Skipped ${skipped} row(s) due to delayed tick at ${now.toFixed(3)}s.`);
      }

      if (this.nextRowTime < now + LOOKAHEAD_TIME) {
        this.scheduleRow(this.nextRowTime);
        this.nextRowTime += rowDuration;
      }
    }, INTERVAL_TIME);
  }

  stop() {
    clearInterval(this.timerId);
  }

  scheduleRow(time) {
    console.log("schedule row", time);
  }
}

class Player {
  async start(audioContext) {
    await audioContext.resume();
  }
}

const scheduler = new Scheduler(() => audioContext.currentTime);

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
        player
          .start(audioContext)
          .then(() => machine.send("STARTED"))
          .catch(() => machine.send("START_FAILED"));
      },
      startScheduler: () => {
        scheduler.start();
      },
      stopScheduler: () => {
        scheduler.stop();
      },
    },
  },
);

playButton.addEventListener("click", () => machine.send("TOGGLE_PLAY"));
