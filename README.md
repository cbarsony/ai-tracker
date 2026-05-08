# AI Tracker

AI Tracker is an experimental tool for human-AI collaboration in music composition.
Its goal is not to generate a finished, polished audio track, but to help create and refine the music itself.
The primary artifact is an editable tracker-style score: rows, channels, notes, instruments, and timing data.
This gives composers room to experiment, discuss alternatives, and develop ideas together with AI.
The current prototype plays code-defined patterns in the browser using Web Audio.
Songs can be shaped directly through structured musical data rather than through a fixed audio render.
The project is focused on clear musical communication, fast iteration, and composer control.

## Code structure

- `main.js` is the browser entrypoint: it loads a song, creates a player, and binds the Play button.
- `song1.js` contains the editable song data: pattern rows, sample generators, and instrument choices.
- `src/song/` contains reusable song and instrument definition classes.
- `src/tracker/` contains tracker notation, cell parsing, volume effects, pattern parsing, and per-track state.
- `src/audio/` contains Web Audio runtime objects and scheduling of instrument playback.
- `src/player/` contains playback orchestration across tracks and rows.
- `src/ui/` contains DOM-facing controls.


