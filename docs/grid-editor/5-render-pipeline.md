# Grid Editor — Render Pipeline

## Top-Level Render Flow

```mermaid
flowchart TD
    TRIGGER{{"Trigger"}}

    TRIGGER -->|"stopped: user action<br/>(click, key, init)"| DRAW
    TRIGGER -->|"playing: rAF loop<br/>(~60fps)"| RL["renderLoop()"]
    RL --> DRAW

    DRAW["draw()"]
    DRAW --> CLEAR["fillRect(0,0, W,H)<br/>with COL.bg #0a0a1e"]
    CLEAR --> HDR["drawHeader()"]
    HDR --> BRANCH{{"machine state?"}}
    BRANCH -->|stopped| SV["drawStoppedView()"]
    BRANCH -->|playing| PV["drawPlayingView()"]

    SV --> DR_S["drawRow() × 16<br/>fixed positions"]
    PV --> CLIP["ctx.clip() to content area"]
    CLIP --> DR_P["drawRow() × ~18<br/>scrolling positions"]
    DR_P --> RESTORE["ctx.restore()"]
    RESTORE --> MARKER["Draw now-marker line<br/>yellow, 2px, glow"]
```

## drawRow() — Layer-by-Layer

Each row is painted in this exact order (later layers overdraw earlier ones):

```mermaid
flowchart TD
    L1["1. Background fill<br/>Full row width (0..W)"]
    L2["2. Beat separator line<br/>Only if ri % 4 == 0"]
    L3["3. Row number text<br/>'0A' at x=10"]
    L4["4. Column divider<br/>Vertical line at x=43.5"]
    L5["5. Note text<br/>'C-4' or '---' at x=54"]
    L6["6. Selection border<br/>White rect around note cell<br/>(stopped view only)"]

    L1 --> L2 --> L3 --> L4 --> L5 --> L6
```

### Layer Details

```
LAYER 1 — Background
┌──────────────────────────────────────────────────────┐
│  Priority: isCurrent > isSel > even/odd              │
│  isCurrent → COL.playRow (yellow tint, playing only) │
│  isSel     → COL.sel (white tint, stopped only)      │
│  even row  → COL.rowEven  #0c0c22                    │
│  odd row   → COL.rowOdd   #0a0a1c                    │
└──────────────────────────────────────────────────────┘

LAYER 2 — Beat separator (every 4 rows: 00, 04, 08, 0C)
───────────────────────────────────── full width, y+0.5
  COL.beatLn #2a2a44, 1px

LAYER 3 — Row number
  "0A"  at (10, y + ROW_H/2)
  Font: 12px monospace
  Color: COL.rowNumBt #777 (beat rows) / COL.rowNum #555 (other)

LAYER 4 — Column divider  
  Vertical line at x = ROW_NUM_W - 0.5 = 43.5
  COL.div #222, 1px

LAYER 5 — Note text
  "C-4" or "---"  at (CELL_X+10, y + ROW_H/2) = (54, ...)
  Font: 13px monospace
  Color: COL.note #00dd66 (has note) / COL.empty #333 (empty)

LAYER 6 — Selection border (only when isSel=true)
  strokeRect at (CELL_X+2, y+1.5, CELL_W-4, ROW_H-3)
  COL.selBdr #ffffff, 1.5px
```

## Stopped View vs Playing View

```
┌─────────────────────┬──────────────────────────────────┐
│   STOPPED VIEW      │   PLAYING VIEW                   │
├─────────────────────┼──────────────────────────────────┤
│ Trigger: user action│ Trigger: rAF loop (~60fps)       │
│ 16 rows, fixed pos  │ ~18 rows, scrolling              │
│ selRow highlighted   │ No selection                     │
│ No clip region       │ Clipped to HDR_H..H             │
│ No marker line       │ Yellow marker at NOW_Y=168       │
│ drawRow(i, y,        │ drawRow(ri, y,                   │
│   false, i==selRow)  │   i==0, false)                   │
│                      │ Sub-pixel scroll via frac        │
└─────────────────────┴──────────────────────────────────┘
```

## Playing View Scroll: Which Rows Are Visible?

```mermaid
flowchart TD
    A["elapsed = currentTime − songStart"] --> B["totalRows = elapsed / rowDur()"]
    B --> C["curRow = totalRows mod 16"]
    C --> D["intRow = floor(curRow)<br/>frac = curRow − intRow"]
    D --> E["Loop i = −6 to +12"]
    E --> F["ri = (intRow + i) mod 16"]
    F --> G["y = NOW_Y + (i − frac) × ROW_H"]
    G --> H{"y+ROW_H < HDR_H<br/>or y > H?"}
    H -->|yes| SKIP["skip (off-screen)"]
    H -->|no| DRAW_ROW["drawRow(ri, y, i==0, false)"]
```

### Concrete Example (intRow=3, frac=0.5)

```
 i   ri   y (px)           visible?
 -6   13   NOW_Y + (-6.5)×28 = -14      barely (clipped by header)
 -5   14   NOW_Y + (-5.5)×28 =  14      barely (clipped by header)
 -4   15   NOW_Y + (-4.5)×28 =  42      yes
 -3    0   NOW_Y + (-3.5)×28 =  70      yes
 -2    1   NOW_Y + (-2.5)×28 =  98      yes
 -1    2   NOW_Y + (-1.5)×28 = 126      yes
  0    3   NOW_Y + (-0.5)×28 = 154      yes ← CURRENT (playRow)
  1    4   NOW_Y + ( 0.5)×28 = 182      yes
  2    5   NOW_Y + ( 1.5)×28 = 210      yes
 ...
 10   13   NOW_Y + ( 9.5)×28 = 434      yes
 11   14   NOW_Y + (10.5)×28 = 462      yes
 12   15   NOW_Y + (11.5)×28 = 490      no (below H=476)
```

## Header Rendering

```
 ┌──────────────────────────────────────────────────────┐ y=0
 │  "ROW"          "NOTE"                               │
 │  at (8, 14)     at (54, 14)                          │
 │  COL.hdrBg #0f0f2a, COL.hdrTxt #888                 │
 │  font: bold 11px monospace                           │
 ├──────────────────────────────────────────────────────┤ y=27.5
   divider line (COL.div #222, 1px)                       y=28
```

## When Does draw() Get Called?

| Situation | Caller |
|-----------|--------|
| Module init | `initGrid()` → `draw()` |
| Row click (stopped) | `onCanvasClick()` → `draw()` |
| Note entered/deleted | `onKey()` → `draw()` |
| Arrow key navigation | `onKey()` → `draw()` |
| During playback | `renderLoop()` → `draw()` (~60fps via rAF) |
| Playback stops | `togglePlay()` → `draw()` (one final frame) |
