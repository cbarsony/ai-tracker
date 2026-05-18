const DEFAULT_LOOP_START = 0;
const MIN_LOOP_SECONDS = 0.001;

export const LOOP_TYPES = Object.freeze({
  NORMAL: "normal",
  PING_PONG: "ping-pong",
});

const VALID_LOOP_TYPES = new Set(Object.values(LOOP_TYPES));

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function normalizeLoopType(type) {
  return VALID_LOOP_TYPES.has(type) ? type : LOOP_TYPES.NORMAL;
}

export function getLoopSettings(instrument, duration = 0) {
  const loop = instrument.loop ?? {};
  const safeDuration = Math.max(0, duration);
  const start = clamp(loop.start ?? DEFAULT_LOOP_START, 0, safeDuration);
  const defaultEnd = safeDuration;
  const end = clamp(loop.end ?? defaultEnd, start, safeDuration);

  return {
    enabled: Boolean(loop.enabled),
    type: normalizeLoopType(loop.type),
    start,
    end,
  };
}

export function setLoopEnabled(instrument, enabled, duration = 0) {
  const previousLoop = instrument.loop ?? {};
  const loop = getLoopSettings(instrument, duration);
  instrument.loop = {
    ...loop,
    end: duration > 0 || previousLoop.end !== undefined ? loop.end : null,
    enabled: Boolean(enabled),
  };
  return instrument.loop;
}

export function setLoopType(instrument, type, duration = 0) {
  const loop = getLoopSettings(instrument, duration);
  instrument.loop = {
    ...loop,
    type: normalizeLoopType(type),
  };
  return instrument.loop;
}

export function setLoopPoint(instrument, point, value, duration = 0) {
  const safeDuration = Math.max(0, duration);
  const minSpan = Math.min(safeDuration, MIN_LOOP_SECONDS);
  const loop = getLoopSettings(instrument, safeDuration);

  if (point === "start") {
    loop.start = clamp(value, 0, Math.max(0, loop.end - minSpan));
  } else if (point === "end") {
    loop.end = clamp(value, Math.min(safeDuration, loop.start + minSpan), safeDuration);
  }

  instrument.loop = loop;
  return loop;
}