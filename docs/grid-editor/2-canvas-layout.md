# Grid Editor — Canvas Layout & Coordinate System

All coordinates are in **logical pixels** (CSS px). The canvas is scaled by `devicePixelRatio` for sharp rendering, but all drawing math uses logical units.

## Canvas Dimensions

```
W = 280 px  (total width)
H = HDR_H + PATTERN_LEN × ROW_H = 28 + 16 × 28 = 476 px
```

## Stopped View — Full Layout

```
 x=0       x=44 (ROW_NUM_W)                              x=280 (W)
 │          │                                              │
 ├──────────┼──────────────────────────────────────────────┤ ─ y=0
 │  "ROW"   │  "NOTE"                                      │ HDR_H = 28px
 │  hdrBg   │  hdrTxt                                      │   (header)
 ├──────────┼──────────────────────────────────────────────┤ ─ y=28
 │ 00 ······│· C-4 ·······································│ ← beat line (row%4==0)
 │ 01       │  ---                                         │   ROW_H = 28px
 │ 02       │  E-4                                         │
 │ 03       │  ---                                         │
 ├──────────┼──────────────────────────────────────────────┤ ← beat line
 │ 04       │  G-4                                         │
 │ 05       │  ---                                         │
 │ 06       │  ---                                         │
 │ 07       │  ---                                         │
 ├──────────┼──────────────────────────────────────────────┤ ← beat line
 │ 08       │  ---                                         │
 │ 09       │  ---                                         │
 │ 0A       │  ---                                         │
 │ 0B       │  ---                                         │
 ├──────────┼──────────────────────────────────────────────┤ ← beat line
 │ 0C       │  ---                                         │
 │ 0D       │  ---                                         │
 │ 0E       │  ---                                         │
 │ 0F       │  ---                                         │
 └──────────┴──────────────────────────────────────────────┘ ─ y=476 (H)

 │← 44px →│←──────────── 236px (CELL_W) ────────────────→│
```

## Row Anatomy (single row)

```
 x=0                  x=44                                x=280
 ┌───────────────────┬────────────────────────────────────┐ ─ y
 │   "0A"            │    "C-4"  or  "---"                │
 │   rowNum text     │    note text (green) / empty (gray)│   28px
 │   at x=10         │    at x = CELL_X+10 = 54          │   (ROW_H)
 └───────────────────┼────────────────────────────────────┘ ─ y + ROW_H
                     │
               column divider
               (COL.div #222)
```

### Row Background Colors

| Condition | Color |
|-----------|-------|
| Currently playing row | `COL.playRow` — yellow tint `rgba(255,204,0,0.15)` |
| Selected (cursor) | `COL.sel` — white tint `rgba(255,255,255,0.12)` |
| Even row index | `COL.rowEven` — `#0c0c22` |
| Odd row index | `COL.rowOdd` — `#0a0a1c` |

### Selection Border (stopped view only)

```
 x=46 (CELL_X+2)                              x=278 (CELL_X+CELL_W-2)
 ┌────────────────────────────────────────────┐ ─ y + 1.5
 │  ┌──────────────────────────────────────┐  │
 │  │  white 1.5px border (COL.selBdr)     │  │   ROW_H - 3 px tall
 │  │  around note cell only               │  │
 │  └──────────────────────────────────────┘  │
 └────────────────────────────────────────────┘ ─ y + ROW_H - 1.5
```

## Playing View — Scrolling Layout

During playback, the grid scrolls vertically. The **now-marker** is fixed at `NOW_Y`:

```
 y=0   ┌──────────────────────────────────────────────────┐
       │              HEADER (fixed)                       │
 y=28  ├──────────────────────────────────────────────────┤ ← clip rect starts
       │  Rows scrolling upward ↑                          │
       │                                                   │
       │  Row intRow-5  ← about to scroll off top          │
       │  Row intRow-4                                     │
       │  Row intRow-3                                     │
       │  Row intRow-2                                     │
       │  Row intRow-1                                     │
y=168  ╠══════════════════════════════════════════════════╣ ← NOW_Y (HDR_H + 5×ROW_H)
       ║  Row intRow    ← CURRENT ROW (playRow highlight) ║   now-marker line
       ╠══════════════════════════════════════════════════╣   (yellow, 2px, glow)
       │  Row intRow+1                                     │
       │  Row intRow+2                                     │
       │  ...                                              │
       │  Rows scrolling upward ↑                          │
y=476  └──────────────────────────────────────────────────┘ ← clip rect ends

       Visible range: i = -6 to +12 (relative to intRow)
       Sub-pixel scroll: rows offset by -frac × ROW_H
```

### Scroll Math

```
elapsed  = audioCtx.currentTime − songStart
totalRows = elapsed / rowDur()
curRow    = totalRows % PATTERN_LEN          (with wrapping for negatives)
intRow    = floor(curRow)                    (which pattern row is "now")
frac      = curRow − intRow                  (0.0–1.0, sub-row scroll offset)

Each visible row i (from -6 to +12):
  ri = (intRow + i) % PATTERN_LEN            (wrap to pattern)
  y  = NOW_Y + (i − frac) × ROW_H           (screen position)
```

## Click Hit-Testing (stopped view only)

```
clickY = e.clientY − canvas.getBoundingClientRect().top

if clickY < HDR_H → ignore (header area)
row = floor((clickY − HDR_H) / ROW_H)
if row ∈ [0, PATTERN_LEN) → selRow = row
```
