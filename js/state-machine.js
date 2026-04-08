export function createMachine(config) {
  let currentState = config.initial;

  return {
    getState() { return currentState; },
    send(event) {
      const stateConfig = config.states[currentState];
      const transition = stateConfig?.on?.[event];
      if (!transition) return;
      if (transition.action) transition.action();
      currentState = transition.target;
    }
  };
}
