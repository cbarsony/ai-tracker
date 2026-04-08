# Phase 1: Sample Playback Foundation

## Goal

Build the minimal but architecturally final sample playback pipeline. One baked-in sample, one note at a time, pitch-selectable. The sound engine code written here **stays** — only the UI gets replaced later.

## Scope

| In scope | Out of scope |
|----------|-------------|
| 1 baked-in 8-bit sample | Multiple samples, sample bank |
| Web Audio API playback pipeline | Effects (volume slide, portamento, etc.) |
| Pitch control (note selection) | Tracker grid, pattern editor |
| Minimal HTML controls | Tracker-style UI, canvas rendering |
| Sample stored as `Int8Array` | Sample loading from file, drawing, AI |
| `AudioBuffer` creation from raw data | Mixing, EQ, compression |
| Statechart for playback state | Song structure, patterns, order list |

## File Structure

```
ai-tracker/
├── index.html              # Minimal page: note selector + play button
├── css/
│   └── style.css           # Minimal styling (will be replaced)
├── js/
│   ├── main.js             # Entry point, wires everything together
│   ├── audio-engine.js     # Web Audio API: AudioContext, buffer creation, playback
│   ├── sample-bank.js      # Sample storage and retrieval (1 sample now, 32 later)
│   ├── note-util.js        # Note ↔ frequency conversion, note names
│   └── state-machine.js    # Minimal statechart implementation
└── samples/
    └── square-wave.js      # Baked-in sample data as Int8Array export
```

## Architecture

### Sample Data Format (Final)

Samples are stored as **8-bit signed integer arrays** (`Int8Array`), values -128 to +127. This is the canonical format — matches the Amiga ProTracker standard and is small enough for AI context in later phases.

```js
// samples/square-wave.js
// Single-cycle square wave, 64 samples long
export const SQUARE_WAVE = {
  name: "Square Wave",
  baseNote: "C-4",        // Note at which playbackRate = 1.0
  sampleRate: 44100,      // Sample rate used when creating AudioBuffer
  loopStart: 0,           // Loop point (in samples) — 0 = loop entire waveform
  loopEnd: 64,            // Loop end point
  data: new Int8Array([
    127, 127, 127, 127, 127, 127, 127, 127,
    127, 127, 127, 127, 127, 127, 127, 127,
    127, 127, 127, 127, 127, 127, 127, 127,
    127, 127, 127, 127, 127, 127, 127, 127,
   -128,-128,-128,-128,-128,-128,-128,-128,
   -128,-128,-128,-128,-128,-128,-128,-128,
   -128,-128,-128,-128,-128,-128,-128,-128,
   -128,-128,-128,-128,-128,-128,-128,-128,
  ])
};
```

The sample object structure is **final** — all 32 samples will use this format. Fields:

| Field | Type | Purpose |
|-------|------|---------|
| `name` | string | Human-readable name (also sent to AI in future) |
| `baseNote` | string | The note at which `playbackRate = 1.0` |
| `sampleRate` | number | Rate used to create `AudioBuffer` |
| `loopStart` | number | Loop start in samples (0 = beginning) |
| `loopEnd` | number | Loop end in samples |
| `data` | `Int8Array` | Raw 8-bit signed waveform data |

### Web Audio Pipeline (Final)

```
Int8Array (sample data)
    ↓
Convert to Float32Array (normalize: divide by 128)
    ↓
Create AudioBuffer (1 channel, sample.sampleRate)
    ↓
Copy Float32Array into AudioBuffer
    ↓
[Store this AudioBuffer — it's reusable]

--- per note trigger ---

Create AudioBufferSourceNode
    ↓
Set .buffer = stored AudioBuffer
Set .loop = true
Set .loopStart = sample.loopStart / sample.sampleRate
Set .loopEnd = sample.loopEnd / sample.sampleRate
Set .playbackRate = calculatePlaybackRate(targetNote, baseNote)
    ↓
Connect to AudioContext.destination (later: to mixing chain)
    ↓
sourceNode.start()
```

This architecture is **final**. Later phases add a gain node, effect nodes, and a mixer between the source and destination, but the sample → buffer → source → pitch pipeline stays.

### Pitch Calculation (Final)

Notes follow the tracker convention: `C-0` through `B-9`. Concert pitch: A-4 = 440 Hz.

```
noteFrequency(note) = 440 * 2^((noteIndex - A4index) / 12)

playbackRate = noteFrequency(targetNote) / noteFrequency(baseNote)
```

Note index mapping (chromatic, C-0 = 0):
```
C=0, C#=1, D=2, D#=3, E=4, F=5, F#=6, G=7, G#=8, A=9, A#=10, B=11
noteIndex = octave * 12 + semitone
A-4 index = 4 * 12 + 9 = 57
```

`note-util.js` must expose:
- `parseNote(str)` → `{ semitone, octave }` or `null` (for `---`)
- `noteToFrequency(noteStr)` → Hz
- `calculatePlaybackRate(targetNote, baseNote)` → float
- `NOTE_NAMES` → array of valid note strings for UI population

Use **sharp notation only** (`C#`, not `Db`) — matches FastTracker 2 convention. The note range for v1: `C-1` through `B-8` (practical tracker range).

### Playback Statechart (Final Pattern)

```
States: idle → playing → idle

Events:
  PLAY   (from idle)    → playing  [action: create source node, start]
  STOP   (from playing) → idle     [action: stop source node, disconnect]
  PLAY   (from playing) → playing  [action: stop current, create new, start]
```

The statechart implementation in `state-machine.js` is **the final pattern** used throughout the app. Keep it minimal:

```js
function createMachine(config) {
  let currentState = config.initial;

  return {
    getState() { return currentState; },
    send(event) {
      const stateConfig = config.states[currentState];
      const transition = stateConfig?.on?.[event];
      if (!transition) return; // event not handled in this state
      if (transition.action) transition.action();
      currentState = transition.target;
    }
  };
}
```

This is the simplest useful statechart. It handles flat states and transition actions. No guards, no hierarchy, no history — those aren't needed. If a future phase justifies guards, add them then.

### sample-bank.js (Final Interface)

```js
// Phase 1: contains 1 sample. Phase 2+: contains up to 32.
// The interface is final — only the contents grow.

getSample(id)           → sample object (by hex ID: "00" to "1F")
getAudioBuffer(id)      → prepared AudioBuffer (created once, reused)
getSampleCount()        → number
getAllSampleMeta()       → [{ id, name }] (for UI population, for AI context later)
```

In Phase 1, only `"00"` returns a sample. All others return `null`.

### audio-engine.js (Final Interface)

```js
init()                           → creates AudioContext (must be called from user gesture)
playNote(sampleId, noteStr)      → triggers one note
stopNote()                       → stops current note
getState()                       → "idle" | "playing"
```

The `AudioContext` is created **once** on first user interaction (browser autoplay policy requires a user gesture). This is stored and reused for the application lifetime.

## UI Specification (Temporary)

Plain HTML — will be completely replaced by tracker-style UI later.

```
┌─────────────────────────────────┐
│  AI Tracker — Phase 1 Prototype │
│                                 │
│  Sample: Square Wave            │
│                                 │
│  Note: [C-4 ▼]   [▶ Play]      │
│                                 │
│  Status: idle                   │
└─────────────────────────────────┘
```

- **Note selector**: `<select>` dropdown populated from `NOTE_NAMES`, default `C-4`
- **Play button**: triggers `playNote("00", selectedNote)`. While playing, clicking again restarts with current note selection.
- **Stop button** (or toggle play/stop): stops playback
- **Status**: shows current statechart state (`idle` / `playing`)

No styling effort beyond readability. This UI exists only to validate the sound engine.

## Acceptance Criteria

1. Page loads with no errors, no external dependencies
2. User selects a note from dropdown and clicks Play → hears a looping square wave at correct pitch
3. Selecting C-4 produces the base pitch; C-5 produces exactly double frequency (one octave up)
4. Clicking Play while already playing restarts with newly selected note
5. Stop silences playback and returns to idle state
6. `AudioContext` is created on first user gesture, not on page load
7. Sample data lives as `Int8Array` — the canonical 8-bit signed format
8. All stateful logic uses the statechart pattern (no ad-hoc boolean flags)
9. No frameworks, no libraries, no dependencies — vanilla JS with ES modules
10. File structure matches the spec above

## Implementation Notes

- Use ES modules (`type="module"` in script tag, `import`/`export` in JS files)
- The `Int8Array` → `Float32Array` conversion (divide by 128.0) must clamp to [-1.0, 1.0] range. Value -128 maps to -1.0, value 127 maps to 0.9921875
- The single test sample should be a recognizable waveform (square wave is ideal — distinctive sound, trivial to verify visually and audibly)
- Looping is essential — a 64-sample waveform at 44.1kHz is ~1.5ms, inaudible without looping
- The `AudioBufferSourceNode` is **single-use** per Web Audio spec — a new one must be created for each note trigger. The `AudioBuffer` is reusable.

## What This Phase Validates

- That `Int8Array` → `AudioBuffer` → `AudioBufferSourceNode` pipeline works correctly
- That pitch control via `playbackRate` produces musically correct intervals
- That the sample data format is sufficient and final
- That the statechart pattern works for playback control
- That the module structure supports future growth without refactoring

## What This Phase Does NOT Decide

- Tracker cell format (Note + Sample + Volume + Effect) — Phase 2+
- Multiple simultaneous channels — Phase 2+
- Pattern/song structure — Phase 2+
- Effect processing — Phase 2+
- AI integration — later phase
