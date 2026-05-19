// Minimal XState-inspired statechart.
//
// Config shape:
//   {
//     initial: "stateName",
//     states: {
//       stateName: {
//         entry?: actionName | actionName[],
//         exit?:  actionName | actionName[],
//         on?: {
//           EVENT_TYPE: "targetState"
//             | { target?: "targetState", actions?: actionName | actionName[] }
//         }
//       }
//     }
//   }
//
// Transitions without a `target` (or whose target equals the current state)
// run their `actions` but do NOT fire exit/entry actions.
//
// Actions are looked up by name in the `actions` map passed to createMachine
// and are called as `action(event)`.

export function createMachine(config, { actions = {} } = {}) {
  let current = config.initial;
  const listeners = new Set();

  function runActions(names, event) {
    for (const name of toArray(names)) {
      const fn = actions[name];
      if (!fn) throw new Error(`Unknown action: ${name}`);
      fn(event);
    }
  }

  function notify() {
    for (const listener of listeners) listener(current);
  }

  // Fire the initial state's entry actions.
  runActions(config.states[current]?.entry, { type: "@@init" });

  return {
    get state() {
      return current;
    },

    send(event) {
      const evt = typeof event === "string" ? { type: event } : event;
      const stateNode = config.states[current];
      const handler = stateNode?.on?.[evt.type];
      if (handler === undefined) return;

      const transition =
        typeof handler === "string"
          ? { target: handler, actions: [] }
          : { target: handler.target, actions: handler.actions ?? [] };

      const target = transition.target ?? current;
      const isStateChange = target !== current;

      if (isStateChange) runActions(stateNode.exit, evt);
      runActions(transition.actions, evt);
      if (isStateChange) {
        current = target;
        runActions(config.states[target]?.entry, evt);
      }

      notify();
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

function toArray(x) {
  if (x === undefined || x === null) return [];
  return Array.isArray(x) ? x : [x];
}
