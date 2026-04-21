"use client";

import { useState, useRef, useTransition } from "react";
import { crearProfesoresBatch } from "@/actions/director";

type ParsedProfesor = { full_name: string; email: string; password: string };

async function downloadTemplate() {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.aoa_to_sheet([
    ["Nombre *", "Email *", "Contraseña *"],
    ["Ana García", "ana@academia.com", "Contraseña123"],
    ["Luis Pérez", "luis@academia.com", "Contraseña456"],
  ]);
  ws["!cols"] = [{ wch: 28 }, { wch: 28 }, { wch: 20 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Profesores");
  XLSX.writeFile(wb, "plantilla_profesores.xlsx");
}

async function parseFile(file: File): Promise<{ rows: ParsedProfesor[]; errors: string[] }> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" }) as unknown[][];

  const rows: ParsedProfesor[] = [];
  const errors: string[] = [];

  for (let i = 1; i < raw.length; i++) {
    const row = raw[i] as unknown[];
    const full_name = row[0] ? String(row[0]).trim() : "";
    const email = row[1] ? String(row[1]).trim() : "";
    const password = row[2] ? String(row[2]).trim() : "";

    if (!full_name) continue;

    if (!email || !password) {
      errors.push(`Fila ${i + 1} "${full_name}": email y contraseña son obligatorios.`);
      continue;
    }

    rows.push({ full_name, email, password });
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

export default function ExcelImportProfesores({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedProfesor[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [result, setResult] = useState<{ created: number; errors: string[] } | null>(null);
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
      const res = await crearProfesoresBatch(rows);
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
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--t1)", marginBottom: 16 }}>
        Importar profesores desde Excel
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
          Descarga la plantilla, rellena los profesores y súbela aquí. Columnas:{" "}
          <strong>Nombre</strong>, Email, Contraseña.
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
            {rows.length} profesores listos para importar:
          </p>
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, marginBottom: 14 }}
          >
            <thead>
              <tr style={{ background: "var(--bg2)" }}>
                {["Nombre", "Email"].map((h) => (
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
                  <td style={{ padding: "7px 12px", color: "var(--t1)" }}>{r.full_name}</td>
                  <td style={{ padding: "7px 12px", color: "var(--t2)" }}>{r.email}</td>
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
              {isPending ? "Importando…" : `Importar ${rows.length} profesores`}
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
            {result.created} profesor{result.created !== 1 ? "es" : ""} importado
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
                <p key={i} style={{ fontSize: 12.5, color: "var(--err)", margin: 0 }}>
                  {e}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
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
