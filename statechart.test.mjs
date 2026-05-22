import { test } from "node:test";
import assert from "node:assert/strict";
import { createMachine } from "./statechart.js";

function tracker() {
  const log = [];
  return {
    log,
    action: (name) => () => log.push(name),
  };
}

test("initial state's entry action runs at creation", () => {
  const t = tracker();
  createMachine(
    {
      initial: "a",
      states: { a: { entry: "enterA" } },
    },
    { actions: { enterA: t.action("enterA") } },
  );
  assert.deepEqual(t.log, ["enterA"]);
});

test("transition fires exit, transition action, entry in order", () => {
  const t = tracker();
  const m = createMachine(
    {
      initial: "a",
      states: {
        a: { entry: "enterA", exit: "exitA", on: { GO: { target: "b", actions: "midAB" } } },
        b: { entry: "enterB" },
      },
    },
    {
      actions: {
        enterA: t.action("enterA"),
        exitA: t.action("exitA"),
        midAB: t.action("midAB"),
        enterB: t.action("enterB"),
      },
    },
  );
  m.send("GO");
  assert.deepEqual(t.log, ["enterA", "exitA", "midAB", "enterB"]);
  assert.equal(m.state, "b");
});

test("transition without target runs only its actions (no exit/entry)", () => {
  const t = tracker();
  const m = createMachine(
    {
      initial: "a",
      states: {
        a: {
          entry: "enterA",
          exit: "exitA",
          on: { PING: { actions: "onPing" } },
        },
      },
    },
    {
      actions: {
        enterA: t.action("enterA"),
        exitA: t.action("exitA"),
        onPing: t.action("onPing"),
      },
    },
  );
  m.send("PING");
  assert.deepEqual(t.log, ["enterA", "onPing"]);
  assert.equal(m.state, "a");
});

test("string-shorthand transition changes state with no actions", () => {
  const m = createMachine(
    {
      initial: "a",
      states: { a: { on: { GO: "b" } }, b: {} },
    },
  );
  m.send("GO");
  assert.equal(m.state, "b");
});

test("unhandled events are ignored", () => {
  const m = createMachine({ initial: "a", states: { a: {} } });
  m.send("NOPE");
  assert.equal(m.state, "a");
});

test("event payload is passed to actions", () => {
  let received = null;
  const m = createMachine(
    {
      initial: "a",
      states: { a: { on: { PING: { actions: "capture" } } } },
    },
    { actions: { capture: (evt) => (received = evt) } },
  );
  m.send({ type: "PING", value: 42 });
  assert.deepEqual(received, { type: "PING", value: 42 });
});

test("unknown action name throws", () => {
  assert.throws(() =>
    createMachine(
      { initial: "a", states: { a: { entry: "missing" } } },
      { actions: {} },
    ),
  );
});

test("subscribe is notified on transitions", () => {
  const states = [];
  const m = createMachine({
    initial: "a",
    states: { a: { on: { GO: "b" } }, b: {} },
  });
  m.subscribe((s) => states.push(s));
  m.send("GO");
  assert.deepEqual(states, ["b"]);
});
