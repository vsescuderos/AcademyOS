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

function readStyle(sheet: XLSX.WorkSheet, r: number, c: number, maxC: number): CellStyle {
  const safeC = Math.min(c, maxC);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (sheet[XLSX.utils.encode_cell({ r, c: safeC })] as any)?.s;
}

/**
 * Deep-clones a template worksheet and fills it with new header + data rows,
 * preserving all template formatting (styles, column widths, freeze panes, etc.).
 */
export function fillTemplateSheet(
  template: XLSX.WorkSheet,
  header: string[],
  dataRows: (string | number | null)[][],
  titleOverride?: string
): XLSX.WorkSheet {
  const sheet: XLSX.WorkSheet = JSON.parse(JSON.stringify(template));
  const range = XLSX.utils.decode_range(sheet["!ref"]!);
  const startCol = range.s.c;
  const hRowIdx = findHeaderRow(sheet);
  const maxTemplateCol = range.e.c;

  if (titleOverride) {
    const tc = sheet[XLSX.utils.encode_cell({ r: range.s.r, c: startCol })];
    if (tc) tc.v = titleOverride;
  }

  const numCols = Math.max(header.length, ...dataRows.map(r => r.length), 1);

  // Capture styles per column before clearing (fall back to last template column)
  const hStyles: CellStyle[] = Array.from({ length: numCols }, (_, ci) =>
    readStyle(sheet, hRowIdx, startCol + ci, maxTemplateCol)
  );
  const dStyles: CellStyle[] = Array.from({ length: numCols }, (_, ci) =>
    readStyle(sheet, hRowIdx + 1, startCol + ci, maxTemplateCol)
  );

  // Clear from header row down to end of template data
  for (let r = hRowIdx; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      delete sheet[XLSX.utils.encode_cell({ r, c })];
    }
  }

  // Write header row
  header.forEach((val, ci) => {
    const addr = XLSX.utils.encode_cell({ r: hRowIdx, c: startCol + ci });
    sheet[addr] = { v: val, t: "s", s: hStyles[ci] };
  });

  // Write data rows
  dataRows.forEach((row, ri) => {
    row.forEach((val, ci) => {
      if (val === null) return;
      const addr = XLSX.utils.encode_cell({ r: hRowIdx + 1 + ri, c: startCol + ci });
      sheet[addr] = { v: val, t: typeof val === "number" ? "n" : "s", s: dStyles[ci] };
    });
  });

  // Update !ref to cover new content
  sheet["!ref"] = XLSX.utils.encode_range({
    s: { r: range.s.r, c: range.s.c },
    e: { r: hRowIdx + dataRows.length, c: startCol + numCols - 1 },
  });

  return sheet;
}
