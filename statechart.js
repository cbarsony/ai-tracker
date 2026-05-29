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

/**
 * Creates a minimal XState-inspired state machine.
 * 
 * @param {Object} config - The machine configuration
 * @param {string} config.initial - The initial state name
 * @param {Object} config.states - Map of state definitions by name
 * @param {string|string[]} [config.states[].entry] - Action(s) to run on entering the state
 * @param {string|string[]} [config.states[].exit] - Action(s) to run on exiting the state
 * @param {Object} [config.states[].on] - Event handlers, mapping event type to transition
 * @param {Object} options - Machine options
 * @param {Object} [options.actions={}] - Map of action implementations (name → function)
 * @returns {Object} The machine instance
 * @returns {string} returns.state - Current state (read-only)
 * @returns {Function} returns.send - Send an event: `send(eventType)` or `send({type, ...})`
 * @returns {Function} returns.subscribe - Subscribe to state changes: returns unsubscribe function
 */
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

      console.log(`${evt.type} → ${current}`);
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
