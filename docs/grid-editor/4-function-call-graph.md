# Grid Editor — Function Call Graph

## Complete Call Graph

```mermaid
flowchart TD
    subgraph "Public API (exported)"
        initGrid["initGrid(canvasEl, options)"]
        togglePlay["togglePlay()"]
        getState["getState()"]
        getBpm["getBpm()"]
        getOctave["getOctave()"]
        setBpm["setBpm(v)"]
        setOctave["setOctave(v)"]
    end

    subgraph "Playback"
        startPlay["startPlay()"]
        stopPlay["stopPlay()"]
        rowDur["rowDur()"]
    end

    subgraph "Scheduler"
        schedule["schedule()"]
        schedNote["schedNote(noteStr, startT, row, rd)"]
        previewNote["previewNote(noteStr)"]
    end

    subgraph "Rendering"
        renderLoop["renderLoop()"]
        draw["draw()"]
        drawHeader["drawHeader()"]
        drawStoppedView["drawStoppedView()"]
        drawPlayingView["drawPlayingView()"]
        drawRow["drawRow(ri, y, isCurrent, isSel)"]
    end

    subgraph "Input"
        onCanvasClick["onCanvasClick(e)"]
        onKey["onKey(e)"]
    end

    subgraph "Util"
        fireChange["fireChange()"]
    end

    subgraph "External Imports"
        calcRate["calculatePlaybackRate()"]
        getSample["getSample()"]
        getAudioBuf["getAudioBuffer()"]
        createMach["createMachine()"]
    end

    %% initGrid connections
    initGrid --> createMach
    initGrid --> draw
    initGrid -.->|"registers"| onCanvasClick
    initGrid -.->|"registers"| onKey

    %% togglePlay
    togglePlay --> draw
    togglePlay --> fireChange

    %% State machine triggers
    togglePlay -.->|"machine.send"| startPlay
    togglePlay -.->|"machine.send"| stopPlay

    %% startPlay
    startPlay --> schedule
    startPlay --> renderLoop

    %% stopPlay
    stopPlay -.->|"clearInterval"| schedule
    stopPlay -.->|"cancelAnimationFrame"| renderLoop

    %% schedule
    schedule --> rowDur
    schedule --> schedNote

    %% schedNote
    schedNote --> getSample
    schedNote --> getAudioBuf
    schedNote --> calcRate

    %% previewNote
    previewNote --> getSample
    previewNote --> getAudioBuf
    previewNote --> calcRate

    %% renderLoop
    renderLoop --> draw

    %% draw
    draw --> drawHeader
    draw --> drawStoppedView
    draw --> drawPlayingView
    drawStoppedView --> drawRow
    drawPlayingView --> drawRow
    drawPlayingView --> rowDur

    %% Input handlers
    onCanvasClick --> draw
    onKey --> togglePlay
    onKey --> draw
    onKey --> setOctave
    onKey --> previewNote

    %% setOctave
    setOctave --> fireChange
```

## Function Index

| Function | Type | Lines | Purpose |
|----------|------|-------|---------|
| `initGrid` | export | ~30 | Setup canvas, pattern, state machine, event listeners |
| `togglePlay` | export | ~4 | Send PLAY/STOP to state machine |
| `getState` | export | 1 | Return current FSM state |
| `getBpm` | export | 1 | Return BPM value |
| `getOctave` | export | 1 | Return current octave |
| `setBpm` | export | 1 | Clamp and set BPM (30–300) |
| `setOctave` | export | 1 | Clamp and set octave (1–8), fire change |
| `rowDur` | private | 1 | Calculate seconds per row: `60 / (bpm × 4)` |
| `startPlay` | private | ~10 | Init scheduler + render loop |
| `stopPlay` | private | ~10 | Tear down scheduler + render loop + audio nodes |
| `schedule` | private | ~15 | Lookahead: schedule notes within 100ms horizon |
| `schedNote` | private | ~40 | Create BufferSource + GainNode for one note |
| `previewNote` | private | ~20 | Play 250ms blip of a note (editing feedback) |
| `renderLoop` | private | 2 | rAF loop calling draw() |
| `draw` | private | ~5 | Clear canvas, header, branch to stopped/playing view |
| `drawHeader` | private | ~10 | Render "ROW" / "NOTE" header bar |
| `drawStoppedView` | private | ~3 | Render all 16 rows statically |
| `drawPlayingView` | private | ~20 | Render scrolling rows around now-marker |
| `drawRow` | private | ~30 | Render one row: bg, beat line, row#, divider, note, selection |
| `onCanvasClick` | private | ~10 | Click → acquire audio ctx, select row |
| `onKey` | private | ~40 | Keyboard dispatch: Space, arrows, delete, +/-, note keys |
| `fireChange` | private | 1 | Call external onChange callback |

## Module State Variables

```mermaid
flowchart LR
    subgraph "Canvas"
        canvas["canvas"]
        ctx["ctx (2d context)"]
        dpr["dpr (devicePixelRatio)"]
    end

    subgraph "Audio"
        audioCtx["audioCtx"]
        getAudioCtx["getAudioCtx (factory fn)"]
    end

    subgraph "Editor State"
        pattern["pattern[16] = {note}"]
        selRow["selRow (0–15)"]
        octave["octave (1–8)"]
        bpm["bpm (30–300)"]
    end

    subgraph "Playback State"
        machine["machine (FSM)"]
        songStart["songStart"]
        loopStart["loopStart"]
        nextSchedRow["nextSchedRow"]
        schedId["schedId (interval)"]
        rafId["rafId (rAF)"]
        nodes["nodes[] = {src, gain}"]
    end

    subgraph "Callback"
        onChange["onChange"]
    end
```

## Dependency on External Modules

```mermaid
flowchart LR
    GE["grid-editor.js"]
    NU["note-util.js"]
    SB["sample-bank.js"]
    SM["state-machine.js"]

    GE -->|"calculatePlaybackRate()"| NU
    GE -->|"getSample(), getAudioBuffer()"| SB
    GE -->|"createMachine()"| SM
```
