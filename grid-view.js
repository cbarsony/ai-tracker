const EMPTY = "--------";
const VISIBLE_ROWS = 17;
const CENTER = 8;

// The six fields of a cell, in cursor order.
// Index = cursor position. start/end slice the 8-char cell string.
const FIELDS = [
  { className: "note", start: 0, end: 3 },
  { className: "instrument_character_1", start: 3, end: 4 },
  { className: "instrument_character_2", start: 4, end: 5 },
  { className: "effect_key", start: 5, end: 6 },
  { className: "effect_value_character_1", start: 6, end: 7 },
  { className: "effect_value_character_2", start: 7, end: 8 },
];

// Builds the grid DOM and returns a render(pattern, focusRow) function.
// The row elements stay private to this module.
export function createGridView(
  gridEl,
  channelsCount,
  cursor = { channel: 0, position: 0 },
) {
  const rowEls = buildRows(gridEl, channelsCount, cursor);
  return (pattern, focusRow) => renderRows(rowEls, pattern, focusRow);
}

function buildRows(gridEl, channelsCount, cursor) {
  return Array.from({ length: VISIBLE_ROWS }, (_, row) => {
    const tr = document.createElement("tr");
    if (row === CENTER) tr.classList.add("playhead");
    const th = document.createElement("th");
    tr.appendChild(th);
    const spans = Array.from({ length: channelsCount }, (_, channel) => {
      const td = document.createElement("td");
      const cellSpans = FIELDS.map((field, position) => {
        const s = document.createElement("span");
        if (channel === cursor.channel) {
          s.className =
            position === cursor.position
              ? `${field.className} cursor`
              : field.className;
        }
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

function renderRows(rowEls, pattern, focusRow) {
  rowEls.forEach((el, i) => {
    const rowIdx = focusRow - CENTER + i;
    if (rowIdx < 0 || rowIdx >= pattern.length) {
      el.th.textContent = "";
      el.spans.forEach((channelSpans) =>
        channelSpans.forEach((s) => (s.textContent = "")),
      );
      return;
    }
    const row = pattern[rowIdx];
    el.th.textContent = String(rowIdx).padStart(2, "0");
    el.spans.forEach((channelSpans, ch) => {
      const cell = row?.[ch] ?? EMPTY;
      channelSpans.forEach((s, position) => {
        const field = FIELDS[position];
        s.textContent = cell.slice(field.start, field.end);
      });
    });
  });
}
