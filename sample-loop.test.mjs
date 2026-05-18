import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  LOOP_TYPES,
  getLoopSettings,
  setLoopEnabled,
  setLoopPoint,
  setLoopType,
} from "./sample-loop.js";

describe("sample loop settings", () => {
  it("defaults to the full sample duration", () => {
    assert.deepEqual(getLoopSettings({}, 2.5), {
      enabled: false,
      type: LOOP_TYPES.NORMAL,
      start: 0,
      end: 2.5,
    });
  });

  it("clamps saved loop points to the sample duration", () => {
    const instrument = {
      loop: {
        enabled: true,
        start: -1,
        end: 4,
      },
    };

    assert.deepEqual(getLoopSettings(instrument, 2), {
      enabled: true,
      type: LOOP_TYPES.NORMAL,
      start: 0,
      end: 2,
    });
  });

  it("preserves loop points when toggling looping", () => {
    const instrument = {
      loop: {
        enabled: false,
        start: 0.25,
        end: 0.75,
      },
    };

    assert.deepEqual(setLoopEnabled(instrument, true, 1), {
      enabled: true,
      type: LOOP_TYPES.NORMAL,
      start: 0.25,
      end: 0.75,
    });
  });

  it("stores ping-pong loop type", () => {
    const instrument = {};

    assert.deepEqual(setLoopType(instrument, LOOP_TYPES.PING_PONG, 1), {
      enabled: false,
      type: LOOP_TYPES.PING_PONG,
      start: 0,
      end: 1,
    });
  });

  it("defaults unknown loop types to normal", () => {
    const instrument = {
      loop: {
        enabled: true,
        type: "sideways",
        start: 0.2,
        end: 0.8,
      },
    };

    assert.deepEqual(getLoopSettings(instrument, 1), {
      enabled: true,
      type: LOOP_TYPES.NORMAL,
      start: 0.2,
      end: 0.8,
    });
  });

  it("keeps an unknown end point open until duration is known", () => {
    const instrument = {};

    assert.deepEqual(setLoopEnabled(instrument, true, 0), {
      enabled: true,
      type: LOOP_TYPES.NORMAL,
      start: 0,
      end: null,
    });
    assert.deepEqual(getLoopSettings(instrument, 1.25), {
      enabled: true,
      type: LOOP_TYPES.NORMAL,
      start: 0,
      end: 1.25,
    });
  });

  it("keeps the start point before the end point", () => {
    const instrument = {
      loop: {
        enabled: true,
        start: 0.2,
        end: 0.8,
      },
    };

    assert.deepEqual(setLoopPoint(instrument, "start", 0.9, 1), {
      enabled: true,
      type: LOOP_TYPES.NORMAL,
      start: 0.799,
      end: 0.8,
    });
  });
});