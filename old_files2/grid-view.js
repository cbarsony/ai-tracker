import { hex2 } from "./cell.js";

const VISIBLE_ROWS = 17;
const CENTER = 8;

export class GridView {
  constructor(gridEl, instrumentSelectEl, octaveLabelEl, editor) {
    this.gridEl = gridEl;
    this.instrumentSelect = instrumentSelectEl;
    this.octaveLabel = octaveLabelEl;
    this.editor = editor;
    this.playingRow = null;
  }

  init(instruments) {
    for (let i = 0; i < instruments.length; i++) {
      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = `${hex2(i)}: ${instruments[i].name}`;
      this.instrumentSelect.append(opt);
    }
    this.instrumentSelect.addEventListener("change", () => {
      this.editor.selectedInstrument = Number(this.instrumentSelect.value);
    });
    this.render();
  }

  setPlayingRow(row) {
    this.playingRow = row;
    this.render();
  }

  render() {
    const playing = this.playingRow !== null;
    const focusRow = playing ? this.playingRow : this.editor.row;
    this.octaveLabel.textContent = String(this.editor.baseOctave);

    const lines = [];
    for (let i = 0; i < VISIBLE_ROWS; i++) {
      const rowIdx = focusRow - CENTER + i;
      const isCenter = i === CENTER;
      lines.push(this.renderRow(rowIdx, isCenter, playing));
    }
    this.gridEl.innerHTML = lines.join("");
  }

  renderRow(rowIdx, isCenter, playing) {
    const inRange = rowIdx >= 0 && rowIdx < this.editor.rowCount;
    const rowNumber = inRange ? String(rowIdx).padStart(2, "0") : "  ";
    const classes = ["row"];
    if (isCenter) classes.push(playing ? "playhead-playing" : "playhead");

    const cells = [];
    for (let c = 0; c < this.editor.channelCount; c++) {
      const cellText = inRange ? this.editor.song.pattern[rowIdx][c] : "        ";
      cells.push(this.renderCell(cellText, c, isCenter, playing));
    }
    return `<div class="${classes.join(" ")}"><span class="row-number">${rowNumber}</span>${cells.join('<span class="channel-sep"> | </span>')}</div>`;
  }

  renderCell(cellText, channel, isCenter, playing) {
    const subs = [
      cellText.slice(0, 3),
      cellText.slice(3, 4),
      cellText.slice(4, 5),
      cellText.slice(5, 8),
    ];
    const showCursor = isCenter && !playing && channel === this.editor.channel;
    return subs
      .map((text, i) => {
        const cls = showCursor && i === this.editor.sub ? "sub cursor" : "sub";
        return `<span class="${cls}">${text}</span>`;
      })
      .join("");
  }
}
