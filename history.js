// Undo/redo history for song edits.
//
// Every edit is a self-describing "delta" object with a `type` discriminator.
// The only edit type today is "cell" (the 8-char cell string is the unit of
// change); new types (bpm, instrument, channel volume, ...) are added by
// extending the two switches below — one case each in `mutate` and `invert`.
//
//   { type: "cell", row, channel, value: "C-400---" }
//
// The history owns an undo and a redo stack. Applying a new edit clears redo.
// Both stacks store deltas; undoing/redoing pushes the *inverse* (built from
// the song's current state) onto the opposite stack, so the operation is
// symmetric and unlimited in depth.

// Apply a delta to the song in place.
function mutate(song, delta) {
  switch (delta.type) {
    case "cell":
      song.pattern[delta.row][delta.channel] = delta.value;
      break;
    default:
      throw new Error(`Unknown delta type: ${delta.type}`);
  }
}

// Build the delta that reverses `delta`, reading the song's current state.
function invert(song, delta) {
  switch (delta.type) {
    case "cell":
      return {
        type: "cell",
        row: delta.row,
        channel: delta.channel,
        value: song.pattern[delta.row][delta.channel],
      };
    default:
      throw new Error(`Unknown delta type: ${delta.type}`);
  }
}

export function createHistory(song) {
  const undoStack = [];
  const redoStack = [];

  return {
    // Record and apply a new edit. Clears the redo stack.
    apply(delta) {
      undoStack.push(invert(song, delta));
      redoStack.length = 0;
      mutate(song, delta);
    },

    // Reverse the most recent edit. Returns false when there's nothing to undo.
    undo() {
      if (undoStack.length === 0) return false;
      const delta = undoStack.pop();
      redoStack.push(invert(song, delta));
      mutate(song, delta);
      return true;
    },

    // Re-apply the most recently undone edit. Returns false when redo is empty.
    redo() {
      if (redoStack.length === 0) return false;
      const delta = redoStack.pop();
      undoStack.push(invert(song, delta));
      mutate(song, delta);
      return true;
    },

    canUndo: () => undoStack.length > 0,
    canRedo: () => redoStack.length > 0,
  };
}
