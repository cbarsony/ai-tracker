export const STATES = {
  EDITING: "EDITING",
  PLAYING: "PLAYING",
};

export const EVENTS = {
  TOGGLE_PLAY: "TOGGLE_PLAY",
  SONG_END: "SONG_END",
};

export const ACTIONS = {
  START_PLAYBACK: "startPlayback",
  STOP_PLAYBACK: "stopPlayback",
};

export const appMachineConfig = {
  initial: STATES.EDITING,
  states: {
    [STATES.EDITING]: {
      entry: ACTIONS.STOP_PLAYBACK,
      on: {
        [EVENTS.TOGGLE_PLAY]: STATES.PLAYING,
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
