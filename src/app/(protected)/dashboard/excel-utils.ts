import * as XLSX from "xlsx";

export function findHeaderRow(sheet: XLSX.WorkSheet): number {
  const ref = sheet["!ref"];
  if (!ref) return 0;
  const range = XLSX.utils.decode_range(ref);
  const startCol = range.s.c;

  for (let r = range.s.r; r <= range.e.r; r++) {
    const cell = sheet[XLSX.utils.encode_cell({ r, c: startCol })];
    if (cell && typeof cell.v === "string") {
      const v = cell.v.trim();
      if (v === "Alumno" || v === "Grupo") return r;
    }
  }
  return range.s.r;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CellStyle = any;

function getCellStyle(sheet: XLSX.WorkSheet, r: number, c: number, maxC: number): CellStyle {
  const safeC = Math.min(c, maxC);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (sheet[XLSX.utils.encode_cell({ r, c: safeC })] as any)?.s;
}

/**
 * Fills template data into a sheet, preserving all formatting.
 * Updates existing cell VALUES in place when possible so that cell styles,
 * borders, and other per-cell properties are never touched.
 * New cells beyond the template data range get their style copied from the
 * nearest template cell in the same column.
 *
 * @param sheet   The worksheet to modify. Pass the original (no clone) for
 *                sheets with images — the caller is responsible for cloning
 *                if a copy is needed.
 * @param inPlace If true the sheet object is modified directly (no clone).
 *                Use this for sheets that reference workbook-level resources
 *                such as images/drawings that must stay bound to `wb`.
 */
export function fillTemplateSheet(
  template: XLSX.WorkSheet,
  header: string[],
  dataRows: (string | number | null)[][],
  titleOverride?: string,
  inPlace = false
): XLSX.WorkSheet {
  // structuredClone handles Buffers / ArrayBuffers that JSON.parse/stringify drops.
  const sheet: XLSX.WorkSheet = inPlace ? template : structuredClone(template);

  const ref = sheet["!ref"];
  if (!ref) return sheet;
  const range = XLSX.utils.decode_range(ref);
  const startCol = range.s.c;
  const hRowIdx = findHeaderRow(sheet);
  const maxTemplateCol = range.e.c;
  const templateDataEndRow = range.e.r;

  // Update title cell value in place (preserves font / style)
  if (titleOverride) {
    const tc = sheet[XLSX.utils.encode_cell({ r: range.s.r, c: startCol })];
    if (tc) tc.v = titleOverride;
  }

  const numCols = Math.max(header.length, ...dataRows.map(r => r.length), 1);

  // Capture styles BEFORE any changes (fallback to last template column for extras)
  const hStyles: CellStyle[] = Array.from({ length: numCols }, (_, ci) =>
    getCellStyle(sheet, hRowIdx, startCol + ci, maxTemplateCol)
  );
  const dStyles: CellStyle[] = Array.from({ length: numCols }, (_, ci) =>
    getCellStyle(sheet, hRowIdx + 1, startCol + ci, maxTemplateCol)
  );

  // ── Header row ──────────────────────────────────────────────────────────────
  for (let ci = 0; ci < numCols; ci++) {
    const addr = XLSX.utils.encode_cell({ r: hRowIdx, c: startCol + ci });
    if (ci < header.length) {
      if (sheet[addr]) {
        // Update value in place — keeps all existing style, border, alignment
        sheet[addr].v = header[ci];
        sheet[addr].t = "s";
      } else {
        sheet[addr] = { v: header[ci], t: "s", s: hStyles[ci] };
      }
    } else {
      delete sheet[addr];
    }
  }
  for (let c = startCol + numCols; c <= maxTemplateCol; c++) {
    delete sheet[XLSX.utils.encode_cell({ r: hRowIdx, c })];
  }

  // ── Data rows ───────────────────────────────────────────────────────────────
  const firstDataRow = hRowIdx + 1;
  const rowsToProcess = Math.max(dataRows.length, templateDataEndRow - firstDataRow + 1);
  const colsToProcess = Math.max(numCols, maxTemplateCol - startCol + 1);

  for (let ri = 0; ri < rowsToProcess; ri++) {
    const row = ri < dataRows.length ? dataRows[ri] : null;
    const r = firstDataRow + ri;

    for (let ci = 0; ci < colsToProcess; ci++) {
      const addr = XLSX.utils.encode_cell({ r, c: startCol + ci });

      if (row && ci < row.length && row[ci] !== null) {
        const val = row[ci]!;
        const t = typeof val === "number" ? "n" : "s";
        if (sheet[addr]) {
          sheet[addr].v = val;
          sheet[addr].t = t;
        } else {
          sheet[addr] = { v: val, t, s: dStyles[Math.min(ci, numCols - 1)] };
        }
      } else {
        delete sheet[addr];
      }
    }
  }

  // ── Update !ref ─────────────────────────────────────────────────────────────
  const newEndRow = dataRows.length > 0 ? firstDataRow + dataRows.length - 1 : hRowIdx;
  const newEndCol = startCol + numCols - 1;
  sheet["!ref"] = XLSX.utils.encode_range({
    s: { r: range.s.r, c: range.s.c },
    e: { r: newEndRow, c: newEndCol },
  });

  return sheet;
}
