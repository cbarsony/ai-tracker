export class SongDefinition {
  constructor({ bpm, rowsPerBeat, channels, pattern, instruments }) {
    this.bpm = bpm;
    this.rowsPerBeat = rowsPerBeat;
    this.channels = channels;
    this.pattern = pattern;
    this.instruments = instruments;
  }

  get rowDurationSeconds() {
    return 60 / (this.bpm * this.rowsPerBeat);
  }

  getInstrument(channelName) {
    return this.instruments[channelName];
  }
}