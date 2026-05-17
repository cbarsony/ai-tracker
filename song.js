// Each cell is either null (empty) or { note, instrument }.
// `note` is a MIDI number, or NOTE_OFF (-1) to stop the previous sample.
// `instrument` is the index into the `instruments` array below.
const K0 = { note: 60, instrument: 0 };
const K1 = { note: 60, instrument: 1 };
const K2 = { note: 60, instrument: 2 };
const E3 = { note: 52, instrument: 3 };
const G3 = { note: 55, instrument: 3 };
const D3 = { note: 50, instrument: 3 };

const pattern = [
  //  ch 0  ch 1  ch 2  ch 3
  [K0, null, null, null],
  [null, null, null, null],
  [K2, E3, null, null],
  [null, null, null, null],
  [K1, null, null, null],
  [null, null, null, null],
  [K2, E3, null, null],
  [null, null, null, null],
  [K0, null, null, null],
  [null, null, null, null],
  [K2, G3, null, null],
  [null, null, null, null],
  [K1, null, null, null],
  [null, D3, null, null],
  [K0, null, null, null],
  [null, null, null, null],
];

const instruments = [
  {
    name: "kick",
    sample: "samples/kick-new.wav",
    volume: 0.6,
  },
  {
    name: "snare",
    sample: "samples/snare-new.wav",
    volume: 0.8,
  },
  {
    name: "hihat-closed",
    sample: "samples/hihat-closed.wav",
    volume: 0.2,
  },
  {
    name: "bass",
    sample: "samples/bass-new.wav",
    volume: 0.4,
  },
];

export const song = {
  pattern,
  instruments,
};
