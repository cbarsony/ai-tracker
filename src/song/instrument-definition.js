export class InstrumentDefinition {
  constructor({
    description,
    generator,
    samples,
    loop,
    pitched,
    baseFrequency,
    volume,
    attack,
    durationRows,
  }) {
    this.description = description;
    this.generator = generator;
    this.samples = samples;
    this.loop = loop;
    this.pitched = pitched;
    this.baseFrequency = baseFrequency;
    this.volume = volume;
    this.attack = attack;
    this.durationRows = durationRows;
  }
}

export class PitchedInstrumentDefinition extends InstrumentDefinition {
  constructor(options) {
    super({ ...options, pitched: true });
  }
}

export class DrumInstrumentDefinition extends InstrumentDefinition {
  constructor(options) {
    super({ ...options, pitched: false });
  }
}