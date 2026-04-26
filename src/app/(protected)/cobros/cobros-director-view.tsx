"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface Cobro {
  id: string;
  amount: number;
  concept: string;
  method: string;
  status: string;
  receipt_number: number | null;
  notes: string | null;
  registered_at: string;
  validated_at: string | null;
  student_name: string;
  profesor_name: string;
}
interface Props { cobros: Cobro[] }

const btnSecondary: React.CSSProperties = {
  padding: "5px 10px", borderRadius: 6, fontSize: 12, color: "var(--t2)",
  background: "transparent", border: "1px solid var(--line)", cursor: "pointer",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "2-digit" }) +
    " " + d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

function formatReceiptNumber(n: number | null): string {
  if (n == null) return "—";
  return "REC-" + String(n).padStart(4, "0");
}

export default function CobrosDirectorView({ cobros }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "reported" | "validated">("all");
  const [validating, setValidating] = useState<string | null>(null);
  const [localCobros, setLocalCobros] = useState<Cobro[]>(cobros);

  const filtered = localCobros.filter(c => {
    if (filterStatus !== "all" && c.status !== filterStatus) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!c.student_name.toLowerCase().includes(q) &&
          !c.concept.toLowerCase().includes(q) &&
          !c.profesor_name.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const pendingCount = localCobros.filter(c => c.status === "reported").length;
  const totalValidated = localCobros
    .filter(c => c.status === "validated")
    .reduce((sum, c) => sum + c.amount, 0);

  function handleValidate(id: string) {
    setValidating(id);
    startTransition(async () => {
      const res = await fetch("/api/cobros/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_id: id }),
      });
      if (res.ok) {
        setLocalCobros(prev => prev.map(c =>
          c.id === id ? { ...c, status: "validated", validated_at: new Date().toISOString() } : c
        ));
        router.refresh();
      }
      setValidating(null);
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Topbar */}
      <div style={{
        height: 54, borderBottom: "1px solid var(--line)", display: "flex",
        alignItems: "center", padding: "0 28px", gap: 16, flexShrink: 0, background: "var(--bg)",
      }}>
        <span style={{ fontWeight: 600, fontSize: 16, color: "var(--t1)", flex: 1 }}>Cobros</span>
        {pendingCount > 0 && (
          <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: "var(--warn-dim)", color: "var(--warn)" }}>
            {pendingCount} pendiente{pendingCount > 1 ? "s" : ""}
          </span>
        )}
        <span style={{ fontSize: 12.5, color: "var(--t2)" }}>
          Validado: <strong style={{ color: "var(--ok)" }}>{totalValidated.toFixed(2)} €</strong>
        </span>
      </div>

      {/* Filters */}
      <div style={{
        padding: "12px 28px", borderBottom: "1px solid var(--line)", display: "flex", gap: 10, alignItems: "center", flexShrink: 0,
      }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar alumno, concepto o profesor…"
          style={{
            border: "1px solid var(--line)", borderRadius: 6, padding: "7px 11px",
            fontSize: 13, color: "var(--t1)", background: "var(--bg)", outline: "none", width: 280,
          }}
        />
        {(["all", "reported", "validated"] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            style={{
              padding: "6px 14px", borderRadius: 6, fontSize: 12.5, fontWeight: 500,
              border: `1px solid ${filterStatus === s ? "var(--accent)" : "var(--line)"}`,
              background: filterStatus === s ? "var(--accent-light)" : "transparent",
              color: filterStatus === s ? "var(--accent)" : "var(--t2)",
              cursor: "pointer",
            }}
          >
            {s === "all" ? "Todos" : s === "reported" ? "Pendientes" : "Validados"}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {filtered.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--t3)", padding: "24px 28px" }}>
            No hay cobros que coincidan con los filtros.
          </p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--line)", background: "var(--bg2)" }}>
                {["Recibo", "Alumno", "Concepto", "Importe", "Método", "Profesor", "Fecha", "Estado", ""].map(h => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11.5, fontWeight: 600, color: "var(--t3)", whiteSpace: "nowrap" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} style={{ borderBottom: "1px solid var(--line)" }}>
                  <td style={{ padding: "10px 16px", fontFamily: "monospace", fontSize: 12, color: "var(--t2)", whiteSpace: "nowrap" }}>
                    {formatReceiptNumber(c.receipt_number)}
                  </td>
                  <td style={{ padding: "10px 16px", fontWeight: 500, color: "var(--t1)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.student_name}
                  </td>
                  <td style={{ padding: "10px 16px", color: "var(--t2)", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.concept}
                  </td>
                  <td style={{ padding: "10px 16px", fontWeight: 600, color: "var(--t1)", whiteSpace: "nowrap" }}>
                    {c.amount.toFixed(2)} €
                  </td>
                  <td style={{ padding: "10px 16px", color: "var(--t2)", whiteSpace: "nowrap" }}>
                    {c.method === "cash" ? "Efectivo" : "Tarjeta"}
                  </td>
                  <td style={{ padding: "10px 16px", color: "var(--t2)", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.profesor_name}
                  </td>
                  <td style={{ padding: "10px 16px", color: "var(--t3)", whiteSpace: "nowrap", fontSize: 12 }}>
                    {formatDate(c.registered_at)}
                  </td>
                  <td style={{ padding: "10px 16px", whiteSpace: "nowrap" }}>
                    <span style={{
                      fontSize: 11.5, fontWeight: 600, padding: "3px 9px", borderRadius: 20,
                      background: c.status === "validated" ? "var(--ok-dim)" : c.status === "reported" ? "var(--warn-dim)" : "#f3f4f6",
                      color: c.status === "validated" ? "var(--ok)" : c.status === "reported" ? "var(--warn)" : "var(--t3)",
                    }}>
                      {c.status === "validated" ? "Validado" : c.status === "reported" ? "Pendiente" : c.status}
                    </span>
                  </td>
                  <td style={{ padding: "10px 16px", whiteSpace: "nowrap" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      {c.receipt_number != null && (
                        <a
                          href={`/api/cobros/pdf/${c.receipt_number}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ ...btnSecondary, textDecoration: "none" }}
                        >
                          PDF
                        </a>
                      )}
                      {c.status === "reported" && (
                        <button
                          onClick={() => handleValidate(c.id)}
                          disabled={isPending && validating === c.id}
                          style={{
                            padding: "5px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                            color: "#fff", background: "var(--ok)", border: "none", cursor: "pointer",
                            opacity: isPending && validating === c.id ? 0.6 : 1,
                          }}
                        >
                          {isPending && validating === c.id ? "…" : "Validar"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
