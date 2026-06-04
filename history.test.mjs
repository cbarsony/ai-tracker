import { test } from "node:test";
import assert from "node:assert/strict";
import { createHistory } from "./history.js";

function songWith(...cells) {
  return { pattern: [cells] };
}

test("apply changes the cell and is undoable", () => {
  const song = songWith("--------", "--------");
  const history = createHistory(song);

  history.apply({ type: "cell", row: 0, channel: 0, value: "C-400---" });
  assert.equal(song.pattern[0][0], "C-400---");
  assert.equal(history.canUndo(), true);
  assert.equal(history.canRedo(), false);

  history.undo();
  assert.equal(song.pattern[0][0], "--------");
  assert.equal(history.canUndo(), false);
  assert.equal(history.canRedo(), true);
});

test("redo re-applies an undone edit", () => {
  const song = songWith("--------");
  const history = createHistory(song);

  history.apply({ type: "cell", row: 0, channel: 0, value: "C-400---" });
  history.undo();
  history.redo();

  assert.equal(song.pattern[0][0], "C-400---");
  assert.equal(history.canRedo(), false);
});

test("undo/redo walk a multi-step stack in order", () => {
  const song = songWith("--------");
  const history = createHistory(song);

  history.apply({ type: "cell", row: 0, channel: 0, value: "C-400---" });
  history.apply({ type: "cell", row: 0, channel: 0, value: "C-401---" });
  history.apply({ type: "cell", row: 0, channel: 0, value: "C-402---" });

  history.undo();
  assert.equal(song.pattern[0][0], "C-401---");
  history.undo();
  assert.equal(song.pattern[0][0], "C-400---");
  history.redo();
  assert.equal(song.pattern[0][0], "C-401---");
});

test("a new edit clears the redo stack", () => {
  const song = songWith("--------");
  const history = createHistory(song);

  history.apply({ type: "cell", row: 0, channel: 0, value: "C-400---" });
  history.undo();
  assert.equal(history.canRedo(), true);

  history.apply({ type: "cell", row: 0, channel: 0, value: "E-301---" });
  assert.equal(history.canRedo(), false);
  assert.equal(song.pattern[0][0], "E-301---");
});

test("undo and redo on empty stacks return false", () => {
  const history = createHistory(songWith("--------"));
  assert.equal(history.undo(), false);
  assert.equal(history.redo(), false);
});
