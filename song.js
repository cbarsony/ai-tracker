class Note {
  constructor(pitch, instrumentId, effect) {
    this.pitch = pitch;
    this.instrumentId = instrumentId;
    this.effect = effect;
  }
}

export class EndNote {}

export const EFFECT_KEY = {
  TEMPO: "T",
  VOLUME: "V",
};

class Effect {
  /**
   *
   * @param {EFFECT_KEY} key
   * @param {string} value
   */
  constructor(key, value) {
    this.key = key;
    this.value = value;
  }
}

const pattern = [
  [new Note("C-4", 0, null), new Note("C-4", 7, null), new Note("G-4", 4, null), new Note("C-5", 5)],
  [null, null, null, null],
  [new Note("C-4", 2, null), new Note("C-3", 3), null, null],
  [null, null, null, null],
  [new Note("C-4", 1, null), null, new Note("G-4", 4, null), null],
  [null, null, null, null],
  [new Note("C-4", 2, null), new Note("C-3", 3), new Note("F-4", 4, null), null],
  [null, null, null, null],
  [new Note("C-4", 0, null), null, new Note("G-4", 4, null), null],
  [null, null, null, null],
  [new Note("C-4", 2, null), new Note("C-3", 3), null, null],
  [null, null, null, null],
  [new Note("C-4", 1, null), null, null, new Note("D#5", 5)],
  [null, null, null, null],
  [new Note("C-4", 2, null), new Note("C-3", 3), new Note("C-4", 4, null), new Note("D-5", 5)],
  [null, null, null, null],
  [new Note("C-4", 0, null), null, new Note("G-4", 4, null), new Note("C-5", 5)],
  [null, null, null, null],
  [new Note("C-4", 2, null), new Note("C-3", 3), null, null],
  [null, null, null, null],
  [new Note("C-4", 1, null), null, new Note("G-4", 4, null), null],
  [null, null, null, null],
  [new Note("C-4", 2, null), new Note("C-3", 3), new Note("F-4", 4, null), null],
  [null, null, null, null],
  [new Note("C-4", 0, null), null, new Note("G-4", 4, null), null],
  [null, null, null, null],
  [new Note("C-4", 2, null), new Note("C-3", 3), null, null],
  [null, null, null, null],
  [new Note("C-4", 1, null), null, null, new Note("C-5", 5)],
  [null, null, null, null],
  [new Note("C-4", 2, null), new Note("C-3", 3), new Note("C-5", 4, null), new Note("D-5", 5)],
  [null, null, null, null],
];

const instruments = [
  { name: "kick", sample: "samples/kick.wav" },
  { name: "snare", sample: "samples/snare.wav" },
  { name: "hihat-closed", sample: "samples/hihat.wav" },
  { name: "bass", sample: "samples/bass.wav" },
  { name: "pluck", sample: "samples/pluck.wav" },
  { name: "lead", sample: "samples/lead.wav" },
  { name: "pad", sample: "samples/pad.wav" },
  { name: "crash", sample: "samples/crash.wav" },
];

export const song = {
  name: "Untitled",
  pattern,
  instruments,
  channels: 4,
  bpm: 140,
};

export function addNote(rowId, channelId, pitch, instrumentId) {
  song.pattern[rowId][channelId] = new Note(pitch, instrumentId, null);
}

export function deleteNote(rowId, channelId) {
  song.pattern[rowId][channelId] = null;
}

export function noteOff(rowId, channelId) {
  song.pattern[rowId][channelId] = new EndNote();
}

export function serializeSong() {
  const instrumentsStr = song.instruments
    .map((inst) => `${inst.name}=${inst.sample}`)
    .join(",");

  const lines = [
    `name:${song.name}`,
    `bpm:${song.bpm}`,
    `channels:${song.channels}`,
    `instruments:${instrumentsStr}`,
  ];

  for (const row of song.pattern) {
    const cells = row.map((cell) => {
      if (!cell) return "-";
      if (cell instanceof EndNote) return "=";
      const instStr = String(cell.instrumentId).padStart(2, "0");
      const effectKey = cell.effect ? cell.effect.key : "-";
      const effectVal = cell.effect
        ? String(cell.effect.value).padStart(2, "0")
        : "--";
      return `${cell.pitch}${instStr}${effectKey}${effectVal}`;
    });
    lines.push(cells.join("|"));
  }

  return lines.join("\n");
}

export function deserializeSong(text) {
  const lines = text.split("\n");
  let i = 0;

  const name = lines[i++].slice("name:".length);
  const bpm = Number(lines[i++].slice("bpm:".length));
  const channels = Number(lines[i++].slice("channels:".length));
  const instrumentsStr = lines[i++].slice("instruments:".length);

  const instruments = instrumentsStr.split(",").map((part) => {
    const eq = part.indexOf("=");
    return { name: part.slice(0, eq), sample: part.slice(eq + 1) };
  });

  const pattern = [];
  while (i < lines.length) {
    const line = lines[i++];
    if (!line.trim()) continue;
    const cells = line.split("|").map((cell) => {
      if (cell === "-") return null;
      if (cell === "=") return new EndNote();
      const pitch = cell.slice(0, 3);
      const instrumentId = Number(cell.slice(3, 5));
      const effectKey = cell[5];
      const effectVal = cell.slice(6, 8);
      const effect = effectKey === "-" ? null : new Effect(effectKey, effectVal);
      return new Note(pitch, instrumentId, effect);
    });
    pattern.push(cells);
  }

  return { name, bpm, channels, instruments, pattern };
}
