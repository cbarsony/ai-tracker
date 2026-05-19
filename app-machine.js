// App-level statechart: orchestrates the high-level edit/play lifecycle.
//
// States:
//   editing  - user can edit the pattern; key events are forwarded to the editor.
//   starting - audio is initialising and playback is being kicked off.
//   playing  - the player is producing sound; editing is blocked.
//   error    - last start attempt failed; show message, allow retry.
//
// Side effects (audio init, DOM updates, scheduler start/stop) live in the
// action implementations, keeping the machine config a pure description.

import { createMachine } from "./statechart.js";

export const appMachineConfig = {
  initial: "editing",
  states: {
    editing: {
      entry: "onEnterEditing",
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
      entry: "onEnterPlaying",
      exit: "onExitPlaying",
      on: {
        TOGGLE_PLAY: "editing",
      },
    },
    error: {
      entry: "onEnterError",
      on: {
        TOGGLE_PLAY: "editing",
      },
    },
  },
};

export function createAppMachine({ editor, player, gridView, playView, getFromRow }) {
  const actions = {
    onEnterEditing: () => {
      playView.renderStopped();
      playView.enable();
      gridView.setPlayingRow(null);
    },

    forwardKey: (event) => {
      editor.handleKey(event.domEvent);
    },

    onStartPlayback: (event) => {
      playView.disable();
      const fromRow = getFromRow();
      player
        .start(fromRow)
        .then(() => machine.send("STARTED"))
        .catch((error) => {
          console.error(error);
          machine.send({ type: "START_FAILED", error });
        });
    },

    onEnterPlaying: () => {
      playView.renderPlaying();
      playView.enable();
    },

    onExitPlaying: () => {
      player.stop();
    },

    onEnterError: (event) => {
      const message = event.error?.message ?? "Error";
      playView.renderStopped(message);
      playView.enable();
    },
  };

  const machine = createMachine(appMachineConfig, { actions });
  return machine;
}
