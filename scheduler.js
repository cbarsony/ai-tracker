// Lookahead scheduler.
//
// Emits a "next row" callback aligned to the AudioContext clock, using the
// classic two-clock pattern:
//   - A coarse setInterval "tick" runs every LOOKAHEAD_MS.
//   - On each tick we schedule every row whose start time falls within the
//     next SCHEDULE_AHEAD_SECONDS window.
//   - For each scheduled row we also queue a setTimeout that fires
//     `onNextRow({ rowIndex, time })` exactly when that row begins, so UI /
//     state-machine consumers stay in sync with audio time.
//
// The scheduler knows nothing about samples or patterns: it just produces
// evenly spaced row events at `rowDurationSeconds` intervals.

const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_SECONDS = 0.1;

export class Scheduler {
  constructor({ audioContext, rowDurationSeconds, onNextRow }) {
    this.audioContext = audioContext;
    this.rowDurationSeconds = rowDurationSeconds;
    this.onNextRow = onNextRow;
    this.timerId = null;
    this.nextRowTime = 0;
    this.nextRowIndex = 0;
    this.pendingTimeouts = new Set();
  }

  isRunning() {
    return this.timerId !== null;
  }

  start(fromRow = 0) {
    if (this.isRunning()) return;
    this.nextRowIndex = fromRow;
    this.nextRowTime = this.audioContext.currentTime;
    this.tick();
    this.timerId = setInterval(() => this.tick(), LOOKAHEAD_MS);
  }

  stop() {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    for (const id of this.pendingTimeouts) clearTimeout(id);
    this.pendingTimeouts.clear();
  }

  tick() {
    const horizon = this.audioContext.currentTime + SCHEDULE_AHEAD_SECONDS;
    while (this.nextRowTime < horizon) {
      this.scheduleRowCallback(this.nextRowIndex, this.nextRowTime);
      this.nextRowTime += this.rowDurationSeconds;
      this.nextRowIndex += 1;
    }
  }

  scheduleRowCallback(rowIndex, time) {
    const delayMs = Math.max(0, (time - this.audioContext.currentTime) * 1000);
    const id = setTimeout(() => {
      this.pendingTimeouts.delete(id);
      this.onNextRow({ rowIndex, time });
    }, delayMs);
    this.pendingTimeouts.add(id);
  }
}
