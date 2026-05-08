export class TrackState {
  constructor(name, cells) {
    this.name = name;
    this.cells = cells;
    this.row = 0;
    this.nextRowTime = 0;
    this.currentSource = null;
    this.currentSourceStopTime = 0;
  }

  get currentCell() {
    return this.cells[this.row];
  }

  reset(startTime) {
    this.row = 0;
    this.nextRowTime = startTime;
    this.currentSource = null;
    this.currentSourceStopTime = 0;
  }

  advance(rowDuration) {
    this.nextRowTime += rowDuration;
    this.row = (this.row + 1) % this.cells.length;
  }

  rememberSource(source, stopTime) {
    this.currentSource = source;
    this.currentSourceStopTime = stopTime;
  }

  clearSource(source = this.currentSource) {
    if (this.currentSource === source) {
      this.currentSource = null;
      this.currentSourceStopTime = 0;
    }
  }
}