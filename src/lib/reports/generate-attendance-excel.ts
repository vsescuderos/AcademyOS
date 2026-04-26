import ExcelJS from "exceljs";
import path from "path";
import type { ReportSession } from "@/actions/reports";

const TEMPLATE_PATH = path.join(
  process.cwd(),
  "public",
  "plantillas",
  "informe-asistencia.xlsx"
);

const STATUS_ES: Record<string, string> = {
  present: "Presente",
  absent: "Ausente",
  late: "Tarde",
};

function makeSheetName(base: string, used: Set<string>): string {
  let name = base.slice(0, 31);
  if (!used.has(name)) { used.add(name); return name; }
  for (let i = 2; ; i++) {
    const suf = `_${i}`;
    const candidate = base.slice(0, 31 - suf.length) + suf;
    if (!used.has(candidate)) { used.add(candidate); return candidate; }
  }
}

/** Returns { rowNum, colNum } (1-based) of the header cell ("Alumno" or "Grupo"). */
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
 * Copies column widths, row heights, cell values and styles, views (freeze),
 * pageSetup, and merged cell ranges.
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

  // Column widths and default styles
  src.columns.forEach((col, i) => {
    const dc = dest.getColumn(i + 1);
    if (col.width != null) dc.width = col.width;
    if (col.hidden) dc.hidden = true;
    if (col.style) dc.style = JSON.parse(JSON.stringify(col.style));
  });

  // Rows and cells — includeEmpty: true captures styled-but-empty cells (spacer rows, etc.)
  src.eachRow({ includeEmpty: true }, (srcRow, rowNum) => {
    const destRow = dest.getRow(rowNum);
    if (srcRow.height) destRow.height = srcRow.height;
    srcRow.eachCell({ includeEmpty: true }, (srcCell, colNum) => {
      const destCell = destRow.getCell(colNum);
      // Slave cells of a merge carry no independent value
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
 * Fills a template worksheet with real data.
 * - Updates cell VALUES in place where cells already exist (styles are untouched).
 * - For rows / columns beyond the template's example data, copies styles from
 *   the nearest reference cell in the template's first data row.
 * - Clears excess template example rows when realDataRows < templateDataRows.
 */
function fillSheet(
  ws: ExcelJS.Worksheet,
  header: string[],
  dataRows: (string | number | null)[][],
  titleOverride?: string
) {
  const found = findHeader(ws);
  if (!found) return;
  const { rowNum: hRowNum, colNum: startCol } = found;
  const firstDataRowNum = hRowNum + 1;
  const templateDataCount = countTemplateDataRows(ws, hRowNum, startCol);

  // Update title (first string cell in startCol before header row)
  if (titleOverride) {
    for (let r = 1; r < hRowNum; r++) {
      const cell = ws.getRow(r).getCell(startCol);
      if (typeof cell.value === "string" && cell.value) {
        cell.value = titleOverride;
        ws.getRow(r).commit();
        break;
      }
    }
  }

  // Header row — update values only, styles are preserved
  const hRow = ws.getRow(hRowNum);
  for (let ci = 0; ci < header.length; ci++) {
    hRow.getCell(startCol + ci).value = header[ci];
  }
  // Clear any extra template header cells to the right of our header
  for (let c = startCol + header.length; ; c++) {
    const cell = hRow.getCell(c);
    if (cell.value === null || cell.value === undefined) break;
    cell.value = null;
  }
  hRow.commit();

  // Reference row: template's first data row — style source for extra rows/cols
  const refRow = ws.getRow(firstDataRowNum);
  let refColCount = 0;
  refRow.eachCell({ includeEmpty: false }, (_, colNum) => {
    refColCount = Math.max(refColCount, colNum - startCol + 1);
  });

  // Fill data rows
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

  // Group sessions by group, sorted by date
  const groupMap = new Map<string, { name: string; sessions: ReportSession[] }>();
  for (const s of sessions) {
    if (!groupMap.has(s.group_id))
      groupMap.set(s.group_id, { name: s.group_name, sessions: [] });
    groupMap.get(s.group_id)!.sessions.push(s);
  }
  for (const g of groupMap.values())
    g.sessions.sort((a, b) => a.date.localeCompare(b.date));

  // ── "Inicio": modify in place — image, freeze panes, and styles preserved ──
  const inicioWs = wb.getWorksheet("Inicio");
  if (inicioWs) {
    const inicioRows: (string | number | null)[][] = [];
    for (const g of groupMap.values()) {
      let present = 0, total = 0;
      for (const s of g.sessions)
        for (const r of s.records) {
          total++;
          if (r.status === "present") present++;
        }
      inicioRows.push([
        g.name,
        g.sessions.length,
        total > 0 ? `${Math.round((present / total) * 100)}%` : "—",
      ]);
    }
    fillSheet(inicioWs, ["Grupo", "Sesiones totales", "% Asistencia"], inicioRows);
  }

  // Keep a reference to the group template sheet BEFORE removing it
  const groupTemplateName = wb.worksheets.find((ws) => ws.name !== "Inicio")?.name;
  const groupTemplateWs = groupTemplateName
    ? wb.getWorksheet(groupTemplateName)
    : inicioWs;

  // Remove all template example group sheets
  const toRemove = wb.worksheets.filter((ws) => ws.name !== "Inicio");
  for (const ws of toRemove) wb.removeWorksheet(ws.id);

  // ── One sheet per real group ───────────────────────────────────────────────
  const usedNames = new Set<string>(["Inicio"]);

  for (const g of groupMap.values()) {
    const dates = g.sessions.map((s) => s.date);

    const studentMap = new Map<string, string>();
    for (const s of g.sessions)
      for (const r of s.records) studentMap.set(r.student_id, r.student_name);
    const students = [...studentMap.entries()].sort((a, b) =>
      a[1].localeCompare(b[1])
    );

    const dataRows: (string | number | null)[][] = [];
    for (const [sid, sname] of students) {
      let present = 0, total = 0;
      const row: (string | number | null)[] = [sname];
      for (const s of g.sessions) {
        const rec = s.records.find((r) => r.student_id === sid);
        if (rec) {
          total++;
          if (rec.status === "present") present++;
          row.push(STATUS_ES[rec.status] ?? rec.status);
        } else {
          row.push("—");
        }
      }
      row.push(total > 0 ? `${Math.round((present / total) * 100)}%` : "—");
      dataRows.push(row);
    }

    const sheetName = makeSheetName(g.name, usedNames);
    const groupWs = cloneWorksheet(wb, groupTemplateWs!, sheetName);
    fillSheet(
      groupWs,
      ["Alumno", ...dates, "% Asistencia"],
      dataRows,
      `Asistencia de ${g.name}`
    );
  }

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
