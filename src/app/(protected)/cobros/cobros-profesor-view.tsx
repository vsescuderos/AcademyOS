"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";

interface Student { id: string; full_name: string }
interface TodayCobro {
  id: string;
  amount: number;
  concept: string;
  method: string;
  status: string;
  receipt_number: number | null;
  registered_at: string;
  student_name: string;
}
interface Props {
  students: Student[];
  todayCobros: TodayCobro[];
}

const inputStyle: React.CSSProperties = {
  border: "1px solid var(--line)", borderRadius: 6, padding: "8px 11px",
  fontSize: 13, color: "var(--t1)", background: "var(--bg)", outline: "none", width: "100%",
};
const labelStyle: React.CSSProperties = {
  fontSize: 12.5, fontWeight: 600, color: "var(--t2)", marginBottom: 5, display: "block",
};
const btnPrimary: React.CSSProperties = {
  padding: "9px 20px", borderRadius: 6, fontSize: 13, fontWeight: 600,
  color: "#fff", background: "var(--accent)", border: "none", cursor: "pointer",
};
const btnSecondary: React.CSSProperties = {
  padding: "8px 14px", borderRadius: 6, fontSize: 13, color: "var(--t2)",
  background: "transparent", border: "1px solid var(--line)", cursor: "pointer",
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

function formatReceiptNumber(n: number | null): string {
  if (n == null) return "—";
  return "REC-" + String(n).padStart(4, "0");
}

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
               "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function buildMonthOptions(): string[] {
  const now = new Date();
  const opts: string[] = [];
  for (let off = -6; off <= 3; off++) {
    const d = new Date(now.getFullYear(), now.getMonth() + off, 1);
    opts.push(`Mensualidad ${MESES[d.getMonth()]} ${d.getFullYear()}`);
  }
  return opts;
}

function currentMonthConcept(): string {
  const now = new Date();
  return `Mensualidad ${MESES[now.getMonth()]} ${now.getFullYear()}`;
}

export default function CobrosProfesorView({ students, todayCobros }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [amount, setAmount] = useState("");
  const [concept, setConcept] = useState(currentMonthConcept);
  const [method, setMethod] = useState<"cash" | "card">("cash");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [localCobros, setLocalCobros] = useState<TodayCobro[]>(todayCobros);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filtered = students.filter(s =>
    s.full_name.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 8);

  function selectStudent(s: Student) {
    setSelectedStudent(s);
    setSearch(s.full_name);
    setShowDropdown(false);
  }

  function handleSearchChange(val: string) {
    setSearch(val);
    setSelectedStudent(null);
    setShowDropdown(true);
  }

  function canSubmit() {
    return selectedStudent && parseFloat(amount) > 0 && concept.trim().length > 0 && !isPending;
  }

  function handleSubmit() {
    if (!canSubmit()) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/cobros/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: selectedStudent!.id,
          amount: parseFloat(amount),
          concept: concept.trim(),
          method,
          notes: notes.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error ?? "Error registrando cobro");
        return;
      }

      // Download PDF automatically
      const blob = b64toBlob(data.pdfBase64, "application/pdf");
      downloadBlob(blob, `${formatReceiptNumber(data.receiptNumber)}.pdf`);

      // Add to local list
      setLocalCobros(prev => [{
        id: data.paymentId,
        amount: parseFloat(amount),
        concept: concept.trim(),
        method,
        status: "reported",
        receipt_number: data.receiptNumber,
        registered_at: new Date().toISOString(),
        student_name: selectedStudent!.full_name,
      }, ...prev]);

      // Reset form
      setSelectedStudent(null);
      setSearch("");
      setAmount("");
      setConcept(currentMonthConcept());
      setNotes("");
      setMethod("cash");
      router.refresh();
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{
        height: 54, borderBottom: "1px solid var(--line)", display: "flex",
        alignItems: "center", padding: "0 28px", flexShrink: 0, background: "var(--bg)",
      }}>
        <span style={{ fontWeight: 600, fontSize: 16, color: "var(--t1)" }}>Cobros</span>
      </div>

      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "380px 1fr", overflow: "hidden" }}>
        {/* Form */}
        <div style={{ borderRight: "1px solid var(--line)", overflowY: "auto", padding: "24px 28px" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--t1)", marginBottom: 20 }}>
            Registrar cobro
          </div>

          {error && (
            <p style={{ fontSize: 12.5, color: "var(--err)", background: "#fef2f2", borderRadius: 6, padding: "8px 12px", marginBottom: 16 }}>
              {error}
            </p>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Student search */}
            <div style={{ position: "relative" }}>
              <label style={labelStyle}>Alumno</label>
              <input
                value={search}
                onChange={e => handleSearchChange(e.target.value)}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                placeholder="Buscar alumno…"
                style={inputStyle}
              />
              {showDropdown && search.length > 0 && filtered.length > 0 && (
                <div ref={dropdownRef} style={{
                  position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 50,
                  background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 8,
                  boxShadow: "0 4px 16px rgba(0,0,0,0.10)", overflow: "hidden",
                }}>
                  {filtered.map(s => (
                    <button
                      key={s.id}
                      onMouseDown={() => selectStudent(s)}
                      style={{
                        display: "block", width: "100%", textAlign: "left",
                        padding: "9px 14px", fontSize: 13, color: "var(--t1)",
                        background: "none", border: "none", cursor: "pointer",
                        borderBottom: "1px solid var(--line)",
                      }}
                    >
                      {s.full_name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Amount */}
            <div>
              <label style={labelStyle}>Importe (€)</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                style={inputStyle}
              />
            </div>

            {/* Concept */}
            <div>
              <label style={labelStyle}>Concepto</label>
              <select
                value={concept}
                onChange={e => setConcept(e.target.value)}
                style={inputStyle}
              >
                {buildMonthOptions().map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            {/* Method */}
            <div>
              <label style={labelStyle}>Método de pago</label>
              <div style={{ display: "flex", gap: 8 }}>
                {(["cash", "card"] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setMethod(m)}
                    style={{
                      flex: 1, padding: "8px 0", borderRadius: 6, fontSize: 13, fontWeight: 500,
                      border: `1px solid ${method === m ? "var(--accent)" : "var(--line)"}`,
                      background: method === m ? "var(--accent-light)" : "transparent",
                      color: method === m ? "var(--accent)" : "var(--t2)",
                      cursor: "pointer",
                    }}
                  >
                    {m === "cash" ? "Efectivo" : "Tarjeta"}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label style={labelStyle}>Notas (opcional)</label>
              <input
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder=""
                style={inputStyle}
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={!canSubmit()}
              style={{ ...btnPrimary, opacity: !canSubmit() ? 0.5 : 1, marginTop: 4 }}
            >
              {isPending ? "Registrando…" : "Registrar y generar recibo"}
            </button>
          </div>
        </div>

        {/* Today's cobros */}
        <div style={{ overflowY: "auto" }}>
          <div style={{ padding: "14px 20px 10px", borderBottom: "1px solid var(--line)" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)" }}>
              Cobros de hoy ({localCobros.length})
            </span>
          </div>

          {localCobros.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--t3)", padding: "20px" }}>
              Aún no has registrado ningún cobro hoy.
            </p>
          ) : (
            localCobros.map(c => (
              <div key={c.id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 20px", borderBottom: "1px solid var(--line)", gap: 12,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.student_name}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--t3)", marginTop: 2 }}>
                    {c.concept} · {c.method === "cash" ? "Efectivo" : "Tarjeta"} · {formatTime(c.registered_at)}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--t1)" }}>
                    {c.amount.toFixed(2)} €
                  </div>
                  <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 2 }}>
                    {formatReceiptNumber(c.receipt_number)}
                  </div>
                </div>
                {c.receipt_number != null && (
                  <a
                    href={`/api/cobros/pdf/${c.receipt_number}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ ...btnSecondary, fontSize: 12, textDecoration: "none", padding: "5px 10px" }}
                  >
                    PDF
                  </a>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function b64toBlob(b64: string, type: string): Blob {
  const bytes = atob(b64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
