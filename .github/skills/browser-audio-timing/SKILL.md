---
name: browser-audio-timing
description: "Use when: implementing, reviewing, debugging, or explaining browser audio timing, Web Audio scheduling, AudioContext.currentTime, lookahead schedulers, setTimeout/setInterval timing, tracker playback, sequencers, metronomes, drum machines, or audio/visual synchronization."
argument-hint: "Describe the timing code, bug, or browser audio scheduling task"
---

# Browser Audio Timing

Use this skill when working on browser-based music, tracker, sequencer, metronome, sampler, or drum-machine timing.

The core reference is Chris Wilson's web.dev article, "A tale of two clocks": https://web.dev/articles/audio-scheduling

## Core Model

Browser audio timing should coordinate two clocks:

- The Web Audio clock, `AudioContext.currentTime`, is the precision clock for sound.
- The JavaScript clock, through `setTimeout`, `setInterval`, or `requestAnimationFrame`, is useful for periodically running scheduling code but is not precise enough to directly trigger rhythmic audio.

The correct pattern is to use a JavaScript timer as a polling mechanism, then schedule actual audio events into the Web Audio timeline slightly ahead of time.

## Recommended Scheduler Pattern

1. Keep the next musical event time in audio-clock seconds, for example `nextNoteTime` or `nextRowTime`.
2. Run a frequent JavaScript scheduler tick, commonly around `25ms`.
3. On each tick, compare the next event time with `audioContext.currentTime + scheduleAheadTime`.
4. Use a `while` loop, not an `if`, so delayed timer callbacks can catch up by scheduling multiple upcoming events.
5. Schedule sound with Web Audio methods that accept audio-clock time, such as `source.start(time)`, `source.stop(time)`, or `AudioParam.setValueAtTime(value, time)`.
6. Advance the next event time using the current tempo or row duration after each scheduled event.
7. Keep the schedule-ahead window large enough to tolerate main-thread stalls but small enough that tempo, mute, stop, or pattern changes do not feel sluggish.

A strong default starting point is:

```js
const lookaheadMs = 25;
const scheduleAheadSeconds = 0.1;

function schedulerTick() {
  while (nextEventTime < audioContext.currentTime + scheduleAheadSeconds) {
    scheduleEvent(nextEventTime);
    advanceToNextEvent();
  }
}
```

## Review Checklist

When evaluating timing code, check these points first:

- Does audio playback use `AudioContext.currentTime` as the timing source?
- Are audio events scheduled with Web Audio time parameters instead of started directly from `setTimeout`, `setInterval`, or `requestAnimationFrame` callbacks?
- Is there a short scheduler interval and a larger overlapping schedule-ahead window?
- Does the scheduler use `while (nextTime < currentTime + scheduleAhead)` so it can schedule multiple events after a delayed callback?
- Is the next event time advanced in audio-clock seconds based on the current tempo, rows per beat, pattern step, or note duration?
- Are tempo changes picked up by future scheduler ticks rather than requiring a fully pre-rendered schedule?
- Does stopping playback clear future scheduler ticks, and if needed, does it also handle already scheduled sources within the lookahead window?
- Are UI updates synchronized against the audio clock, usually inside `requestAnimationFrame`, rather than assuming the JavaScript timer callback time equals audible playback time?

## Common Findings

- Directly calling `source.start()` without a future `time` from a JavaScript timer causes jitter under main-thread load.
- Scheduling an entire pattern or song far ahead gives good timing but poor responsiveness to tempo changes, stop, mute, or pattern edits.
- Using `if` instead of `while` can miss events when the scheduler callback is delayed.
- A lookahead that is too short can jitter or miss events; a lookahead that is too long can make controls feel delayed.
- Stopping a scheduler does not automatically cancel `AudioBufferSourceNode`s that were already scheduled.

## Applying This To Trackers

For tracker-style playback:

- Treat rows as musical events on the audio clock.
- Compute row duration as `60 / (bpm * rowsPerBeat)` when one beat is a quarter-note style beat.
- Schedule all notes in a row at the same row time.
- Advance `nextRowTime` by one row duration after scheduling each row.
- Keep pattern position separately from audio-clock time, wrapping or advancing order lists as appropriate.
- Implement note-off, channel state, sample stop, and effect timing explicitly; ignoring note-off may be acceptable for one-shot drums but not for sustained samples.

## Answer Style

When using this skill for code review, lead with whether the code follows the article's model. Then list timing risks or mismatches in severity order, with file references when available.