const cursorChannel = 0;
const cursorPosition = 0;
const EMPTY = "--------";

const VISIBLE_ROWS = 17;
const CENTER = 8;

export function buildGrid(gridEl, channels) {
  return Array.from({ length: VISIBLE_ROWS }, (_, i) => {
    const tr = document.createElement("tr");
    if (i === CENTER) tr.classList.add("playhead");
    const th = document.createElement("th");
    tr.appendChild(th);
    const spans = Array.from({ length: channels }, () => {
      const td = document.createElement("td");
      const cellSpans = Array.from({ length: 4 }, () => {
        const s = document.createElement("span");
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

export function renderGrid(rowEls, pattern, focusRow) {
  for (let i = 0; i < VISIBLE_ROWS; i++) {
    const rowIdx = focusRow - CENTER + i;
    const el = rowEls[i];
    if (rowIdx < 0 || rowIdx >= pattern.length) {
      el.th.textContent = "";
      for (let ch = 0; ch < el.spans.length; ch++) {
        el.spans[ch][0].textContent = "";
        el.spans[ch][1].textContent = "";
        el.spans[ch][2].textContent = "";
        el.spans[ch][3].textContent = "";
      }
      continue;
    }
    const row = pattern[rowIdx];
    el.th.textContent = String(rowIdx).padStart(2, "0");
    for (let ch = 0; ch < el.spans.length; ch++) {
      const cell = row?.[ch] ?? EMPTY;
      el.spans[ch][0].textContent = cell.slice(0, 3);
      el.spans[ch][1].textContent = cell.slice(3, 4);
      el.spans[ch][2].textContent = cell.slice(4, 5);
      el.spans[ch][3].textContent = cell.slice(5, 8);
    }
  }
}
