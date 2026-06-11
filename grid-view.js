const EMPTY = "--------";
export const VISIBLE_ROWS = 17;
export const CENTER = 8;

// The six fields of a cell, in cursor order.
// Index = cursor position. start/end slice the 8-char cell string.
export const FIELDS = [
  { className: "note", start: 0, end: 3 },
  { className: "instrument_character_1", start: 3, end: 4 },
  { className: "instrument_character_2", start: 4, end: 5 },
  { className: "effect_key", start: 5, end: 6 },
  { className: "effect_value_character_1", start: 6, end: 7 },
  { className: "effect_value_character_2", start: 7, end: 8 },
];

// Builds the grid DOM and returns a render(pattern, focusRow) function.
// The row elements stay private to this module.
export function createGridView(gridTableElement, channelsCount, cursor) {
  const rowEls = buildRows(gridTableElement, channelsCount);
  return (pattern, focusRow) => renderRows(rowEls, pattern, focusRow, cursor);
}

function buildRows(gridEl, channelsCount) {
  return Array.from({ length: VISIBLE_ROWS }, (_, row) => {
    const tr = document.createElement("tr");
    if (row === CENTER) tr.classList.add("playhead");
    const th = document.createElement("th");
    tr.appendChild(th);
    const spans = Array.from({ length: channelsCount }, (_, channel) => {
      const td = document.createElement("td");
      const cellSpans = FIELDS.map((field) => {
        const s = document.createElement("span");
        s.className = field.className;
        td.appendChild(s);
        return s;
      });
      tr.appendChild(td);
      return cellSpans;
    });
    gridEl.appendChild(tr);
    return { tr, th, spans };
  });
}

function renderRows(rowElements, pattern, focusRow, cursor) {
  rowElements.forEach((rowElement, i) => {
    const currentRow = focusRow - CENTER + i;
    if (currentRow < 0 || currentRow >= pattern.length) {
      rowElement.th.textContent = "";
      rowElement.spans.forEach((channelSpans) =>
        channelSpans.forEach((s) => (s.textContent = "")),
      );
      return;
    }
    const patternRow = pattern[currentRow];
    rowElement.th.textContent = String(currentRow).padStart(2, "0");
    rowElement.spans.forEach((channelSpans, ch) => {
      const note = patternRow?.[ch];
      channelSpans.forEach((s, position) => {
        const field = FIELDS[position];
        s.textContent = note ? note.pitch : "--------";
        /* s.textContent = note.slice(field.start, field.end); */
        const isCursor = ch === cursor.channel && position === cursor.position;
        s.className = isCursor ? `${field.className} cursor` : field.className;
      });
    });
  });
}
