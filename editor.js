const CHANNEL_SUBS = 4; // note, ins-hi, ins-lo, effect

const NOTE_KEYS = {
  // lower octave (base)
  KeyZ: 0, KeyS: 1, KeyX: 2, KeyD: 3, KeyC: 4, KeyV: 5,
  KeyG: 6, KeyB: 7, KeyH: 8, KeyN: 9, KeyJ: 10, KeyM: 11,
  Comma: 12, KeyL: 13, Period: 14, Semicolon: 15, Slash: 16,
  // upper octave (base + 1)
  KeyQ: 12, Digit2: 13, KeyW: 14, Digit3: 15, KeyE: 16, KeyR: 17,
  Digit5: 18, KeyT: 19, Digit6: 20, KeyY: 21, Digit7: 22, KeyU: 23,
  KeyI: 24, Digit9: 25, KeyO: 26, Digit0: 27, KeyP: 28,
};

const NOTE_NAMES = ["C-", "C#", "D-", "D#", "E-", "F-", "F#", "G-", "G#", "A-", "A#", "B-"];

export class PatternEditor {
  constructor(workingSong, { previewNote, onChange }) {
    this.song = workingSong;
    this.channelCount = workingSong.pattern[0].length;
    this.rowCount = workingSong.pattern.length;
    this.row = 0;
    this.channel = 0;
    this.sub = 0;
    this.baseOctave = 4;
    this.selectedInstrument = 0;
    this.previewNote = previewNote;
    this.onChange = onChange;
    this.enabled = true;
  }

  setEnabled(flag) {
    this.enabled = flag;
    this.onChange();
  }

  handleKey(event) {
    if (!this.enabled) return;
    if (event.ctrlKey || event.altKey || event.metaKey) return;

    switch (event.code) {
      case "ArrowUp": this.moveRow(-1); return preventDefault(event);
      case "ArrowDown": this.moveRow(1); return preventDefault(event);
      case "ArrowLeft": this.moveSub(-1); return preventDefault(event);
      case "ArrowRight": this.moveSub(1); return preventDefault(event);
      case "Minus":
        this.baseOctave = clamp(this.baseOctave - 1, 0, 8);
        this.onChange();
        return preventDefault(event);
      case "Equal":
        this.baseOctave = clamp(this.baseOctave + 1, 0, 8);
        this.onChange();
        return preventDefault(event);
    }

    if (this.sub === 0) {
      if (event.code === "Delete") {
        this.writeCell("--------");
        this.moveRow(1);
        return preventDefault(event);
      }
      if (event.code === "Backspace") {
        this.writeCell("===-----");
        this.moveRow(1);
        return preventDefault(event);
      }
      const offset = NOTE_KEYS[event.code];
      if (offset !== undefined) {
        const midi = (this.baseOctave + 1) * 12 + offset;
        if (midi >= 0 && midi < 128) {
          const cellText = midiToNoteText(midi) + hex2(this.selectedInstrument) + "---";
          this.writeCell(cellText);
          this.previewNote(this.selectedInstrument, midi);
          this.moveRow(1);
        }
        preventDefault(event);
      }
      return;
    }

    if (this.sub === 1 || this.sub === 2) {
      const digit = parseHexDigit(event.code);
      if (digit !== null) {
        this.editInstrumentNibble(this.sub === 1 ? 0 : 1, digit);
        this.moveRow(1);
        preventDefault(event);
      }
    }
    // sub === 3 (effect): read-only
  }

  moveRow(delta) {
    this.row = clamp(this.row + delta, 0, this.rowCount - 1);
    this.onChange();
  }

  moveSub(delta) {
    const max = this.channelCount * CHANNEL_SUBS - 1;
    const total = clamp(this.channel * CHANNEL_SUBS + this.sub + delta, 0, max);
    this.channel = Math.floor(total / CHANNEL_SUBS);
    this.sub = total % CHANNEL_SUBS;
    this.onChange();
  }

  writeCell(cellText) {
    this.song.pattern[this.row][this.channel] = cellText;
  }

  editInstrumentNibble(position, digit) {
    const cell = this.song.pattern[this.row][this.channel];
    const noteText = cell.slice(0, 3);
    if (noteText === "---" || noteText === "===") return;
    const insText = cell.slice(3, 5);
    const hex = digit.toString(16).toUpperCase();
    const newIns = position === 0 ? hex + insText[1] : insText[0] + hex;
    this.writeCell(noteText + newIns + cell.slice(5));
  }
}

function preventDefault(event) {
  event.preventDefault();
}

function midiToNoteText(midi) {
  const octave = Math.floor(midi / 12) - 1;
  return NOTE_NAMES[midi % 12] + octave;
}

function hex2(n) {
  return n.toString(16).padStart(2, "0").toUpperCase();
}

function parseHexDigit(code) {
  const m = /^(Digit|Key)([0-9A-F])$/.exec(code);
  if (!m) return null;
  const c = m[2];
  if (c >= "0" && c <= "9") return c.charCodeAt(0) - 48;
  return 10 + c.charCodeAt(0) - 65;
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}
