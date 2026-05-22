import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PatternEditor } from "./editor.js";

function makeEditor({ onChange } = {}) {
  const song = {
    instruments: [{ name: "test" }],
    pattern: [
      ["--------"],
      ["--------"],
      ["--------"],
      ["--------"],
    ],
  };
  return new PatternEditor(song, {
    previewNote: () => {},
    onChange: onChange ?? (() => {}),
  });
}

// Minimal keyboard event. Uses event.key (character) as the primary identifier,
// as the editor should — event.code is the physical US-layout key position and
// breaks on non-US layouts (e.g. Hungarian, where the Minus/Equal physical keys
// produce Ö/Ü, not -/+).
function keyEvent(key, code = "Unidentified") {
  return {
    key,
    code,
    shiftKey: false,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    preventDefault: () => {},
  };
}

describe("baseOctave", () => {
  it("starts at 4", () => {
    const editor = makeEditor();
    assert.equal(editor.baseOctave, 4);
  });

  it("decreases when the '-' key is pressed", () => {
    const editor = makeEditor();
    editor.handleKey(keyEvent("-"));
    assert.equal(editor.baseOctave, 3);
  });

  it("increases when the '+' key is pressed (e.g. Hungarian keyboard)", () => {
    const editor = makeEditor();
    editor.handleKey(keyEvent("+"));
    assert.equal(editor.baseOctave, 5);
  });

  it("increases when the '=' key is pressed (US keyboard, no shift required)", () => {
    const editor = makeEditor();
    editor.handleKey(keyEvent("=", "Equal"));
    assert.equal(editor.baseOctave, 5);
  });

  it("clamps at minimum 0", () => {
    const editor = makeEditor();
    editor.baseOctave = 0;
    editor.handleKey(keyEvent("-"));
    assert.equal(editor.baseOctave, 0);
  });

  it("clamps at maximum 8", () => {
    const editor = makeEditor();
    editor.baseOctave = 8;
    editor.handleKey(keyEvent("+"));
    assert.equal(editor.baseOctave, 8);
  });

  it("calls onChange when octave changes", () => {
    let changed = false;
    const editor = makeEditor({ onChange: () => { changed = true; } });
    editor.handleKey(keyEvent("-"));
    assert.ok(changed);
  });

  it("does not change octave when a modifier key is held", () => {
    const editor = makeEditor();
    editor.handleKey({ ...keyEvent("-"), ctrlKey: true });
    assert.equal(editor.baseOctave, 4);
  });
});
