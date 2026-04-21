"use client";

import { useState, useRef, useTransition } from "react";
import { crearGruposBatch } from "@/actions/director";

// Abbreviation and full name → DB key (full Spanish name)
const DAY_MAP: Record<string, string> = {
  l: "lunes", m: "martes", x: "miercoles", j: "jueves",
  v: "viernes", s: "sabado", d: "domingo",
  lunes: "lunes", martes: "martes",
  miercoles: "miercoles", "miércoles": "miercoles",
  jueves: "jueves", viernes: "viernes",
  sabado: "sabado", "sábado": "sabado", domingo: "domingo",
};

type ParsedGroup = {
  name: string;
  days: string[];
  time_start: string | null;
  time_end: string | null;
};

function parseTime(raw: unknown): string | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    const t = raw.trim();
    if (/^\d{1,2}:\d{2}/.test(t)) return t.slice(0, 5);
    return null;
  }
  if (typeof raw === "number") {
    // Excel stores time as fraction of day
    const mins = Math.round(raw * 1440);
    const h = Math.floor(mins / 60) % 24;
    const m = mins % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
  return null;
}

async function downloadTemplate() {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.aoa_to_sheet([
    ["Nombre *", "Días (L,M,X,J,V,S,D)", "Hora inicio", "Hora fin"],
    ["Grupo Avanzado", "L,M,X", "10:00", "11:00"],
    ["Grupo Básico", "J,V", "16:30", "18:00"],
  ]);
  ws["!cols"] = [{ wch: 30 }, { wch: 22 }, { wch: 14 }, { wch: 14 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Grupos");
  XLSX.writeFile(wb, "plantilla_grupos.xlsx");
}

async function parseFile(
  file: File
): Promise<{ rows: ParsedGroup[]; errors: string[] }> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    defval: "",
  }) as unknown[][];

  const rows: ParsedGroup[] = [];
  const errors: string[] = [];

  for (let i = 1; i < raw.length; i++) {
    const row = raw[i] as unknown[];
    const nameRaw = row[0];
    if (!nameRaw || String(nameRaw).trim() === "") continue;

    const name = String(nameRaw).trim();
    const daysRaw = row[1] ? String(row[1]).trim() : "";
    const days = daysRaw
      .split(/[\s,;]+/)
      .filter(Boolean)
      .map((d) => DAY_MAP[d.toLowerCase()])
      .filter((d): d is string => !!d);

    if (daysRaw && days.length === 0) {
      errors.push(
        `Fila ${i + 1} "${name}": días no reconocidos ("${daysRaw}"). Usa L,M,X,J,V,S,D.`
      );
    }

    rows.push({
      name,
      days,
      time_start: parseTime(row[2]),
      time_end: parseTime(row[3]),
    });
  }

  return { rows, errors };
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid var(--line)",
  borderRadius: 6,
  padding: "7px 10px",
  fontSize: 13,
  color: "var(--t1)",
  background: "var(--bg)",
  outline: "none",
};

export default function ExcelImportPanel({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedGroup[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [result, setResult] = useState<{
    created: number;
    errors: string[];
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const { rows: parsed, errors } = await parseFile(file);
    setRows(parsed);
    setParseErrors(errors);
    setResult(null);
  }

  function handleImport() {
    startTransition(async () => {
      const res = await crearGruposBatch(rows);
      setResult(res);
      if (res.created > 0) onSuccess();
    });
  }

  function reset() {
    setRows([]);
    setParseErrors([]);
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div
      style={{
        background: "var(--bg)",
        border: "1px solid var(--line)",
        borderRadius: 10,
        padding: 20,
        marginBottom: 16,
      }}
    >
      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: "var(--t1)",
          marginBottom: 16,
        }}
      >
        Importar grupos desde Excel
      </div>

      {/* Template download */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
          padding: "10px 14px",
          background: "var(--bg2)",
          borderRadius: 8,
          border: "1px solid var(--line)",
        }}
      >
        <div style={{ flex: 1, fontSize: 12.5, color: "var(--t2)" }}>
          Descarga la plantilla, rellena los grupos y súbela aquí. Columnas:{" "}
          <strong>Nombre</strong>, Días (L,M,X,J,V,S,D), Hora inicio, Hora fin.
        </div>
        <button
          onClick={downloadTemplate}
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: "var(--accent)",
            background: "transparent",
            border: "1px solid var(--accent-border)",
            borderRadius: 6,
            padding: "5px 12px",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Descargar plantilla
        </button>
      </div>

      {/* File picker */}
      {rows.length === 0 && !result && (
        <label style={{ display: "block", cursor: "pointer" }}>
          <div
            style={{
              border: "2px dashed var(--line)",
              borderRadius: 8,
              padding: "28px 20px",
              textAlign: "center",
              color: "var(--t3)",
              fontSize: 13,
              transition: "border-color 0.12s",
            }}
          >
            Haz clic para seleccionar un archivo .xlsx
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
        </label>
      )}

      {/* Parse errors */}
      {parseErrors.length > 0 && (
        <div
          style={{
            marginTop: 12,
            padding: "10px 14px",
            background: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: 6,
          }}
        >
          {parseErrors.map((e, i) => (
            <p key={i} style={{ fontSize: 12.5, color: "var(--warn)", margin: 0 }}>
              {e}
            </p>
          ))}
        </div>
      )}

      {/* Preview */}
      {rows.length > 0 && !result && (
        <div style={{ marginTop: 12 }}>
          <p style={{ fontSize: 12.5, color: "var(--t2)", marginBottom: 8 }}>
            {rows.length} grupos listos para importar:
          </p>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 12.5,
              marginBottom: 14,
            }}
          >
            <thead>
              <tr style={{ background: "var(--bg2)" }}>
                {["Nombre", "Días", "Horario"].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      padding: "6px 12px",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--t3)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      borderBottom: "1px solid var(--line)",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--line)" }}>
                  <td style={{ padding: "7px 12px", color: "var(--t1)" }}>
                    {r.name}
                  </td>
                  <td style={{ padding: "7px 12px", color: "var(--t2)" }}>
                    {r.days.length > 0 ? r.days.map((d) => d[0].toUpperCase()).join(",") : "—"}
                  </td>
                  <td style={{ padding: "7px 12px", color: "var(--t2)" }}>
                    {r.time_start && r.time_end
                      ? `${r.time_start} – ${r.time_end}`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              onClick={handleImport}
              disabled={isPending}
              style={{
                fontSize: 12.5,
                fontWeight: 500,
                color: "#fff",
                border: "none",
                borderRadius: 6,
                padding: "6px 16px",
                background: "var(--accent)",
                cursor: "pointer",
                opacity: isPending ? 0.6 : 1,
              }}
            >
              {isPending ? "Importando…" : `Importar ${rows.length} grupos`}
            </button>
            <button
              onClick={reset}
              style={{
                fontSize: 12.5,
                color: "var(--t2)",
                border: "1px solid var(--line)",
                borderRadius: 6,
                padding: "6px 12px",
                background: "transparent",
                cursor: "pointer",
              }}
            >
              Cambiar archivo
            </button>
          </div>
        </div>
      )}

      {/* Import result */}
      {result && (
        <div style={{ marginTop: 12 }}>
          <p
            style={{
              fontSize: 13,
              color: "var(--ok)",
              background: "var(--ok-dim)",
              borderRadius: 6,
              padding: "8px 12px",
              marginBottom: result.errors.length > 0 ? 8 : 0,
            }}
          >
            {result.created} grupo{result.created !== 1 ? "s" : ""} importado
            {result.created !== 1 ? "s" : ""} correctamente.
          </p>
          {result.errors.length > 0 && (
            <div
              style={{
                padding: "10px 14px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 6,
              }}
            >
              {result.errors.map((e, i) => (
                <p
                  key={i}
                  style={{ fontSize: 12.5, color: "var(--err)", margin: 0 }}
                >
                  {e}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginTop: 16,
        }}
      >
        <button
          onClick={onCancel}
          style={{
            fontSize: 12.5,
            color: "var(--t2)",
            border: "1px solid var(--line)",
            borderRadius: 6,
            padding: "6px 14px",
            background: "transparent",
            cursor: "pointer",
          }}
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
