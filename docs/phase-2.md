# Phase 2: Polyphony + Sample Bank

## Goal

Extend the Phase 1 single-voice pipeline to **4 independent channels** and populate the **full 32-sample bank**. The audio routing becomes architecturally final (per-channel gain → master destination). The sample bank interface — already final — now holds its full v1 content.

## Scope

| In scope | Out of scope |
|----------|-------------|
| 4 independent audio channels | Tracker grid, pattern editor |
| Per-channel gain node | Effects (volume slide, portamento, etc.) |
| 32 baked-in 8-bit samples | Sample loading from file, drawing, AI |
| Sample selector in UI | Tracker-style UI, canvas rendering |
| Per-channel note trigger & stop | Song structure, patterns, order list |
| Per-channel state machines | Mixing, EQ, compression |
| Master volume gain node | Tempo, scheduling, sequencing |

## What Changes from Phase 1

| Component | Phase 1 | Phase 2 |
|-----------|---------|---------|
| `audio-engine.js` | 1 source, 1 state machine, direct-to-destination | 4 channels, 4 state machines, per-channel gain → master gain → destination |
| `sample-bank.js` | 1 sample (`"00"`) | 32 samples (`"00"` – `"1F"`) |
| `main.js` | Hardcoded sample `"00"`, single play/stop | Channel selector, sample selector, per-channel controls |
| `index.html` | Minimal 1-note UI | Channel/sample selectors, per-channel status display |
| `samples/` | `square-wave.js` only | 5 sample files, 32 samples total |
| `state-machine.js` | No change | No change |
| `note-util.js` | No change | No change |
| `css/style.css` | Minimal styling | Minimal styling (still temporary) |

## File Structure

```
ai-tracker/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── main.js
│   ├── audio-engine.js         # ← modified: 4 channels, gain routing
│   ├── sample-bank.js          # ← modified: registers all 32 samples
│   ├── note-util.js            # unchanged
│   └── state-machine.js        # unchanged
└── samples/
    ├── square-wave.js           # unchanged (sample 00)
    ├── basic-waves.js           # sine, triangle, sawtooth, pulse widths
    ├── bass.js                  # bass timbres
    ├── leads.js                 # lead/melodic timbres
    └── drums.js                 # kick, snare, hi-hat, percussion
```

## Architecture

### Audio Routing (Final)

Phase 1 connected source nodes directly to `AudioContext.destination`. Phase 2 introduces the **final routing topology**:

```
Channel 0:  Source → GainNode(ch0) ─┐
Channel 1:  Source → GainNode(ch1) ─┤
Channel 2:  Source → GainNode(ch2) ─┼→ GainNode(master) → AudioContext.destination
Channel 3:  Source → GainNode(ch3) ─┘
```

Each `GainNode` is created **once** during `init()` and persists for the application lifetime. Only the `AudioBufferSourceNode` is recreated per note trigger (per Web Audio spec).

This routing is **final**. Later phases insert effect nodes between source and channel gain, and a mixer/compressor between master gain and destination. The channel structure itself stays.

### Channel Object

Each channel holds its own state:

```js
{
  id: 0,                    // 0–3
  gainNode: GainNode,       // persistent, created at init()
  source: null,             // current AudioBufferSourceNode (or null)
  machine: StateMachine,    // independent idle/playing state
  currentSampleId: null,    // what's currently playing (for UI feedback)
  currentNote: null         // what note is playing (for UI feedback)
}
```

Channels are **fully independent**. Playing a note on channel 2 does not affect channels 0, 1, or 3. Each channel has its own state machine instance.

### Per-Channel State Machine

Same statechart pattern as Phase 1, but instantiated 4 times — one per channel:

```
States: idle → playing → idle

Events:
  PLAY   (from idle)    → playing  [action: create source, connect, start]
  STOP   (from playing) → idle     [action: stop source, disconnect]
  PLAY   (from playing) → playing  [action: stop current, create new, start]
```

No shared "global playback" state yet — that arrives with the pattern sequencer in a later phase.

### audio-engine.js Interface (Updated)

```js
init()                                    → creates AudioContext, 4 channels, gain routing
playNote(channel, sampleId, noteStr)      → triggers one note on a specific channel (0–3)
stopNote(channel)                         → stops a specific channel
stopAll()                                 → stops all channels
getChannelState(channel)                  → "idle" | "playing"
getChannelCount()                         → 4  (constant, for UI)
```

Changes from Phase 1:
- `playNote` and `stopNote` gain a `channel` parameter (0–3)
- `stopAll()` added — stops all channels (needed for future global stop, useful for UI)
- `getState()` replaced by `getChannelState(channel)` — there is no single global state
- `getChannelCount()` added — UI uses this to build channel controls

### Sample Bank — Full Inventory

All 32 samples are baked-in, single-cycle waveforms stored as `Int8Array`. Each is 64 samples long (matching the square wave), `baseNote: "C-4"`, `sampleRate: 44100`. Same format as Phase 1 — the interface doesn't change.

Samples are organized by musical function:

| ID | Name | File | Description |
|----|------|------|-------------|
| `00` | Square Wave | `square-wave.js` | 50% duty cycle square (existing) |
| `01` | Sine Wave | `basic-waves.js` | Pure fundamental, no harmonics |
| `02` | Triangle Wave | `basic-waves.js` | Odd harmonics, 1/n² rolloff — soft |
| `03` | Sawtooth Wave | `basic-waves.js` | All harmonics, 1/n rolloff — bright |
| `04` | Pulse 25% | `basic-waves.js` | Narrow pulse — nasal, reedy |
| `05` | Pulse 12.5% | `basic-waves.js` | Very narrow pulse — thin, buzzy |
| `06` | Half-Rect Sine | `basic-waves.js` | Half-wave rectified sine — warm even harmonics |
| `07` | Abs Sine | `basic-waves.js` | Full-wave rectified sine — organ-like |
| `08` | Staircase 4 | `basic-waves.js` | 4-level quantized sine — lofi digital |
| `09` | Staircase 8 | `basic-waves.js` | 8-level quantized sine — smoother digital |
| `0A` | Warm Bass | `bass.js` | Fundamental + slight 2nd harmonic |
| `0B` | Thick Bass | `bass.js` | Strong fundamental + 3rd harmonic |
| `0C` | Buzz Bass | `bass.js` | Square-ish with even harmonics — growly |
| `0D` | Sub Bass | `bass.js` | Nearly pure sine — deep sub |
| `0E` | Pluck Bass | `bass.js` | Saw-like with fast harmonic decay shape |
| `0F` | Round Bass | `bass.js` | Triangle + slight 2nd — mellow |
| `10` | Bright Lead | `leads.js` | Saw + boosted upper harmonics |
| `11` | Soft Lead | `leads.js` | Triangle + faint harmonics |
| `12` | Nasal Lead | `leads.js` | Odd harmonics, boosted 3rd and 5th |
| `13` | Bell Tone | `leads.js` | Inharmonic partials — metallic |
| `14` | Organ 1 | `leads.js` | Fundamental + 2nd + 3rd — simple organ |
| `15` | Organ 2 | `leads.js` | Drawbar-style: 1st, 2nd, 4th, 8th |
| `16` | Flute Tone | `leads.js` | Sine + faint 2nd + fainter 3rd |
| `17` | Reed Tone | `leads.js` | All harmonics, slow rolloff — clarinet-like |
| `18` | Chip Arp | `leads.js` | Multi-cycle waveform with pitch movement baked in |
| `19` | PWM Static | `leads.js` | ~33% duty cycle pulse — between square and 25% |
| `1A` | Kick | `drums.js` | Sine burst decaying to silence — pitched kick |
| `1B` | Snare | `drums.js` | Noise-like burst with tonal component |
| `1C` | Hi-Hat Closed | `drums.js` | Short noise burst — metallic |
| `1D` | Hi-Hat Open | `drums.js` | Longer noise burst — sustain ring |
| `1E` | Clap | `drums.js` | Double-peak noise burst |
| `1F` | Tom | `drums.js` | Sine burst, lower pitch, longer decay |

#### Sample Generation Approach

Waveforms are generated **mathematically** in each sample file, not hand-typed byte by byte. Each file exports sample objects built from additive synthesis or simple wave math:

```js
// Example: generate a sine wave as Int8Array
function generateSine(length) {
  const data = new Int8Array(length);
  for (let i = 0; i < length; i++) {
    data[i] = Math.round(127 * Math.sin(2 * Math.PI * i / length));
  }
  return data;
}
```

This keeps sample files readable and maintainable. The drum samples use short single-shot waveforms with amplitude envelopes baked into the data.

#### Drum Samples — Loop Behavior

Drum samples differ from tonal waveforms:
- Tonal samples: `loopStart: 0`, `loopEnd: length` — loop entire waveform (sustained tone)
- Drum samples: `loopStart: 0`, `loopEnd: 0` — **no looping** (one-shot playback)

When `loopEnd` is 0, the audio engine must set `source.loop = false`. This is the only functional change to the source node setup logic.

**Implementation note:** Drum waveforms should be longer than tonal ones — 256 or 512 samples — to allow for an audible amplitude envelope within the single-shot data. The tonal samples stay at 64 samples since they loop.

### sample-bank.js Changes

Minimal — import all sample files and register every sample:

```js
import { SQUARE_WAVE } from "../samples/square-wave.js";
import { SINE, TRIANGLE, SAWTOOTH, /* ... */ } from "../samples/basic-waves.js";
import { WARM_BASS, THICK_BASS, /* ... */ } from "../samples/bass.js";
import { BRIGHT_LEAD, SOFT_LEAD, /* ... */ } from "../samples/leads.js";
import { KICK, SNARE, /* ... */ } from "../samples/drums.js";

samples.set("00", SQUARE_WAVE);
samples.set("01", SINE);
// ... all 32
```

The `getSample()`, `getAudioBuffer()`, `getSampleCount()`, and `getAllSampleMeta()` interfaces remain identical. Only the content of the `samples` Map grows.

## UI Specification (Temporary)

Still plain HTML — still temporary. Expanded to show channel controls and sample selection.

```
┌──────────────────────────────────────────────┐
│  AI Tracker — Phase 2 Prototype              │
│                                              │
│  Channel: [0 ▼]                              │
│  Sample:  [00 - Square Wave ▼]               │
│  Note:    [C-4 ▼]                            │
│                                              │
│  [▶ Play]  [■ Stop]  [■ Stop All]            │
│                                              │
│  Ch 0: idle     Ch 1: idle                   │
│  Ch 2: idle     Ch 3: idle                   │
└──────────────────────────────────────────────┘
```

- **Channel selector**: `<select>` dropdown, values 0–3
- **Sample selector**: `<select>` populated from `getAllSampleMeta()`, displays `"ID - Name"` (e.g., `"0A - Warm Bass"`)
- **Note selector**: Same as Phase 1, populated from `NOTE_NAMES`, default `C-4`
- **Play button**: triggers `playNote(selectedChannel, selectedSample, selectedNote)`
- **Stop button**: triggers `stopNote(selectedChannel)`
- **Stop All button**: triggers `stopAll()`
- **Per-channel status**: shows `getChannelState(n)` for all 4 channels, updates after each action

The note/sample selectors apply to whichever channel is selected. Changing the channel selector does **not** stop or affect any playing channels.

## Acceptance Criteria

1. All 4 channels can play simultaneously — selecting different samples and notes per channel produces a 4-voice chord
2. Stopping one channel does not affect other playing channels
3. Stop All silences everything and returns all channels to idle
4. All 32 samples are available in the sample selector and produce distinct sounds
5. Tonal samples (00–19) loop continuously; drum samples (1A–1F) play once and stop
6. Pitch control works identically to Phase 1 — C-5 is one octave above C-4 for any sample
7. `AudioContext` is still created on first user gesture, not on page load
8. Each channel has its own gain node; audio routing matches the routing diagram
9. The state machine pattern is used per channel — no ad-hoc boolean flags
10. No frameworks, no libraries, no dependencies — vanilla JS with ES modules
11. Phase 1 functionality is preserved — playing a single note on channel 0 with sample 00 works exactly as before
12. `sample-bank.js` interface (`getSample`, `getAudioBuffer`, `getSampleCount`, `getAllSampleMeta`) is unchanged — only the content grows

## Implementation Order

Suggested order to minimize risk and allow incremental testing:

### Step 1: Polyphonic Audio Engine
Refactor `audio-engine.js` to support 4 channels with per-channel gain routing. Use sample `"00"` only. Verify that 4 notes can play simultaneously.

### Step 2: UI — Channel and Sample Selectors
Update `index.html` and `main.js` with channel selector, sample selector (showing only `"00"` initially), per-channel status display.

### Step 3: Sample Files — Basic Waves
Create `samples/basic-waves.js` with samples `01`–`09`. Register in `sample-bank.js`. Verify they sound correct across pitch range.

### Step 4: Sample Files — Bass
Create `samples/bass.js` with samples `0A`–`0F`. Register in `sample-bank.js`.

### Step 5: Sample Files — Leads
Create `samples/leads.js` with samples `10`–`19`. Register in `sample-bank.js`.

### Step 6: Sample Files — Drums
Create `samples/drums.js` with samples `1A`–`1F`. Register in `sample-bank.js`. Implement the `loop = false` logic for one-shot drum samples.

### Step 7: Polish and Verify
Test all 32 samples × 4 channels. Verify acceptance criteria. Clean up any issues.

## Implementation Notes

- The `GainNode` per channel enables future per-channel volume control (tracker volume column) and panning without architectural changes
- Master gain exists primarily as a single point for future global volume control and to make it easy to insert a compressor/limiter later
- Drum samples with `loopEnd: 0` is the simplest convention to distinguish one-shot from looping. The audio engine checks this value when setting up the source node
- Sample generation functions should use `Math.round()` when converting float calculations to `Int8Array` values to avoid truncation bias
- Keep sample files self-contained — each file exports its sample objects and contains the generation math. No shared generation utilities across sample files (duplication is fine for clarity)

## What This Phase Validates

- That 4 independent channels can play simultaneously without audio glitches or state corruption
- That per-channel gain routing works and channels don't interfere
- That the sample data format handles both tonal (looping) and percussive (one-shot) sounds
- That 32 distinct 8-bit single-cycle waveforms provide musically useful variety
- That the `sample-bank.js` interface scales from 1 to 32 samples without changes

## What This Phase Does NOT Decide

- Tracker cell format (Note + Sample + Volume + Effect) — Phase 3+
- Pattern/song structure, tempo, sequencing — Phase 3+
- Effect processing (volume slide, portamento, arpeggio) — Phase 3+
- Tracker-style grid UI — Phase 3+
- AI integration — later phase
- Per-channel volume/panning beyond the gain node existing — later phase
