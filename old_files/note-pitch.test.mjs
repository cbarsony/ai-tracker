import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { notePitch } from "./player.js";

describe("notePitch", () => {
  it("returns 1 for the root note", () => {
    assert.equal(notePitch(60), 1);
  });

  it("doubles the rate one octave above the root note", () => {
    assert.equal(notePitch(72), 2);
  });

  it("halves the rate one octave below the root note", () => {
    assert.equal(notePitch(48), 0.5);
  });

  it("uses a custom instrument root note", () => {
    assert.equal(notePitch(69, 57), 2);
  });
});
