---
name: ai-tracker-pm
description: "Product manager knowledge for the AI Tracker app. Use when: making product decisions, designing features, choosing between implementation approaches, defining data formats, scoping MVP, understanding the tracker domain, or any question about what the product should do and why."
argument-hint: "Ask a product question or describe a feature to get PM guidance"
---

# AI Tracker — Product Manager Knowledge

This skill contains the distilled product vision, architecture decisions, domain expertise, and design constraints for the AI Tracker application. Consult this skill whenever a product or design decision needs to be made during implementation.

## Product Vision

AI Tracker is a **browser-based music tracker** inspired by FastTracker 2 and MadTracker, enhanced with AI. The user composes music in a traditional tracker grid **and** converses with an AI that reads and writes the same tracker format. The AI is a **composer**, not a sound designer — it reasons about notes, rhythm, harmony, and arrangement, not about raw audio.

The retro 8-bit aesthetic is a **design feature, not a limitation**. Small samples, constrained channels, and hex-based notation are deliberate choices that simultaneously enable AI integration (everything fits in an LLM prompt) and tap into the popular lo-fi/chiptune aesthetic.

## Core Product Loop

```
Human writes/edits tracker sheet + text message
        ↓
AI receives tracker sheet + sample metadata + text
        ↓
AI responds with modified/new tracker sheet + text explanation
        ↓
Human reviews, edits, plays back — repeat
```

The tracker **must be fully functional without AI**. AI is central to the product's identity but is an enhancement, not a dependency.

## Architecture Decisions

### Why Tracker Format as AI Protocol

The tracker sheet is **symbolic music notation** — it encodes intent (which note, which sample, which effect, at what time), not sound. This is the right abstraction for an LLM because:

- It's plain text — no binary encoding or special tokenization
- It has rigid, learnable structure — an LLM can be prompted with a grammar and will respect it
- It's losslessly reversible — the AI reads what a human wrote and writes back in the same format
- It maps to musical concepts the model already knows

MIDI was explicitly rejected: variable-length timing, binary bytes, note-on/note-off pairs are deeply unfriendly to text-based models.

### Clean Separation of Concerns

| Layer | Owns | AI sees? |
|-------|------|----------|
| Composition (tracker sheet) | Notes, rhythm, arrangement, effects | Yes — full read/write |
| Sound (samples) | Actual audio waveforms | Metadata only (descriptors, harmonic info) |
| Mixing (effects chain) | EQ, compression, final output | No (client-side only) |

### AI Cannot Hear Samples

The AI references samples by number (01, 02...) but cannot hear them. To bridge this gap:

- **Now (v1):** 32 baked-in samples with human-written descriptive names/tags sent as context to the AI
- **Near-future:** Compute perceptual descriptors client-side (spectral centroid, envelope shape, harmonic content) and include them in AI prompts
- **Future:** Use audio foundation models (CLAP, EnCodec) to generate rich semantic descriptions of samples automatically

### Sample Data as AI-Digestible Information

Retro sample constraints (8-bit, short, single-cycle) make waveform data small enough to include in LLM context. Three representation layers, used in different contexts:

1. **Normalized integer array** — ground truth, lossless, unambiguous
2. **Delta encoding** — token-efficient for smooth/repetitive waveforms
3. **Harmonic coefficients** (Fourier) — most compact, directly musically meaningful (e.g., `H1=0.9 H2=0.45 H3=0.2`)

The harmonic representation is preferred for AI because it moves waveform generation from arithmetic (LLM-weak) to concept selection (LLM-strong).

## Tracker Format Specification

### Cell Format

Each cell in the tracker grid contains:

```
[Note][Sample][Volume][Effect]
 C-4    0A      40     A08
```

| Field | Width | Range | Example |
|-------|-------|-------|---------|
| Note | 3 chars | `C-0` to `B-9`, `---` for empty | `C-4` |
| Sample ID | 2 hex chars | `00`–`1F` (32 samples max) | `0A` |
| Volume | 2 hex chars | `00`–`40` | `40` |
| Effect | 3 hex chars | Command + parameter | `A08` |

All numeric values use **hexadecimal** (0–9, A–F), consistent with FastTracker 2.

### Structure

- **Channels:** 4 (classic MOD standard)
- **Pattern length:** FastTracker 2 default (64 rows)
- **Song structure:** Multiple patterns with an order list (sequence of pattern indices), like FastTracker 2
- **Max samples:** 32 (close to MOD's 31 — a meaningful homage)

### Effect Codes

Use a **subset** of FastTracker 2 effects — only the most essential ones. The exact list will be defined during implementation, but prioritize:

- Volume slide
- Portamento (pitch slide up/down)
- Tone portamento (slide to note)
- Arpeggio
- Set tempo/speed
- Pattern break / jump

Every valid effect code must be enumerated in the AI system prompt so the model doesn't hallucinate invalid ones.

## Sample Constraints

These are **design features**, not technical compromises:

| Property | Limit | Rationale |
|----------|-------|-----------|
| Max length | ~1024 samples per waveform | ~23ms at 44kHz — very retro |
| Bit depth | 8-bit signed integer | Amiga ProTracker standard |
| Max count | 32 per project | Entire sample bank fits in one AI prompt |
| v1 source | Baked-in, pre-defined | User cannot change samples in v1 |

The entire sample bank + tracker sheet must fit in a single AI prompt. The size limit is what makes this possible.

### Future Sample Sources (Post-v1)

- **Drawn waveforms** — user draws a single wave cycle on a canvas (historically grounded: Amiga trackers supported this)
- **File upload** — drag-and-drop or file picker
- **Microphone recording** — via MediaRecorder API
- **AI-generated** — AI returns harmonic coefficients, client reconstructs the waveform

## Tech Stack

| Component | Choice | Notes |
|-----------|--------|-------|
| Platform | Web-only | Browser-based, zero install |
| Frontend | Vanilla JS | No framework, no dependencies, modern web APIs |
| State management | Custom statechart | State machine pattern inspired by XState but no dependency. Simple flat states, no hierarchy or history states needed |
| Audio | Web Audio API | For playback, mixing, effects |
| AI backend | Node.js server | GitHub Copilot SDK ([docs](https://docs.github.com/en/copilot/how-tos/copilot-sdk/sdk-getting-started)) or direct LLM API |
| Storage | Custom binary format (.mod-like) | No cloud, no auth, no accounts |
| Deployment | Online-only (for AI) | Tracker works offline; AI features require connection |

### State Machine Principle

Use statechart pattern for **all stateful frontend logic** (playback state, editor mode, dialog flow, AI request lifecycle). If statecharts fit the backend, use them there too. Implementation must be a custom, lightweight state machine — no library dependency.

## Product Scope — v1

### In Scope

- Tracker grid editor (4 channels, 64 rows, multiple patterns, order list)
- Playback engine (Web Audio API)
- 32 baked-in samples
- Basic AI chat: user sends text + tracker sheet, AI responds with text + tracker sheet
- Programmatic validation of AI output before it reaches the player
- Save/load in custom binary format (local filesystem)

### Explicitly Out of Scope for v1

- User-editable samples (upload, draw, record, AI-generate)
- Cloud save, accounts, authentication
- Export to WAV or standard MOD format
- Mixer, compressor, EQ (planned but not priority)
- Real-time collaboration
- CLAP/audio model integration for sample understanding
- Offline AI

## Known AI Strengths and Weaknesses

### LLM is Good At (Tracker Sheet)

- Music theory, harmony, rhythm, arrangement
- Pattern-matching and rule-following in structured text
- Transposition, bassline generation, rhythm variation, pattern continuation

### LLM is Weak At (Tracker Sheet)

- **Rhythmic arithmetic** — triplet placement, precise row counting
- **Long-range coherence** — good over 16 rows, may lose thread over 64
- **Effect code precision** — may hallucinate plausible but invalid codes

**Mitigation:** Always validate AI output programmatically before it reaches the player. The format is regular enough for a parser to reject malformed output and retry.

### LLM is Weak At (Samples)

- Generating precise numerical waveform data (raw byte arrays)
- Direct audio-to-emotion mapping from numbers

**Mitigation:** Use harmonic coefficient representation. The model sets 4–8 float values; the client reconstructs the waveform. This transforms the task from arithmetic to concept selection.

## Decision-Making Principles

When facing implementation choices, apply these principles (derived from the PM's thinking):

1. **Constraints are features** — Every limitation (4 channels, 8-bit samples, 32 sample slots) exists to enable AI integration and retro aesthetic simultaneously. Don't relax them without strong justification.
2. **AI sees text, never audio** — The AI operates on symbolic/textual representations only. Any audio understanding must be mediated by computed descriptors or models that translate audio to text.
3. **The tracker works without AI** — Never create a dependency where the core tracker functionality requires an AI connection.
4. **Validate AI output** — Never trust AI-generated tracker data without programmatic validation. Parse it, check it, reject if malformed.
5. **Retro is the brand** — Lo-fi, 8-bit, chiptune aesthetics are the product identity. Modern quality tools (EQ, compression) serve the lo-fi genre, not the pursuit of hi-fi.
6. **Simple first, extend later** — v1 is deliberately minimal. The architecture should accommodate future features (sample editing, CLAP integration, export) without implementing them.
