---
name: web-audio-basics
description: 'Getting started with Web Audio API. Use when creating AudioContext, loading and decoding audio files, playing sounds, controlling volume with GainNode, crossfading between tracks, or applying BiquadFilter effects. Covers AudioBuffer, BufferSource, gain nodes, equal-power crossfade, playlist transitions, and low-pass/high-pass filters.'
---

# Web Audio API Basics

## When to Use
- Setting up an `AudioContext` for the first time
- Loading and decoding audio files (`XMLHttpRequest` + `decodeAudioData`)
- Playing, stopping, or looping buffered sounds
- Adjusting or animating volume with `GainNode`
- Crossfading between two audio sources (DJ-style or playlist)
- Applying filter effects (low-pass, high-pass, band-pass, etc.)

---

## Core Concepts

### AudioContext
The central object — manages all nodes and the audio graph. Create **one** per application.

```js
const context = new AudioContext();
```

> Older WebKit browsers need the `webkit` prefix: `new webkitAudioContext()`.

### Audio Graph
Every sound is routed through a graph of `AudioNode` objects:

```
AudioBufferSourceNode → [optional nodes] → AudioContext.destination
```

---

## Procedure

### 1. Create the AudioContext

```js
let context;
window.addEventListener('load', () => {
  try {
    context = new AudioContext();
  } catch (e) {
    console.error('Web Audio API is not supported in this browser');
  }
});
```

### 2. Load a Sound (fetch + decode)

```js
async function loadSound(url) {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return context.decodeAudioData(arrayBuffer); // returns Promise<AudioBuffer>
}
```

> Prefer `fetch` over `XMLHttpRequest` in modern code. Both produce an `ArrayBuffer` that `decodeAudioData` consumes.

### 3. Play a Sound

```js
function playBuffer(buffer, when = 0) {
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.connect(context.destination);
  source.start(when); // use context.currentTime + offset for scheduling
}
```

- `source.start(0)` — play immediately  
- `source.start(context.currentTime + 0.5)` — play 500 ms from now  
- `source.loop = true` — loop the buffer  
- Each `BufferSourceNode` is **one-shot**: create a new one for each play.

### 4. Control Volume (GainNode)

```js
const gainNode = context.createGain();
source.connect(gainNode);
gainNode.connect(context.destination);

gainNode.gain.value = 0.5;                    // immediate
gainNode.gain.linearRampToValueAtTime(0, context.currentTime + 2); // fade out over 2s
```

### 5. Crossfade Between Two Sources (Equal-Power)

Linear crossfades produce a volume dip at the midpoint. Use an equal-power curve instead:

```js
function equalPowerCrossfade(gainA, gainB, t) {
  // t: 0 = full A, 1 = full B
  gainA.gain.value = Math.cos(t * 0.5 * Math.PI);
  gainB.gain.value = Math.cos((1 - t) * 0.5 * Math.PI);
}
```

Setup:
```js
function createSource(buffer) {
  const source = context.createBufferSource();
  const gain = context.createGain();
  source.buffer = buffer;
  source.loop = true;
  source.connect(gain);
  gain.connect(context.destination);
  source.start(0);
  return { source, gain };
}
```

### 6. Playlist Crossfade (scheduled)

Fade out the current track and fade in the next using `AudioParam` ramps — more precise than `setTimeout` alone:

```js
function crossfadeToNext(currentGain, nextSource, nextGain, duration, fadeTime) {
  const now = context.currentTime;

  // Fade out current
  currentGain.gain.linearRampToValueAtTime(1, now);
  currentGain.gain.linearRampToValueAtTime(0, now + fadeTime);

  // Fade in next
  nextGain.gain.linearRampToValueAtTime(0, now);
  nextGain.gain.linearRampToValueAtTime(1, now + fadeTime);
  nextSource.start(now);
}
```

### 7. Apply a Filter (BiquadFilterNode)

```js
const filter = context.createBiquadFilter();
filter.type = 'lowpass';       // 'highpass', 'bandpass', 'notch', 'allpass', etc.
filter.frequency.value = 440;  // cutoff in Hz
filter.Q.value = 1;            // resonance

source.connect(filter);
filter.connect(context.destination);
```

**Toggle filter dynamically:**
```js
// Remove filter — connect source directly
source.disconnect(0);
filter.disconnect(0);
source.connect(context.destination);
```

> Frequency perception is logarithmic. Use logarithmic scaling when mapping a UI slider to `filter.frequency.value`.

---

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Reusing a `BufferSourceNode` after `.start()` | Create a new `BufferSourceNode` per playback |
| Audio blocked on page load | Call `context.resume()` inside a user gesture handler |
| Linear crossfade volume dip | Use the equal-power formula (`Math.cos`) |
| `noteOn` / `noteOff` not found | Renamed to `start()` / `stop()` in the current spec |
| Scheduling with `setTimeout` for precise timing | Use `AudioParam` ramps or see the `web-audio-timing` skill |

---

## Related Skills
- [`web-audio-timing`](../web-audio-timing/SKILL.md) — precise scheduling of rhythmic events, sequencers, drum machines
