// App-level statechart config.
//
// For now the machine has only two states and one job: log every NEXT_ROW
// event that the Scheduler emits while we are in `playing`. As the app grows
// this is where higher-level orchestration (start/stop, error handling,
// editing vs playing) will live.

export const appMachineConfig = {
  initial: "idle",
  states: {
    idle: {
      on: {
        TOGGLE_PLAY: "playing",
      },
    },
    playing: {
      entry: "startScheduler",
      exit: "stopScheduler",
      on: {
        TOGGLE_PLAY: "idle",
        NEXT_ROW: { actions: "logNextRow" },
      },
    },
  },
};
