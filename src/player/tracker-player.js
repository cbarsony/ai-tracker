import { AudioEngine } from "../audio/audio-engine.js";
import { PatternParser } from "../tracker/pattern-parser.js";

const LOOKAHEAD = 25;
const SCHEDULE_AHEAD_TIME = 0.1;

export class TrackerPlayer {
  constructor(song) {
    this.song = song;
    this.rowDuration =
      song.rowDurationSeconds ?? 60 / (song.bpm * song.rowsPerBeat);
    this.tracks = new PatternParser(song).buildTracks();
    this.audioEngine = new AudioEngine(song);
    this.timerId = null;
  }

  get isPlaying() {
    return this.timerId !== null;
  }

  initAudio() {
    this.audioEngine.init();
  }

  async start() {
    this.initAudio();
    await this.audioEngine.resume();

    const startTime = this.audioEngine.currentTime;
    for (const track of this.tracks) {
      track.reset(startTime);
    }

    this.schedulerTick();
    this.timerId = setInterval(() => this.schedulerTick(), LOOKAHEAD);
  }

  stop() {
    clearInterval(this.timerId);
    this.timerId = null;

    for (const track of this.tracks) {
      this.audioEngine.stopTrackNow(track);
    }
  }

  async toggle() {
    if (this.isPlaying) {
      this.stop();
      return;
    }

    await this.start();
  }

  schedulerTick() {
    for (const track of this.tracks) {
      while (
        track.nextRowTime <
        this.audioEngine.currentTime + SCHEDULE_AHEAD_TIME
      ) {
        this.scheduleRow(track);
        track.advance(this.rowDuration);
      }
    }
  }

  scheduleRow(track) {
    const cell = track.currentCell;

    console.log(
      `t${this.audioEngine.currentTime.toFixed(3)} ${track.name} row ${track.row}: ${cell.note}|${cell.effect.text} (${track.nextRowTime.toFixed(3)})`,
    );

    this.audioEngine.scheduleCell(track, cell, this.rowDuration);
  }
}