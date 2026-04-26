import ExcelJS from "exceljs";
import path from "path";
import type { ReportSession } from "@/actions/reports";

const TEMPLATE_PATH = path.join(
  process.cwd(),
  "public",
  "plantillas",
  "informe-asistencia.xlsx"
);

const LOGO_PATH = path.join(process.cwd(), "public", "logo.PNG");
const CM_TO_PX = 96 / 2.54; // 96 DPI — ExcelJS ext uses pixels

const STATUS_ES: Record<string, string> = {
  present: "Presente",
  absent: "Ausente",
  late: "Tarde",
};

function addLogo(ws: ExcelJS.Worksheet, logoId: number) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (ws as any)._images = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ws.addImage(logoId, {
    tl: { col: 0, row: 0 },
    ext: { width: Math.round(8.83 * CM_TO_PX), height: Math.round(2.1 * CM_TO_PX) },
    editAs: "oneCell",
  } as any);
}

function colLetter(col: number): string {
  let s = "";
  while (col > 0) {
    const r = (col - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    col = Math.floor((col - 1) / 26);
  }
  return s;
}

function makeSheetName(base: string, used: Set<string>): string {
  let name = base.slice(0, 31);
  if (!used.has(name)) { used.add(name); return name; }
  for (let i = 2; ; i++) {
    const suf = `_${i}`;
    const candidate = base.slice(0, 31 - suf.length) + suf;
    if (!used.has(candidate)) { used.add(candidate); return candidate; }
  }
}

/**
 * Returns { rowNum, colNum } (1-based) of the first cell whose value is
 * exactly "Alumno" or "Grupo" — this is the data header row.
 */
function findHeader(ws: ExcelJS.Worksheet): { rowNum: number; colNum: number } | null {
  let result: { rowNum: number; colNum: number } | null = null;
  ws.eachRow({ includeEmpty: false }, (row, rowNum) => {
    if (result) return;
    row.eachCell({ includeEmpty: false }, (cell, colNum) => {
      if (result) return;
      const v = typeof cell.value === "string" ? cell.value.trim() : "";
      if (v === "Alumno" || v === "Grupo") result = { rowNum, colNum };
    });
  });
  return result;
}

/** Count non-empty example data rows after the header in the template. */
function countTemplateDataRows(
  ws: ExcelJS.Worksheet,
  hRowNum: number,
  startCol: number
): number {
  let count = 0;
  ws.eachRow({ includeEmpty: false }, (_, rowNum) => {
    if (rowNum <= hRowNum) return;
    const val = ws.getRow(rowNum).getCell(startCol).value;
    if (val !== null && val !== undefined && val !== "") count++;
  });
  return count;
}

/**
 * Clones src into a new worksheet added to wb.
 * Preserves: column widths (all), row heights, cell values, cell styles,
 * merged cells, frozen panes (views), page setup, and images (logo).
 */
function cloneWorksheet(
  wb: ExcelJS.Workbook,
  src: ExcelJS.Worksheet,
  name: string
): ExcelJS.Worksheet {
  const dest = wb.addWorksheet(name, {
    properties: { ...src.properties },
    pageSetup: { ...src.pageSetup },
    views: src.views.map((v) => ({ ...v })),
  });

  // All column widths and default styles (A–D static + E+ as-is from template)
  src.columns.forEach((col, i) => {
    const dc = dest.getColumn(i + 1);
    if (col.width != null) dc.width = col.width;
    if (col.hidden) dc.hidden = true;
    if (col.style) dc.style = JSON.parse(JSON.stringify(col.style));
  });

  // Rows and cells — includeEmpty:true captures styled-but-empty spacer rows
  src.eachRow({ includeEmpty: true }, (srcRow, rowNum) => {
    const destRow = dest.getRow(rowNum);
    if (srcRow.height) destRow.height = srcRow.height;
    srcRow.eachCell({ includeEmpty: true }, (srcCell, colNum) => {
      const destCell = destRow.getCell(colNum);
      // Slave cells of a merged range carry no independent value
      if (srcCell.type !== ExcelJS.ValueType.Merge) {
        destCell.value = srcCell.value as ExcelJS.CellValue;
      }
      if (srcCell.style) destCell.style = JSON.parse(JSON.stringify(srcCell.style));
    });
    destRow.commit();
  });

  // Merged cell ranges
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const merges: Record<string, boolean> = (src as any)._merges ?? {};
  for (const range of Object.keys(merges)) {
    try { dest.mergeCells(range); } catch { /* skip on conflict */ }
  }

  return dest;
}

/**
 * Fills a template worksheet with real data in place.
 *
 * - Updates cell VALUES of existing cells (styles are never touched).
 * - For rows / columns beyond the template's example range: copies styles
 *   from the reference row (first template data row).
 * - Sets column widths for extra date columns (always ≥ startCol, i.e. E+).
 * - Clears excess template example rows when real data has fewer rows.
 */
function fillSheet(
  ws: ExcelJS.Worksheet,
  header: string[],
  dataRows: (string | number | null)[][]
) {
  const found = findHeader(ws);
  if (!found) return;
  const { rowNum: hRowNum, colNum: startCol } = found;
  const firstDataRowNum = hRowNum + 1;
  const templateDataCount = countTemplateDataRows(ws, hRowNum, startCol);

  // ── Header row: value + formatting (bold, no underline, bottom border) ───────
  const hRow = ws.getRow(hRowNum);
  for (let ci = 0; ci < header.length; ci++) {
    const cell = hRow.getCell(startCol + ci);
    cell.value = header[ci];
    cell.font = { ...(cell.font ?? {}), bold: true, underline: false };
    cell.border = {
      ...(cell.border ?? {}),
      bottom: { style: "thin", color: { argb: "FF000000" } },
    };
  }
  // Clear any extra template header cells to the right of our header
  for (let c = startCol + header.length; ; c++) {
    const cell = hRow.getCell(c);
    if (cell.value === null || cell.value === undefined) break;
    cell.value = null;
  }
  hRow.commit();

  // Autofilter spanning the full header
  ws.autoFilter = `${colLetter(startCol)}${hRowNum}:${colLetter(startCol + header.length - 1)}${hRowNum}`;

  // Reference row: first template data row — style/width source for extras
  const refRow = ws.getRow(firstDataRowNum);
  let refColCount = 0;
  refRow.eachCell({ includeEmpty: false }, (_, colNum) => {
    refColCount = Math.max(refColCount, colNum - startCol + 1);
  });

  // ── Data rows ────────────────────────────────────────────────────────────────
  for (let ri = 0; ri < dataRows.length; ri++) {
    const rowNum = firstDataRowNum + ri;
    const row = ws.getRow(rowNum);
    const rowData = dataRows[ri];
    const isExtraRow = ri >= templateDataCount;

    if (isExtraRow && refRow.height) row.height = refRow.height;

    for (let ci = 0; ci < rowData.length; ci++) {
      const cell = row.getCell(startCol + ci);

      // Copy style for cells that have no template equivalent
      if (isExtraRow || ci >= refColCount) {
        const refCell = refRow.getCell(
          startCol + Math.min(ci, refColCount > 0 ? refColCount - 1 : 0)
        );
        if (refCell.style) cell.style = JSON.parse(JSON.stringify(refCell.style));
      }

      cell.value = rowData[ci] as ExcelJS.CellValue;
    }
    row.commit();
  }

  // Clear excess template example rows
  for (let ri = dataRows.length; ri < templateDataCount; ri++) {
    const row = ws.getRow(firstDataRowNum + ri);
    row.eachCell({ includeEmpty: false }, (cell) => { cell.value = null; });
    row.commit();
  }

}

export async function generateAttendanceExcel(
  sessions: ReportSession[]
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(TEMPLATE_PATH);

  const logoId = wb.addImage({ filename: LOGO_PATH, extension: "png" });

  // Group sessions by group, sorted by date
  const groupMap = new Map<string, { name: string; sessions: ReportSession[] }>();
  for (const s of sessions) {
    if (!groupMap.has(s.group_id))
      groupMap.set(s.group_id, { name: s.group_name, sessions: [] });
    groupMap.get(s.group_id)!.sessions.push(s);
  }
  for (const g of groupMap.values())
    g.sessions.sort((a, b) => a.date.localeCompare(b.date));

  // ── "Inicio": modify in place — image, freeze, and all styles preserved ──────
  const inicioWs = wb.getWorksheet("Inicio");
  if (inicioWs) {
    const inicioRows: (string | number | null)[][] = [];
    for (const g of groupMap.values()) {
      let present = 0, total = 0;
      for (const s of g.sessions)
        for (const r of s.records) { total++; if (r.status === "present") present++; }
      inicioRows.push([
        g.name,
        g.sessions.length,
        total > 0 ? `${Math.round((present / total) * 100)}%` : "—",
      ]);
    }
    fillSheet(inicioWs, ["Grupo", "Sesiones totales", "% Asistencia"], inicioRows);
    addLogo(inicioWs, logoId);
  }

  // Keep a reference to the group template sheet BEFORE removing it from the workbook
  const groupTemplateWs =
    wb.worksheets.find((ws) => ws.name !== "Inicio") ?? inicioWs;

  // Remove all template example group sheets
  const toRemove = wb.worksheets.filter((ws) => ws.name !== "Inicio");
  for (const ws of toRemove) wb.removeWorksheet(ws.id);

  // ── One sheet per real group ──────────────────────────────────────────────────
  const usedNames = new Set<string>(["Inicio"]);

  for (const g of groupMap.values()) {
    const dates = g.sessions.map((s) => s.date);

    const studentMap = new Map<string, string>();
    for (const s of g.sessions)
      for (const r of s.records) studentMap.set(r.student_id, r.student_name);
    const students = [...studentMap.entries()].sort((a, b) =>
      a[1].localeCompare(b[1])
    );

    // Column order matches template: Alumno | % Asistencia | date1 | date2 | …
    // (% is pinned at column E so it stays visible when scrolling through dates)
    const dataRows: (string | number | null)[][] = [];
    for (const [sid, sname] of students) {
      let present = 0, total = 0;
      const attendances: (string | null)[] = [];
      for (const s of g.sessions) {
        const rec = s.records.find((r) => r.student_id === sid);
        if (rec) {
          total++;
          if (rec.status === "present") present++;
          attendances.push(STATUS_ES[rec.status] ?? rec.status);
        } else {
          attendances.push("—");
        }
      }
      const pct = total > 0 ? `${Math.round((present / total) * 100)}%` : "—";
      dataRows.push([sname, pct, ...attendances]);
    }

    const sheetName = makeSheetName(g.name, usedNames);
    const groupWs = cloneWorksheet(wb, groupTemplateWs!, sheetName);

    const header = ["Alumno", "% Asistencia", ...dates];
    fillSheet(groupWs, header, dataRows);
    addLogo(groupWs, logoId);

    // Auto-fit date columns (F onwards, ci >= 2 relative to startCol)
    const headerPos = findHeader(groupWs);
    if (headerPos) {
      for (let ci = 2; ci < header.length; ci++) {
        let maxLen = header[ci].length;
        for (const row of dataRows) {
          const val = row[ci];
          if (val != null) maxLen = Math.max(maxLen, String(val).length);
        }
        groupWs.getColumn(headerPos.colNum + ci).width = maxLen + 3;
      }
    }

    // A11:E11 — merge & center, set title
    try { groupWs.unMergeCells(11, 1, 11, 5); } catch { /* not merged yet */ }
    groupWs.mergeCells(11, 1, 11, 5);
    const titleCell = groupWs.getRow(11).getCell(1);
    titleCell.value = `Asistencia de ${g.name}`;
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    groupWs.getRow(11).commit();
  }

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
