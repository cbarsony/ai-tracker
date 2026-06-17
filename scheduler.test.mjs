import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSchedule } from "./scheduler.js";
import { EndNote } from "./song.js";

const ROW_AT_140 = 60 / (140 * 4); // 0.10714...
const ROW_AT_70 = 60 / (70 * 4); //  0.21428...

test("collects notes at the right times from row 0", () => {
  const song = {
    pattern: [
      [{ pitch: "C-4", instrumentId: 0, effect: null }, null],
      [null, null],
      [{ pitch: "E-3", instrumentId: 1, effect: null }, null],
    ],
  };

  const events = buildSchedule(song, 140, 0).filter(e => e.midi !== undefined);

  assert.deepEqual(events, [
    { time: 0, midi: 60, instrument: 0 },
    { time: 2 * ROW_AT_140, midi: 52, instrument: 1 },
  ]);
});

test("startRow normalizes the first collected row to t = 0", () => {
  const song = {
    pattern: [
      [{ pitch: "C-4", instrumentId: 0, effect: null }],
      [{ pitch: "C-4", instrumentId: 1, effect: null }],
      [{ pitch: "C-4", instrumentId: 2, effect: null }],
    ],
  };

  const events = buildSchedule(song, 140, 1).filter(e => e.midi !== undefined);

  assert.deepEqual(events, [
    { time: 0, midi: 60, instrument: 1 },
    { time: ROW_AT_140, midi: 60, instrument: 2 },
  ]);
});

test("a tempo change before startRow still counts", () => {
  const song = {
    pattern: [
      [{ pitch: "C-4", instrumentId: 0, effect: { key: "T", value: "46" } }], // 0x46 = 70 BPM
      [{ pitch: "C-4", instrumentId: 1, effect: null }],
      [{ pitch: "C-4", instrumentId: 2, effect: null }],
    ],
  };

  const events = buildSchedule(song, 140, 1).filter(e => e.midi !== undefined);

  // Row 1 is t=0 at 70 BPM, so row 2 is one slow row later.
  assert.deepEqual(events, [
    { time: 0, midi: 60, instrument: 1 },
    { time: ROW_AT_70, midi: 60, instrument: 2 },
  ]);
});

test("a tempo change applies on its own row", () => {
  const song = {
    pattern: [
      [{ pitch: "C-4", instrumentId: 0, effect: null }],
      [{ pitch: "C-4", instrumentId: 1, effect: { key: "T", value: "46" } }], // slows down starting with this row's duration
      [{ pitch: "C-4", instrumentId: 2, effect: null }],
    ],
  };

  const events = buildSchedule(song, 140, 0).filter(e => e.midi !== undefined);

  assert.deepEqual(events, [
    { time: 0, midi: 60, instrument: 0 },
    { time: ROW_AT_140, midi: 60, instrument: 1 },
    { time: ROW_AT_140 + ROW_AT_70, midi: 60, instrument: 2 },
  ]);
});

test("a note-off stamps stopTime onto the open note on its channel", () => {
  const song = {
    pattern: [
      [{ pitch: "C-4", instrumentId: 0, effect: null }, null],
      [null, null],
      [new EndNote(), null],
    ],
  };

  const events = buildSchedule(song, 140, 0);
  const note = events.find((e) => e.midi !== undefined);

  assert.equal(note.stopTime, 2 * ROW_AT_140);
});

test("a note-off only cuts its own channel", () => {
  const song = {
    pattern: [
      [{ pitch: "C-4", instrumentId: 0, effect: null }, { pitch: "E-3", instrumentId: 1, effect: null }],
      [new EndNote(), null],
    ],
  };

  const events = buildSchedule(song, 140, 0);
  const ch0 = events.find((e) => e.instrument === 0);
  const ch1 = events.find((e) => e.instrument === 1);

  assert.equal(ch0.stopTime, ROW_AT_140);
  assert.equal(ch1.stopTime, undefined);
});
