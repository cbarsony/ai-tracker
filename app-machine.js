export const STATES = {
  EDITING: "EDITING",
  PLAYING: "PLAYING",
};

export const EVENTS = {
  TOGGLE_PLAY: "TOGGLE_PLAY",
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

export const appMachineConfig = {
  initial: STATES.EDITING,
  states: {
    [STATES.EDITING]: {
      entry: ACTIONS.STOP_PLAYBACK,
      on: {
        [EVENTS.TOGGLE_PLAY]: STATES.PLAYING,
        // Self-transitions: run the action, stay in EDITING. Undo/redo are
        // only handled here, so they're ignored while PLAYING.
        [EVENTS.UNDO]: { actions: ACTIONS.UNDO },
        [EVENTS.REDO]: { actions: ACTIONS.REDO },
      },
    },
    [STATES.PLAYING]: {
      entry: ACTIONS.START_PLAYBACK,
      on: {
        [EVENTS.TOGGLE_PLAY]: STATES.EDITING,
        [EVENTS.SONG_END]: STATES.EDITING,
      },
    },
  },
};
