const cursorChannel = 0;
/**
 * 0: note
 * 1: instrument character 1
 * 2: instrument character 2
 * 3: effect key
 * 4: effect value character 1
 * 5: effect value character 2
 */
const cursorPosition = 0;
const EMPTY = "--------";

const VISIBLE_ROWS = 17;
const CENTER = 8;

export function buildGrid(gridEl, channelsCount) {
  return Array.from({ length: VISIBLE_ROWS }, (_, row) => {
    const tr = document.createElement("tr");
    if (row === CENTER) tr.classList.add("playhead");
    const th = document.createElement("th");
    tr.appendChild(th);
    const spans = Array.from({ length: channelsCount }, (_, channel) => {
      const td = document.createElement("td");
      let cellSpans;
      if (cursorChannel === channel) {
        cellSpans = [
          cursorPosition === 0 ? "note cursor" : "note",
          cursorPosition === 1
            ? "instrument_character_1 cursor"
            : "instrument_character_1",
          cursorPosition === 2
            ? "instrument_character_2 cursor"
            : "instrument_character_2",
          cursorPosition === 3 ? "effect_key cursor" : "effect_key",
          cursorPosition === 4
            ? "effect_value_character_1 cursor"
            : "effect_value_character_1",
          cursorPosition === 5
            ? "effect_value_character_2 cursor"
            : "effect_value_character_2",
        ].map((cellSpan) => {
          const s = document.createElement("span");
          s.className = cellSpan;
          td.appendChild(s);
          return s;
        });
      } else {
        cellSpans = Array.from({ length: 6 }, () => {
          const s = document.createElement("span");
          td.appendChild(s);
          return s;
        });
      }

      tr.appendChild(td);
      return cellSpans;
    });
    gridEl.appendChild(tr);
    return { tr, th, spans };
  });
}

export function renderGrid(rowEls, pattern, focusRow) {
  for (let i = 0; i < VISIBLE_ROWS; i++) {
    const rowIdx = focusRow - CENTER + i;
    const el = rowEls[i];
    if (rowIdx < 0 || rowIdx >= pattern.length) {
      el.th.textContent = "";
      el.spans.forEach(span => {
        span.forEach(s => s.textContent = "");
      });
      continue;
    }
    const row = pattern[rowIdx];
    el.th.textContent = String(rowIdx).padStart(2, "0");
    for (let ch = 0; ch < el.spans.length; ch++) {
      const cell = row?.[ch] ?? EMPTY;
      el.spans[ch][0].textContent = cell.slice(0, 3);
      el.spans[ch][1].textContent = cell.slice(3, 4);
      el.spans[ch][2].textContent = cell.slice(4, 5);
      el.spans[ch][3].textContent = cell.slice(5, 6);
      el.spans[ch][4].textContent = cell.slice(6, 7);
      el.spans[ch][5].textContent = cell.slice(7, 8);
    }
  }
}
