# AI Tracker — User Manual

> This document describes the v1 user experience. It serves two purposes: (1) a reference for end users, and (2) a binding UI specification for implementation. If the manual says the user can do something, the app must support it.

---

## 1. What Is AI Tracker?

AI Tracker is a browser-based music tracker inspired by FastTracker 2. You compose music by entering notes, samples, and effects into a grid — one row per time step, one column per channel. The app plays back your composition using short 8-bit audio samples.

What makes AI Tracker different: an AI assistant reads and writes the same tracker format you do. You can ask it to compose a bassline, vary a rhythm, continue a melody, or explain what a pattern does — and it responds with both text and tracker data you can accept into your song.

The retro 8-bit sound is deliberate. Short samples, 4 channels, hex notation — these constraints are the style.

---

## 2. Screen Layout

When you open AI Tracker, you see one screen with three areas:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  AI Tracker                                              [Song Name]   │
├────────────────────────────────────────────────────┬────────────────────┤
│                                                    │                    │
│                   TRACKER GRID                     │     AI CHAT        │
│                                                    │                    │
│  ROW │ CH1          CH2          CH3          CH4  │  [message history] │
│  ────┼────────────┼────────────┼────────────┼───── │                    │
│   00 │ C-4 01 40 .│ --- .. .. .│ --- .. .. .│ ... │                    │
│   01 │ --- .. .. .│ F#4 03 28 .│ --- .. .. .│ ... │                    │
│   02 │ --- .. .. .│ --- .. .. .│ C-2 04 38 .│ ... │                    │
│   03 │ E-4 01 40 .│ --- .. .. .│ --- .. .. .│ ... │  [text input]      │
│   .. │            │            │            │      │  [Send]            │
│                                                    │                    │
├────────────────────────────────────────────────────┼────────────────────┤
│  ▶ Play   ■ Stop  │ BPM: [125]  │ Oct: 4  │ Pat: 00/08  │ Smp: 01   │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Tracker Grid (left)

The main working area. A canvas-rendered grid showing one pattern at a time.

- **Row numbers** on the left, in hex (`00`–`3F` for 64 rows).
- **4 channel columns** (CH1–CH4), each showing note data per row.
- **Beat lines** — every 4 rows, a subtle horizontal line marks the beat.
- **Cursor** — a highlighted cell showing your current editing position. You move it with arrow keys.
- **Playback marker** — during playback, a horizontal line scrolls through the pattern showing the current position.

### 2.2 AI Chat Panel (right)

A chat interface for communicating with the AI assistant.

- **Message history** — scrollable list of your messages and AI responses. AI responses may include tracker data (patterns, note suggestions) alongside text.
- **Text input** — type your message or instruction here.
- **Send button** — submits your message along with the current tracker state to the AI.

When the AI responds with tracker data, you will see it as a formatted pattern snippet in the chat. You can choose to apply it to your song or ignore it.

### 2.3 Transport Bar (bottom)

Controls for playback and global settings:

| Control | What it does |
|---------|-------------|
| **▶ Play** | Starts playback from the beginning of the current pattern. Loops. |
| **■ Stop** | Stops playback and returns to edit mode. |
| **BPM** | Tempo in beats per minute (30–300). Editable number field. |
| **Oct** | Current octave for note input (1–8). Shown as a number. |
| **Pat** | Current pattern number / total patterns. Click to switch patterns. |
| **Smp** | Currently selected sample ID (hex). Click to change which sample new notes use. |

---

## 3. The Tracker Grid in Detail

### 3.1 Cell Format

Each cell in the grid contains four fields:

```
C-4 01 40 A08
│   │  │  │
│   │  │  └── Effect: command + parameter (3 hex chars)
│   │  └───── Volume: 00 (silent) to 40 (full) (2 hex chars)
│   └──────── Sample ID: 00–1F (2 hex chars)
└──────────── Note: C-0 through B-9 (3 chars)
```

An empty cell shows `--- .. .. ...` — meaning no note is triggered on that row for that channel.

### 3.2 Notes

Notes use the format `X-O` or `X#O`, where:
- `X` = note name: C, C#, D, D#, E, F, F#, G, G#, A, A#, B
- `O` = octave: 0–9

Only sharp notation is used (C#, not Db) — matching the FastTracker 2 convention.

Middle C is `C-4`. Concert A is `A-4` (440 Hz).

The practical note range is `C-1` through `B-8`.

### 3.3 Samples

You select a sample by its hex ID (`00`–`1F`, 32 samples total). The currently selected sample is shown in the transport bar and is automatically assigned to new notes you enter.

v1 ships with 32 pre-defined samples. You cannot load, edit, or create new samples — the built-in set is the instrument palette.

### 3.4 Volume

Volume is a hex value from `00` (silent) to `40` (maximum, decimal 64). Leaving it empty (`..`) uses the default maximum volume.

### 3.5 Effects

Effects are 3-character hex codes: one command character followed by two parameter characters.

Example: `A08` means command `A` (volume slide) with parameter `08`.

The supported effect commands will be listed in-app. Only a core subset of FastTracker 2 effects is supported.

### 3.6 Patterns and Song Structure

- A **pattern** is a grid of 64 rows × 4 channels.
- A **song** is a sequence of patterns, defined by an **order list**.
- The order list is a sequence of pattern numbers that determines playback order. The same pattern can appear multiple times in the order list.

Example order list: `00 00 01 02 01 03` — plays pattern 0 twice, then 1, 2, 1 again, then 3.

---

## 4. Editing

### 4.1 Navigation

| Key | Action |
|-----|--------|
| **↑ / ↓** | Move cursor up / down one row |
| **← / →** | Move cursor left / right between fields (note → sample → volume → effect) and between channels |
| **Tab** | Move cursor to the next channel |
| **Shift+Tab** | Move cursor to the previous channel |
| **Page Up** | Move cursor up 16 rows |
| **Page Down** | Move cursor down 16 rows |
| **Home** | Jump to row 00 |
| **End** | Jump to last row (3F) |

### 4.2 Note Entry

Notes are entered using the keyboard, following the FastTracker 2 piano layout:

```
 Upper row (current octave + 1):
      2    3         5    6    7
    C# D#        F# G# A#
   Q    W    E    R    T    Y    U
   C    D    E    F    G    A    B

 Lower row (current octave):
      S    D         G    H    J
    C# D#        F# G# A#
   Z    X    C    V    B    N    M
   C    D    E    F    G    A    B
```

When you press a note key:
1. The note is written to the current cell (with the currently selected sample and default volume).
2. A short preview blip plays so you can hear the note.
3. The cursor advances down one row.

### 4.3 Octave Selection

| Key | Action |
|-----|--------|
| **+ / Numpad +** | Increase octave (max 8) |
| **- / Numpad -** | Decrease octave (min 1) |

The lower keyboard row enters notes at the current octave. The upper row enters notes one octave higher. So at octave 4, the lower row produces `C-4` through `B-4`, and the upper row produces `C-5` through `B-5`.

### 4.4 Editing Values

When the cursor is on a **note** field, use the piano keys described above.

When the cursor is on a **sample**, **volume**, or **effect** field, type hex characters (`0`–`9`, `A`–`F`) to enter values. Characters fill left to right; when all digits are entered the cursor advances.

### 4.5 Deleting

| Key | Action |
|-----|--------|
| **Delete** | Clear the current field and advance cursor down |
| **Backspace** | Clear the current field and advance cursor down |

### 4.6 Editing Is Disabled During Playback

While the song is playing, the grid is in playback mode: the rows scroll past the play marker, the cursor is hidden, and keyboard input is ignored (except Space to stop). Click Stop or press Space to return to edit mode.

---

## 5. Playback

### 5.1 Starting and Stopping

| Action | Method |
|--------|--------|
| **Play** | Press **Space** or click the **▶ Play** button |
| **Stop** | Press **Space** or click the **■ Stop** button |

Playback starts from the beginning of the current pattern and loops. When you stop, you return to the editing view.

### 5.2 What You See During Playback

The grid switches to a scrolling view:
- Rows scroll upward past a fixed horizontal **now-marker**.
- The current row is highlighted.
- Upcoming rows are visible below the marker; past rows scroll above and off-screen.

### 5.3 How Notes Play

When the playback engine reaches a row with a note:
1. It triggers the sample at the specified pitch.
2. The note sustains until the next note in the same channel (or until the pattern loops).
3. A short fade-in and fade-out prevents clicks at note boundaries.

Volume and effect columns modify how the note sounds according to their values.

Empty rows (`---`) do not trigger new notes — the previous note in that channel continues sustaining.

### 5.4 Tempo

Tempo is set in BPM (beats per minute). One beat = 4 rows.

| BPM | Time per row | Time per beat | 64 rows (1 pattern) |
|-----|-------------|---------------|---------------------|
| 120 | 125 ms | 500 ms | 8.0 s |
| 140 | ~107 ms | ~429 ms | ~6.9 s |
| 80 | 187.5 ms | 750 ms | 12.0 s |

---

## 6. Samples

### 6.1 The Sample Bank

AI Tracker ships with 32 built-in samples (ID `00` through `1F`). These are short, 8-bit, single-cycle or short waveforms — the same kind of samples that defined the Amiga tracker sound.

Each sample has:
- A **name** (e.g., "Square Wave", "Saw Bass", "Noise Hit")
- A **base note** — the pitch at which the sample plays at its original speed
- A **waveform** — the raw audio data

### 6.2 Choosing a Sample

The currently selected sample ID is shown in the transport bar. To change it:
- Click the **Smp** display in the transport bar and select from the list, or
- Use a keyboard shortcut (to be defined) to cycle through samples.

When you enter a note, it is automatically tagged with the currently selected sample ID.

### 6.3 Sample Sound Character

Because samples are 8-bit and very short (often a single wave cycle looped), the sound is inherently lo-fi and retro. This is the intended aesthetic. The pitch of any sample can be shifted across the full note range — a bass sample can play high notes and vice versa, producing characteristic tracker-style timbral shifts.

---

## 7. AI Assistant

### 7.1 What the AI Can Do

The AI assistant reads the tracker format — it understands notes, rhythm, samples, and effects. You can ask it to:

- **Compose**: "Write a 4-bar drum pattern in CH1 and CH2"
- **Modify**: "Make the bassline in CH3 more syncopated"
- **Continue**: "Continue this melody for another 16 rows"
- **Explain**: "What key is this pattern in?"
- **Suggest**: "This sounds empty — what should I add?"
- **Transpose**: "Move everything up a minor third"

### 7.2 How to Use It

1. Type your message in the chat input.
2. Press **Send** (or Enter).
3. The AI receives your message along with the current pattern, order list, and sample bank metadata.
4. The AI responds with text (explanation, suggestions) and optionally with tracker data (a full or partial pattern).

### 7.3 Applying AI Suggestions

When the AI responds with tracker data, it appears as a formatted pattern snippet in the chat. You can:

- **Apply** — replaces the current pattern (or merges into it) with the AI's suggestion.
- **Ignore** — leave your pattern unchanged.

AI output is always validated before it can be applied. If the AI produces invalid notes, out-of-range values, or malformed effect codes, those cells are rejected and you are informed.

### 7.4 What the AI Cannot Do

- **Hear your music** — the AI works with symbolic data (notes, sample IDs), not audio. It knows sample 01 is named "Square Wave" but does not hear it.
- **Modify samples** — the AI composes music, it does not create or edit audio waveforms.
- **Control mixing** — EQ, compression, volume balance between channels are your decisions.

### 7.5 AI Requires Internet

The tracker works fully offline for composing and playing music. The AI chat feature requires an internet connection. If the connection is unavailable, the chat panel shows a status message and all other features continue to work.

---

## 8. Song Management

### 8.1 Patterns

Switch between patterns using the **Pat** control in the transport bar. You can:
- Click left/right arrows to navigate between patterns.
- Type a pattern number directly.

New patterns start empty (all `--- .. .. ...`).

### 8.2 Order List

The order list defines the sequence in which patterns play during full-song playback. Edit the order list to arrange your song structure:

- Add a pattern to the end of the list.
- Remove a pattern from the list.
- Reorder entries by dragging or using up/down controls.

The exact UI for order list editing will be minimal — this is a composition tool, not a DAW.

### 8.3 Save and Load

AI Tracker saves songs in a custom binary format (`.ait` file).

- **Save**: Downloads the current song (all patterns, the order list, and which samples are used) as a file to your computer.
- **Load**: Open a previously saved `.ait` file to continue working.

There is no cloud storage, no accounts, no auto-save. You manage your files locally.

---

## 9. Keyboard Reference

### Navigation

| Key | Action |
|-----|--------|
| ↑ / ↓ | Move cursor one row up / down |
| ← / → | Move cursor between fields / channels |
| Tab / Shift+Tab | Next / previous channel |
| Page Up / Page Down | Move 16 rows up / down |
| Home / End | Jump to top / bottom of pattern |

### Note Entry (FT2 piano layout)

| Key | Note (lower octave) | Key | Note (upper octave) |
|-----|-------------------|-----|-------------------|
| Z | C | Q | C |
| S | C# | 2 | C# |
| X | D | W | D |
| D | D# | 3 | D# |
| C | E | E | E |
| V | F | R | F |
| G | F# | 5 | F# |
| B | G | T | G |
| H | G# | 6 | G# |
| N | A | Y | A |
| J | A# | 7 | A# |
| M | B | U | B |

### Controls

| Key | Action |
|-----|--------|
| Space | Play / Stop toggle |
| + / Numpad + | Octave up |
| - / Numpad - | Octave down |
| Delete / Backspace | Clear current field |

### Hex Entry (sample, volume, effect fields)

| Keys | Action |
|------|--------|
| 0–9, A–F | Enter hex digit into current field |

---

## 10. Limitations (v1)

These are deliberate design choices, not bugs:

| Limitation | Reason |
|-----------|--------|
| 4 channels only | Classic MOD standard; keeps AI context manageable |
| 32 samples, all pre-defined | Entire sample bank fits in one AI prompt |
| 8-bit sample quality | Retro aesthetic; matches Amiga ProTracker |
| No sample editing | v1 scope — planned for future versions |
| No WAV/MOD export | v1 scope — planned for future versions |
| No mixer/EQ/compression | v1 scope — planned for future versions |
| AI requires internet | LLM runs server-side |
| No undo/redo | v1 scope — planned for future versions |
