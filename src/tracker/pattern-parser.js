import { TrackerCell } from "./tracker-cell.js";
import { TrackState } from "./track-state.js";

export class PatternParser {
  constructor(song) {
    this.song = song;
    this.channelCount = song.channels.length;
  }

  buildTracks() {
    return this.song.channels.map((name, channelIndex) => {
      const cells = this.song.pattern.map((patternRow, rowIndex) => {
        this.validatePatternRow(patternRow, rowIndex);
        return TrackerCell.parse(
          patternRow[channelIndex],
          rowIndex,
          channelIndex,
        );
      });

      return new TrackState(name, cells);
    });
  }

  validatePatternRow(patternRow, rowIndex) {
    if (!Array.isArray(patternRow)) {
      throw new Error(`Pattern row ${rowIndex} must be an array`);
    }

    if (patternRow.length !== this.channelCount) {
      throw new Error(
        `Pattern row ${rowIndex} has ${patternRow.length} cells, expected ${this.channelCount}`,
      );
    }
  }
}