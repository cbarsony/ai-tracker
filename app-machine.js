export const appMachineConfig = {
  initial: "editing",
  states: {
    editing: {
      entry: "stopPlayback",
      on: {
        TOGGLE_PLAY: "playing",
      },
    },
    playing: {
      entry: "startPlayback",
      on: {
        TOGGLE_PLAY: "editing",
      },
    },
  },
};
