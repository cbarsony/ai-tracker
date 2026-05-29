import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSchedule } from "./scheduler.js";

const ROW_AT_140 = 60 / (140 * 4); // 0.10714...
const ROW_AT_70 = 60 / (70 * 4); //  0.21428...

test("collects notes at the right times from row 0", () => {
  const song = {
    pattern: [
      ["C-400---", "--------"],
      ["--------", "--------"],
      ["E-301---", "--------"],
    ],
  };

  const events = buildSchedule(song, 140, 0);

  assert.deepEqual(events, [
    { time: 0, midi: 60, instrument: 0 },
    { time: 2 * ROW_AT_140, midi: 52, instrument: 1 },
  ]);
});

test("startRow normalizes the first collected row to t = 0", () => {
  const song = {
    pattern: [
      ["C-400---"],
      ["C-401---"],
      ["C-402---"],
    ],
  };

  const events = buildSchedule(song, 140, 1);

  assert.deepEqual(events, [
    { time: 0, midi: 60, instrument: 1 },
    { time: ROW_AT_140, midi: 60, instrument: 2 },
  ]);
});

test("a tempo change before startRow still counts", () => {
  const song = {
    pattern: [
      ["C-400T46"], // 0x46 = 70 BPM
      ["C-401---"],
      ["C-402---"],
    ],
  };

  const events = buildSchedule(song, 140, 1);

  // Row 1 is t=0 at 70 BPM, so row 2 is one slow row later.
  assert.deepEqual(events, [
    { time: 0, midi: 60, instrument: 1 },
    { time: ROW_AT_70, midi: 60, instrument: 2 },
  ]);
});

test("a tempo change applies on its own row", () => {
  const song = {
    pattern: [
      ["C-400---"],
      ["C-401T46"], // slows down starting with this row's duration
      ["C-402---"],
    ],
  };

  const events = buildSchedule(song, 140, 0);

  assert.deepEqual(events, [
    { time: 0, midi: 60, instrument: 0 },
    { time: ROW_AT_140, midi: 60, instrument: 1 },
    { time: ROW_AT_140 + ROW_AT_70, midi: 60, instrument: 2 },
  ]);
});
