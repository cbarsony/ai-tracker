# Phase 1 Evaluation

**Date:** 2026-04-08
**Verdict:** PASS — solid first iteration, 3 minor issues below.

## Quick Summary

- **File structure**: All 8 files present at correct paths — PASS
- **Sample data format** (`square-wave.js`): Exact match to spec — PASS
- **State machine** (`state-machine.js`): Verbatim spec implementation — PASS
- **Note utilities** (`note-util.js`): All 4 exports correct, sharp-only, C-1–B-8 range, A4=440Hz — PASS
- **Audio pipeline** (`audio-engine.js`): Int8→Float32→AudioBuffer→Source→playbackRate chain correct — PASS
- **UI** (`index.html` + `main.js`): Dropdown, play, stop, status, ES modules, no dependencies — PASS
- **Acceptance criteria**: 9/10 full pass, 1 partial (criterion #8)

## Issues

### 1. Ad-hoc `initialized` flag in main.js (line 19)

**Spec violation:** Acceptance criterion #8 — *"All stateful logic uses the statechart pattern (no ad-hoc boolean flags)"*

`main.js` uses a bare `let initialized = false` to track whether `AudioContext` has been created. This is lifecycle state managed outside the statechart.

**Fix:** Add an `uninitialized` state to the playback machine. The first PLAY event transitions `uninitialized → idle` (with `init()` as its action), then immediately the machine processes PLAY from idle → playing. Alternatively, make the machine start in `uninitialized` and have PLAY from `uninitialized` go directly to `playing` with an action that calls both `init()` and starts playback. Either way, the boolean disappears.

### 2. Note-start logic outside state machine actions in audio-engine.js (lines 56–72)

**Spec says:** PLAY from idle should `[action: create source node, start]` — the source creation is a transition action owned by the machine.

**What happens instead:** `machine.send("PLAY")` fires (with `action: null` from idle), then source creation runs as procedural code *after* the send call. The machine tracks state labels but doesn't own the start side-effect. Only `stopCurrent` is wired as a real transition action (on PLAY-from-playing and STOP).

**Why it matters:** The statechart pattern's value is that transitions *and their effects* live in one declarative place. Half-inside, half-outside undermines that.

**Fix:** Wrap the source-creation code in a function and assign it as the action for both PLAY transitions (from idle and from playing). The PLAY-from-playing action would call `stopCurrent()` then `startNew()`. This requires the machine config to be built with closures that capture the needed context (audioContext, sample, note) — either rebuild the machine config per-call or pass parameters through the event. Rebuilding the action closure before `send()` is the simplest approach given the current machine API.

### 3. `getAudioBuffer` signature mismatch in sample-bank.js (line 21)

**Spec says:** `getAudioBuffer(id)` — one parameter.

**Implementation:** `getAudioBuffer(id, audioContext)` — requires caller to pass `AudioContext`.

**Impact:** Low. The buffer is cached after first creation, so the context parameter is only used once per sample. Functionally correct. But the spec explicitly defines this as a final interface, and the extra parameter leaks audio-engine concerns into sample-bank's API.

**Fix:** Have `sample-bank.js` accept and store the `AudioContext` reference via an `init(audioContext)` call (mirroring how audio-engine stores it), then `getAudioBuffer(id)` uses the stored reference. This matches the spec signature and keeps the module self-contained.