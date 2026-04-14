# Grid Editor — Input Handling

## Event Sources

```mermaid
flowchart LR
    CLICK["canvas 'click' event"] --> OCC["onCanvasClick(e)"]
    KEY["canvas 'keydown' event"] --> OK["onKey(e)"]
    BTN["Play button (in main.js)"] --> TP["togglePlay()"]
    BPM["BPM input (in main.js)"] --> SB["setBpm(v)"]
```

Both event listeners are registered in `initGrid()`. The canvas has `tabIndex=0` so it can receive keyboard focus.

## onCanvasClick — Full Flow

```mermaid
flowchart TD
    E["click event"] --> FOCUS["canvas.focus()"]
    FOCUS --> AUDIO{"getAudioCtx<br/>exists?"}
    AUDIO -->|yes| INIT_AUDIO["audioCtx = getAudioCtx()<br/>(ensures AudioContext on user gesture)"]
    AUDIO -->|no| PLAYING
    INIT_AUDIO --> PLAYING{"state == playing?"}
    PLAYING -->|yes| RETURN["return (no editing)"]
    PLAYING -->|no| HIT["y = clientY − rect.top"]
    HIT --> HDR{"y < HDR_H (28)?"}
    HDR -->|yes| RETURN2["return (header click)"]
    HDR -->|no| ROW["row = floor((y − 28) / 28)"]
    ROW --> VALID{"0 ≤ row < 16?"}
    VALID -->|yes| SEL["selRow = row"]
    VALID -->|no| NOOP["(no-op)"]
    SEL --> DRAW["draw()"]
```

## onKey — Complete Dispatch Tree

```mermaid
flowchart TD
    E["keydown event"] --> SPACE{"code == 'Space'?"}
    SPACE -->|yes| PREVENT1["preventDefault()"]
    PREVENT1 --> TOGGLE["togglePlay()"]
    TOGGLE --> DONE1["return"]

    SPACE -->|no| PLAYING{"state == playing?"}
    PLAYING -->|yes| DONE2["return (no editing)"]
    PLAYING -->|no| MOD{"ctrl/alt/meta<br/>held?"}
    MOD -->|yes| DONE3["return (pass to browser)"]
    MOD -->|no| DEL{"Delete or<br/>Backspace?"}

    DEL -->|yes| CLEAR["pattern[selRow].note = null"]
    CLEAR --> ADV1["selRow = min(selRow+1, 15)"]
    ADV1 --> DRAW1["draw()"]

    DEL -->|no| UP{"ArrowUp?"}
    UP -->|yes| MU["selRow = max(0, selRow−1)"]
    MU --> DRAW2["draw()"]

    UP -->|no| DOWN{"ArrowDown?"}
    DOWN -->|yes| MD["selRow = min(15, selRow+1)"]
    MD --> DRAW3["draw()"]

    DOWN -->|no| PLUS{"'+' or<br/>NumpadAdd?"}
    PLUS -->|yes| OUP["setOctave(octave+1)"]

    PLUS -->|no| MINUS{"'−' or<br/>NumpadSubtract?"}
    MINUS -->|yes| ODOWN["setOctave(octave−1)"]

    MINUS -->|no| NOTE{"key ∈ KEY_LO<br/>or KEY_HI?"}
    NOTE -->|yes| CALC["semi = lookup(key)<br/>octOff = 0 or 1"]
    CALC --> OCT_CHECK{"octave+octOff<br/>∈ [1,8]?"}
    OCT_CHECK -->|yes| SET_NOTE["noteStr = 'C#-4'<br/>pattern[selRow].note = noteStr"]
    SET_NOTE --> PREVIEW["previewNote(noteStr)"]
    PREVIEW --> ADV2["selRow = min(selRow+1, 15)"]
    ADV2 --> DRAW4["draw()"]
    OCT_CHECK -->|no| DONE4["(no-op)"]
    NOTE -->|no| DONE5["(unhandled key)"]
```

## FT2 Keyboard Layout

The note input maps physical keyboard positions to semitones, mimicking FastTracker 2:

```
┌─────────────────────────────────────────────────────────┐
│  UPPER ROW (KEY_HI) — octave + 1                       │
│                                                         │
│     2    3         5    6    7                           │
│   C# D#        F# G# A#                                │
│  Q    W    E    R    T    Y    U                        │
│  C    D    E    F    G    A    B                        │
│                                                         │
│  LOWER ROW (KEY_LO) — base octave                      │
│                                                         │
│     S    D         G    H    J                          │
│   C# D#        F# G# A#                                │
│  Z    X    C    V    B    N    M                        │
│  C    D    E    F    G    A    B                        │
└─────────────────────────────────────────────────────────┘
```

### Semitone Mapping Table

| Semitone | Name | KEY_LO | KEY_HI |
|----------|------|--------|--------|
| 0 | C | `z` | `q` |
| 1 | C# | `s` | `2` |
| 2 | D | `x` | `w` |
| 3 | D# | `d` | `3` |
| 4 | E | `c` | `e` |
| 5 | F | `v` | `r` |
| 6 | F# | `g` | `5` |
| 7 | G | `b` | `t` |
| 8 | G# | `h` | `6` |
| 9 | A | `n` | `y` |
| 10 | A# | `j` | `7` |
| 11 | B | `m` | `u` |

### Note String Construction

```
octOff = 0 (KEY_LO) or 1 (KEY_HI)
o = octave + octOff
noteStr = SEM_NAMES[semi] + "-" + o

Example: octave=4, press 't' (KEY_HI, semi=7=G)
  → o = 4+1 = 5
  → noteStr = "G-5"
```

## Side Effects Summary

| Input | Mutates | Calls | Fires onChange? |
|-------|---------|-------|-----------------|
| Click row | `selRow` | `draw()` | No |
| Space | FSM state | `togglePlay()` → `startPlay/stopPlay` | Yes |
| Arrow Up/Down | `selRow` | `draw()` | No |
| Delete/Backspace | `pattern[selRow].note`, `selRow` | `draw()` | No |
| Note key | `pattern[selRow].note`, `selRow` | `previewNote()`, `draw()` | No |
| +/− | `octave` | `setOctave()` | Yes (via `setOctave`) |

### Note: Missing onChange Calls

Currently, editing notes (entering/deleting) does **not** call `fireChange()`. Only `togglePlay()` and `setOctave()` do. If you add features that depend on `onChange` for pattern edits, you'll need to add `fireChange()` calls to the note input and delete handlers.
