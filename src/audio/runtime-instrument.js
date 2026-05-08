export class RuntimeInstrument {
  constructor(sourceInstrument, buffer) {
    Object.assign(this, sourceInstrument);
    this.buffer = buffer;
  }
}