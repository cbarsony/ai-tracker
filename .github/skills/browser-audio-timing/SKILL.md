---
name: browser-audio-timing
description: "Use when: implementing, reviewing, debugging, or explaining browser audio timing, Web Audio scheduling, AudioContext.currentTime, lookahead schedulers, setTimeout/setInterval timing, tracker playback, sequencers, metronomes, drum machines, or audio/visual synchronization."
argument-hint: "Describe the timing code, bug, or browser audio scheduling task"
---

# Browser Audio Timing

Use this skill when working on audio timing in this project.

## Project Context: AI-Human Musical Collaboration

This application is **not** a full-featured music tracker. Its primary goal is **AI-human musical collaboration** — a human and an AI work together to create music, where the AI can read and write the song format.

This goal justifies deliberate restrictions that keep the codebase simpler and the mental model cleaner. Simpler code is easier for both humans and AI to read, reason about, and modify. Complexity is only added when a restriction would genuinely break the core use case.

## Chosen Approach: Upfront Scheduling

All audio events for the entire song are scheduled at once when playback starts. There is no polling loop, no `setInterval`, and no lookahead window.

### Why this works here

- **No editing during playback.** The user cannot change the song while it is playing. This removes the main reason a live scheduler is needed (responding to edits mid-playback).
- **Songs are short.** Memory cost for pre-scheduling all nodes is negligible (well under 5 MB for a typical song with short samples).
- **Perfect timing.** All events are handed to the Web Audio engine at once. The engine's internal clock handles everything — no JavaScript timer drift, no missed rows.

### Core pattern

```js
function scheduleAll(audioContext, startRow = 0) {
  const events = buildSchedule(song, BPM, startRow);
  const origin = audioContext.currentTime + 0.05; // small buffer for scheduling latency

  for (const { time, instrumentIndex, playbackRate } of events) {
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffers[instrumentIndex];
    source.playbackRate.value = playbackRate;
    source.connect(destination);
    source.start(origin + time);
    scheduledNodes.push(source);
  }
}

function stop() {
  for (const node of scheduledNodes) {
    try { node.stop(); } catch { /* already stopped */ }
  }
  scheduledNodes.clear();
}
```

### buildSchedule: single forward pass

`buildSchedule` iterates all rows once, maintaining a running `time` accumulator and current `bpm`. It returns an array of plain objects with precomputed `time` (in seconds from song start), `instrumentIndex`, and `playbackRate`.

- BPM-change effects (e.g. `Txx` where `xx` is hex BPM) are applied immediately on their own row.
- For `startRow > 0`: all rows are still iterated (so BPM changes before `startRow` are accounted for), but only events from `startRow` onward are collected. Times are normalized so row `startRow` starts at `t=0`.

```js
function buildSchedule(song, startBpm, startRow = 0) {
  let bpm = startBpm;
  let time = 0;
  let startTime = 0;
  const events = [];

  for (let rowIndex = 0; rowIndex < song.pattern.length; rowIndex++) {
    if (rowIndex === startRow) startTime = time;
    const stepDuration = 60 / (bpm * ROWS_PER_BEAT);

    for (const cell of song.pattern[rowIndex]) {
      const parsed = parseCell(cell);
      if (!parsed) continue;
      if (parsed.effectType === "T") bpm = parseInt(parsed.effectParam, 16);
      if (parsed.noteName !== "-" && rowIndex >= startRow) {
        events.push({ time: time - startTime, instrumentIndex: parsed.instrumentIndex, playbackRate: ... });
      }
    }
    time += stepDuration;
  }
  return events;
}
```

## When the "Two Clocks" Pattern Is Needed Instead

The classic lookahead scheduler (Chris Wilson's "A tale of two clocks") is the right choice when:

- The song or pattern can be **edited while playing**.
- **Live tempo changes** must take effect immediately, not just at the next play.
- The application needs **looping, cue points, or dynamic pattern switching** during playback.

For this project, those are out-of-scope features. Do not add the two-clocks complexity unless one of the above requirements becomes real.

## Review Checklist

When evaluating timing code in this project, check:

- Is `buildSchedule` a pure function (no side effects, no async)?
- Are all `AudioBufferSourceNode`s stored so `stop()` can cancel them?
- Is sample loading (`decodeAudioData`) done before scheduling, not during?
- Is the small `origin` offset (`currentTime + ~0.05s`) present to avoid scheduling in the past?
- Does `startRow` support correctly normalize times and still process earlier BPM effects?

## Answer Style

When reviewing code, lead with whether it follows the upfront-scheduling model. Flag any re-introduction of polling loops or live-scheduler patterns unless there is a clear new requirement that justifies it.