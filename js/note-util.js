const SEMITONES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const A4_INDEX = 4 * 12 + 9; // 57

/**
 * Build the full list of note names from C-1 to B-8.
 */
function buildNoteNames() {
  const names = [];
  for (let octave = 1; octave <= 8; octave++) {
    for (const s of SEMITONES) {
      names.push(`${s}-${octave}`);
    }
  }
  return names;
}

export const NOTE_NAMES = buildNoteNames();

export function parseNote(str) {
  if (!str || str === "---") return null;
  const match = str.match(/^([A-G]#?)-(\d)$/);
  if (!match) return null;
  const semitone = SEMITONES.indexOf(match[1]);
  if (semitone === -1) return null;
  const octave = parseInt(match[2], 10);
  return { semitone, octave };
}

export function noteToFrequency(noteStr) {
  const parsed = parseNote(noteStr);
  if (!parsed) return null;
  const noteIndex = parsed.octave * 12 + parsed.semitone;
  return 440 * Math.pow(2, (noteIndex - A4_INDEX) / 12);
}

export function calculatePlaybackRate(targetNote, baseNote) {
  const targetFreq = noteToFrequency(targetNote);
  const baseFreq = noteToFrequency(baseNote);
  if (!targetFreq || !baseFreq) return 1.0;
  return targetFreq / baseFreq;
}
