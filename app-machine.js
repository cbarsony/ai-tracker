// App-level statechart: orchestrates the high-level edit/play lifecycle.
//
// States:
//   editing  - user can edit the pattern; key events are forwarded to the editor.
//   starting - audio is initialising and playback is being kicked off.
//   playing  - the player is producing sound; editing is blocked.
//   error    - last start attempt failed; show message, allow retry.
//
// This config is pure description; action implementations live in main.js.

export const appMachineConfig = {
  initial: "editing",
  states: {
    editing: {
      entry: "resetToEditing",
      on: {
        TOGGLE_PLAY: "starting",
        KEY_PRESSED: { actions: "forwardKey" },
      },
    },
    starting: {
      entry: "onStartPlayback",
      on: {
        STARTED: "playing",
        START_FAILED: "error",
      },
    },
    playing: {
      entry: "activatePlayback",
      exit: "stopPlayback",
      on: {
        TOGGLE_PLAY: "editing",
        ROW_CHANGED: { actions: "scrollGrid" },
        ENDED: "editing",
      },
    },
    error: {
      entry: "showError",
      on: {
        TOGGLE_PLAY: "editing",
      },
    },
  },
};
