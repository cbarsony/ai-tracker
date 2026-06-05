// Editing is split into two flat sibling modes (no hierarchical states):
//   PREVIEW - piano keys only audition the selected instrument.
//   WRITE   - piano keys also write the note into the cell under the cursor.
// Both reach PLAYING; playback always returns to PREVIEW.
export const STATES = {
  PREVIEW: "PREVIEW",
  WRITE: "WRITE",
  PLAYING: "PLAYING",
};

export const EVENTS = {
  TOGGLE_PLAY: "TOGGLE_PLAY",
  TOGGLE_WRITE: "TOGGLE_WRITE",
  SONG_END: "SONG_END",
  UNDO: "UNDO",
  REDO: "REDO",
};

export const ACTIONS = {
  START_PLAYBACK: "START_PLAYBACK",
  STOP_PLAYBACK: "STOP_PLAYBACK",
  UNDO: "UNDO",
  REDO: "REDO",
};

// Events shared by both editing modes. Undo/redo are self-transitions (run the
// action, stay put), so they're ignored while PLAYING.
const editEvents = {
  [EVENTS.TOGGLE_PLAY]: STATES.PLAYING,
  [EVENTS.UNDO]: { actions: ACTIONS.UNDO },
  [EVENTS.REDO]: { actions: ACTIONS.REDO },
};

export const appMachineConfig = {
  initial: STATES.PREVIEW,
  states: {
    [STATES.PREVIEW]: {
      entry: ACTIONS.STOP_PLAYBACK,
      on: {
        ...editEvents,
        [EVENTS.TOGGLE_WRITE]: STATES.WRITE,
      },
    },
    [STATES.WRITE]: {
      on: {
        ...editEvents,
        [EVENTS.TOGGLE_WRITE]: STATES.PREVIEW,
      },
    },
    [STATES.PLAYING]: {
      entry: ACTIONS.START_PLAYBACK,
      on: {
        [EVENTS.TOGGLE_PLAY]: STATES.PREVIEW,
        [EVENTS.SONG_END]: STATES.PREVIEW,
      },
    },
  },
};
