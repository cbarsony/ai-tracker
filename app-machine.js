// Editing is split into two flat states instead of a hierarchical
// "editing" parent: PREVIEW only auditions notes, WRITE also inserts them.
// TOGGLE_MODE flips between them; playback returns to PREVIEW.
export const STATES = {
  PREVIEW: "PREVIEW",
  WRITE: "WRITE",
  PLAYING: "PLAYING",
};

export const EVENTS = {
  TOGGLE_PLAY: "TOGGLE_PLAY",
  TOGGLE_MODE: "TOGGLE_MODE",
  SONG_END: "SONG_END",
};

export const ACTIONS = {
  START_PLAYBACK: "START_PLAYBACK",
  STOP_PLAYBACK: "STOP_PLAYBACK",
};

export const appMachineConfig = {
  initial: STATES.PREVIEW,
  states: {
    [STATES.PREVIEW]: {
      entry: ACTIONS.STOP_PLAYBACK,
      on: {
        [EVENTS.TOGGLE_PLAY]: STATES.PLAYING,
        [EVENTS.TOGGLE_MODE]: STATES.WRITE,
      },
    },
    [STATES.WRITE]: {
      entry: ACTIONS.STOP_PLAYBACK,
      on: {
        [EVENTS.TOGGLE_PLAY]: STATES.PLAYING,
        [EVENTS.TOGGLE_MODE]: STATES.PREVIEW,
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
