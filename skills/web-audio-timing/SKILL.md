---
name: web-audio-timing
description: 'JavaScript timing for Web Audio API. Use when scheduling audio events, building sequencers, drum machines, metronomes, or any rhythmic audio. Covers the two-clock collaboration pattern (setTimeout lookahead + Web Audio clock), avoiding jitter, and syncing visuals with requestAnimationFrame.'
---

# Web Audio Timing

## When to Use
- Scheduling precise musical notes or rhythmic audio events
- Building sequencers, drum machines, metronomes, or games with audio
- Avoiding jitter caused by `setTimeout` delay on the main thread
- Syncing visual display to audio playback

---

## Core Concept: Two Clocks

### The Audio Clock (`AudioContext.currentTime`)
- High-precision floating-point seconds since `AudioContext` was created
- Runs on a **separate thread** — unaffected by layout, GC, or debugger pauses
- Use this to schedule `start()`, `stop()`, and `setValueAtTime()` calls
- **Do not** look too far ahead: pre-scheduling many events makes it impossible to change tempo or stop mid-sequence

### The JavaScript Clock (`setTimeout` / `setInterval`)
- Precision: ~1ms (`Date.now()`); better with `performance.now()`
- Callbacks can be **delayed by tens of milliseconds** due to layout, rendering, or GC
- **Never** use `setTimeout` to directly trigger audio playback

---

## The Lookahead Scheduling Pattern

Combine both clocks: `setTimeout` fires periodically and schedules Web Audio events slightly into the future.

```
┌─────────────────────────────────────────────────────────────┐
│  setTimeout (every ~25ms)                                   │
│    └─► scheduler()                                          │
│          └─► while nextNoteTime < now + lookahead:          │
│                scheduleNote(note, nextNoteTime)   ← audio   │
│                nextNote()                                   │
└─────────────────────────────────────────────────────────────┘
```

### Key Parameters

| Parameter | Recommended | Trade-off |
|-----------|-------------|-----------|
| `setTimeout` interval | 25 ms | Shorter = more CPU; longer = less resilient |
| Lookahead window | 100 ms | Larger = more resilient; larger = slower tempo-change response |

---

## Procedure

### 1. Set Up State

```js
const audioContext = new AudioContext();
let nextNoteTime = 0.0;
let current16thNote = 0;
const scheduleAheadTime = 0.1; // 100ms lookahead
const timerInterval = 25;      // ms between scheduler calls
```

### 2. Scheduler — called by setTimeout

```js
function scheduler() {
  while (nextNoteTime < audioContext.currentTime + scheduleAheadTime) {
    scheduleNote(current16thNote, nextNoteTime);
    nextNote();
  }
  timerID = setTimeout(scheduler, timerInterval);
}
```

### 3. Schedule a Note

```js
function scheduleNote(beatNumber, time) {
  const osc = audioContext.createOscillator();
  osc.connect(audioContext.destination);
  osc.frequency.value = (beatNumber % 16 === 0) ? 220 : (beatNumber % 4 ? 880 : 440);
  osc.start(time);
  osc.stop(time + noteLength);
  // push to visual queue if needed
  notesInQueue.push({ note: beatNumber, time });
}
```

### 4. Advance to Next Note

```js
function nextNote() {
  const secondsPerBeat = 60.0 / tempo; // reads CURRENT tempo — enables live tempo change
  nextNoteTime += 0.25 * secondsPerBeat;
  current16thNote = (current16thNote + 1) % 16;
}
```

### 5. Start / Stop

```js
function start() {
  current16thNote = 0;
  nextNoteTime = audioContext.currentTime;
  scheduler();
}

function stop() {
  clearTimeout(timerID);
}
```

---

## Visual Sync — Third Timer (`requestAnimationFrame`)

Use `requestAnimationFrame` for drawing, not `setTimeout`. Check the **audio clock** (not rAF timestamps) to decide what to draw.

```js
let notesInQueue = [];
let currentNote = 0;

function draw() {
  const currentTime = audioContext.currentTime;
  while (notesInQueue.length && notesInQueue[0].time < currentTime) {
    currentNote = notesInQueue[0].note;
    notesInQueue.splice(0, 1);
  }
  // draw currentNote indicator...
  requestAnimationFrame(draw);
}
requestAnimationFrame(draw);
```

---

## Tuning Guidelines

- **Slow machines / complex UI**: increase lookahead (e.g. 150–200ms)
- **Tighter tempo control needed**: reduce lookahead (accept slightly less resilience)
- **High note density** (32nd notes, 300+ BPM): the `while` loop in `scheduler()` will naturally batch multiple notes per call — this is expected and correct
- Always advance `nextNoteTime` by **duration** (not by wall clock), so tempo changes apply immediately on the next `nextNote()` call

---

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Calling `osc.start(audioContext.currentTime)` directly from `setTimeout` | Use the lookahead scheduler instead |
| Pre-scheduling an entire song up front | Only schedule ~100ms ahead; re-schedule on each `setTimeout` tick |
| Using `requestAnimationFrame` timestamps for audio timing | Always read `audioContext.currentTime` for audio decisions |
| Forgetting the `while` loop in scheduler | A single `if` will miss multiple notes at high tempos or long intervals |
