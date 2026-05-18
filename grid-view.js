import { NOTE_OFF, formatCell, formatInstrument, isEmpty } from "./cell.js";

// Tracker-style piano row: bottom row of the keyboard plays one octave starting at
// the current octave, with sharps on the row above where appropriate.
const PIANO_KEY_OFFSETS = {
  KeyZ: 0, // C
  KeyS: 1, // C#
  KeyX: 2, // D
  KeyD: 3, // D#
  KeyC: 4, // E
  KeyV: 5, // F
  KeyG: 6, // F#
  KeyB: 7, // G
  KeyH: 8, // G#
  KeyN: 9, // A
  KeyJ: 10, // A#
  KeyM: 11, // B
  Comma: 12, // C (next octave)
  KeyL: 13, // C#
  Period: 14, // D
  Semicolon: 15, // D#
  Slash: 16, // E
};

const NOTE_OFF_KEY = "Backquote"; // `

export class GridView {
  constructor({ container, toolbar, song, onCellSelect, onPreviewNote, onInstrumentChange } = {}) {
    this.container = container;
    this.toolbar = toolbar;
    this.song = song;
    this.onCellSelect = onCellSelect ?? null;
    this.onPreviewNote = onPreviewNote ?? null;
    this.onInstrumentChange = onInstrumentChange ?? null;

    this.cursorRow = 0;
    this.cursorColumn = 0;
    this.currentOctave = 4;
    this.currentInstrument = 0;
    this.playingRow = -1;

    this.tableEl = null;
    this.octaveDisplay = null;
    this.instrumentDisplay = null;
  }

  render() {
    this.renderToolbar();
    this.renderGrid();
    this.container.tabIndex = 0;
    this.container.addEventListener("keydown", (event) => this.onKeyDown(event));
  }

  renderToolbar() {
    this.toolbar.innerHTML = "";

    const octaveLabel = document.createElement("span");
    octaveLabel.textContent = "Octave: ";
    this.octaveDisplay = document.createElement("strong");
    this.octaveDisplay.textContent = String(this.currentOctave);
    octaveLabel.appendChild(this.octaveDisplay);

    const octaveDown = this.makeButton("-", () => this.setOctave(this.currentOctave - 1));
    const octaveUp = this.makeButton("+", () => this.setOctave(this.currentOctave + 1));

    const instrumentLabel = document.createElement("span");
    instrumentLabel.textContent = " Instrument: ";
    this.instrumentDisplay = document.createElement("strong");
    instrumentLabel.appendChild(this.instrumentDisplay);

    const instrumentSelect = document.createElement("select");
    this.song.instruments.forEach((instrument, index) => {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = `${formatInstrument(index)} ${instrument.name}`;
      instrumentSelect.appendChild(option);
    });
    instrumentSelect.value = String(this.currentInstrument);
    instrumentSelect.addEventListener("change", () => {
      this.setInstrument(Number(instrumentSelect.value));
      this.focus();
    });
    this.instrumentSelect = instrumentSelect;
    this.updateInstrumentDisplay();

    const insertRow = this.makeButton("Insert row", () => this.insertRow());
    const deleteRow = this.makeButton("Delete row", () => this.deleteRow());

    this.toolbar.append(
      octaveLabel,
      octaveDown,
      octaveUp,
      instrumentLabel,
      this.instrumentDisplay,
      instrumentSelect,
      insertRow,
      deleteRow,
    );
  }

  makeButton(label, handler) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.classList.add("toolbar-button");
    button.addEventListener("click", () => {
      handler();
      this.focus();
    });
    return button;
  }

  renderGrid() {
    this.container.innerHTML = "";
    const table = document.createElement("table");
    table.classList.add("tracker-grid");

    const header = document.createElement("tr");
    const corner = document.createElement("th");
    corner.textContent = "";
    header.appendChild(corner);
    const columnCount = this.song.pattern[0]?.length ?? 0;
    for (let c = 0; c < columnCount; c += 1) {
      const th = document.createElement("th");
      th.textContent = `CH ${c + 1}`;
      header.appendChild(th);
    }
    table.appendChild(header);

    this.song.pattern.forEach((row, rowIndex) => {
      const tr = document.createElement("tr");
      tr.dataset.row = String(rowIndex);

      const rowHeader = document.createElement("th");
      rowHeader.textContent = rowIndex.toString(16).toUpperCase().padStart(2, "0");
      rowHeader.classList.add("row-header");
      tr.appendChild(rowHeader);

      row.forEach((cell, columnIndex) => {
        const td = document.createElement("td");
        td.dataset.row = String(rowIndex);
        td.dataset.column = String(columnIndex);
        td.textContent = formatCell(cell);
        td.classList.add("cell");
        if (isEmpty(cell)) td.classList.add("empty");
        td.addEventListener("click", () => {
          this.setCursor(rowIndex, columnIndex);
          this.focus();
        });
        tr.appendChild(td);
      });

      table.appendChild(tr);
    });

    this.tableEl = table;
    this.container.appendChild(table);
    this.refreshHighlights();
  }

  focus() {
    this.container.focus();
  }

  setCursor(row, column) {
    const rowCount = this.song.pattern.length;
    if (rowCount === 0) return;
    const columnCount = this.song.pattern[0].length;
    this.cursorRow = ((row % rowCount) + rowCount) % rowCount;
    this.cursorColumn = ((column % columnCount) + columnCount) % columnCount;
    this.refreshHighlights();
    if (this.onCellSelect) {
      this.onCellSelect(this.cursorRow, this.cursorColumn);
    }
  }

  setOctave(octave) {
    this.currentOctave = Math.max(0, Math.min(8, octave));
    if (this.octaveDisplay) {
      this.octaveDisplay.textContent = String(this.currentOctave);
    }
  }

  setInstrument(instrument) {
    const max = this.song.instruments.length - 1;
    const previousInstrument = this.currentInstrument;
    this.currentInstrument = Math.max(0, Math.min(max, instrument));
    if (this.instrumentSelect) {
      this.instrumentSelect.value = String(this.currentInstrument);
    }
    this.updateInstrumentDisplay();
    if (this.onInstrumentChange && this.currentInstrument !== previousInstrument) {
      this.onInstrumentChange(this.currentInstrument);
    }
  }

  updateInstrumentDisplay() {
    if (!this.instrumentDisplay) return;
    this.instrumentDisplay.textContent = formatInstrument(this.currentInstrument);
  }

  setPlayingRow(rowIndex) {
    this.playingRow = rowIndex;
    this.refreshHighlights();
  }

  refreshHighlights() {
    if (!this.tableEl) return;
    const rows = this.tableEl.querySelectorAll("tr[data-row]");
    rows.forEach((tr) => {
      const rowIndex = Number(tr.dataset.row);
      tr.classList.toggle("playing", rowIndex === this.playingRow);
      tr.querySelectorAll("td.cell").forEach((td) => {
        const columnIndex = Number(td.dataset.column);
        td.classList.toggle(
          "cursor",
          rowIndex === this.cursorRow && columnIndex === this.cursorColumn,
        );
      });
    });
  }

  updateCellDom(rowIndex, columnIndex) {
    if (!this.tableEl) return;
    const td = this.tableEl.querySelector(
      `td.cell[data-row="${rowIndex}"][data-column="${columnIndex}"]`,
    );
    if (!td) return;
    const cell = this.song.pattern[rowIndex][columnIndex];
    td.textContent = formatCell(cell);
    td.classList.toggle("empty", isEmpty(cell));
  }

  setCell(rowIndex, columnIndex, cell) {
    this.song.pattern[rowIndex][columnIndex] = cell;
    this.updateCellDom(rowIndex, columnIndex);
  }

  insertRow() {
    const columnCount = this.song.pattern[0]?.length ?? 1;
    const blank = new Array(columnCount).fill(null);
    this.song.pattern.splice(this.cursorRow, 0, blank);
    this.renderGrid();
  }

  deleteRow() {
    if (this.song.pattern.length <= 1) return;
    this.song.pattern.splice(this.cursorRow, 1);
    if (this.cursorRow >= this.song.pattern.length) {
      this.cursorRow = this.song.pattern.length - 1;
    }
    this.renderGrid();
  }

  onKeyDown(event) {
    const { code, key } = event;

    if (code === "ArrowUp") {
      event.preventDefault();
      this.setCursor(this.cursorRow - 1, this.cursorColumn);
      return;
    }
    if (code === "ArrowDown") {
      event.preventDefault();
      this.setCursor(this.cursorRow + 1, this.cursorColumn);
      return;
    }
    if (code === "ArrowLeft") {
      event.preventDefault();
      this.setCursor(this.cursorRow, this.cursorColumn - 1);
      return;
    }
    if (code === "ArrowRight") {
      event.preventDefault();
      this.setCursor(this.cursorRow, this.cursorColumn + 1);
      return;
    }
    if (code === "Home") {
      event.preventDefault();
      this.setCursor(0, this.cursorColumn);
      return;
    }
    if (code === "End") {
      event.preventDefault();
      this.setCursor(this.song.pattern.length - 1, this.cursorColumn);
      return;
    }
    if (code === "Delete" || code === "Backspace") {
      event.preventDefault();
      this.setCell(this.cursorRow, this.cursorColumn, null);
      return;
    }
    if (code === NOTE_OFF_KEY) {
      event.preventDefault();
      this.setCell(this.cursorRow, this.cursorColumn, {
        note: NOTE_OFF,
        instrument: null,
      });
      this.advanceCursor();
      return;
    }
    if (code === "BracketLeft") {
      event.preventDefault();
      this.setOctave(this.currentOctave - 1);
      return;
    }
    if (code === "BracketRight") {
      event.preventDefault();
      this.setOctave(this.currentOctave + 1);
      return;
    }

    // Digits select the current instrument.
    if (/^Digit[0-9]$/.test(code)) {
      const digit = Number(code.slice(5));
      if (digit < this.song.instruments.length) {
        event.preventDefault();
        this.setInstrument(digit);
        // If the cursor cell already has a note, update its instrument too.
        const cell = this.song.pattern[this.cursorRow][this.cursorColumn];
        if (!isEmpty(cell) && cell.note !== NOTE_OFF) {
          this.setCell(this.cursorRow, this.cursorColumn, {
            note: cell.note,
            instrument: digit,
          });
        }
        return;
      }
    }

    // Piano keys enter a note in the current cell.
    if (Object.prototype.hasOwnProperty.call(PIANO_KEY_OFFSETS, code)) {
      event.preventDefault();
      const midi = (this.currentOctave + 1) * 12 + PIANO_KEY_OFFSETS[code];
      if (midi >= 0 && midi <= 127) {
        this.setCell(this.cursorRow, this.cursorColumn, {
          note: midi,
          instrument: this.currentInstrument,
        });
        if (this.onPreviewNote) {
          this.onPreviewNote(midi, this.currentInstrument);
        }
        this.advanceCursor();
      }
      return;
    }

    // Fall through: ignore other keys (including modifier shortcuts).
    void key;
  }

  advanceCursor() {
    this.setCursor(this.cursorRow + 1, this.cursorColumn);
  }
}
