"use client";

import { useState, useTransition } from "react";

type Group = { id: string; name: string };
type Period = "mes" | "trimestre" | "curso" | "personalizado";

interface Props {
  groups: Group[];
  onClose: () => void;
}

const inputStyle: React.CSSProperties = {
  border: "1px solid var(--line)", borderRadius: 6, padding: "7px 10px",
  fontSize: 13, color: "var(--t1)", background: "var(--bg)", outline: "none",
};

function getDateRange(period: Period, customStart: string, customEnd: string) {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  if (period === "mes")
    return { start: new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10), end: todayStr };
  if (period === "trimestre") {
    const q = Math.floor(today.getMonth() / 3);
    return { start: new Date(today.getFullYear(), q * 3, 1).toISOString().slice(0, 10), end: todayStr };
  }
  if (period === "curso") {
    const year = today.getMonth() >= 8 ? today.getFullYear() : today.getFullYear() - 1;
    return { start: `${year}-09-01`, end: todayStr };
  }
  return { start: customStart, end: customEnd };
}

export default function InformeAsistencia({ groups, onClose }: Props) {
  const [period, setPeriod] = useState<Period>("mes");
  const [customStart, setCustomStart] = useState(new Date().toISOString().slice(0, 7) + "-01");
  const [customEnd, setCustomEnd] = useState(new Date().toISOString().slice(0, 10));
  const [groupSel, setGroupSel] = useState<"all" | "custom">("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggleGroup(id: string) {
    setSelectedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }

  function handleExport() {
    const { start, end } = getDateRange(period, customStart, customEnd);
    if (!start || !end) { setError("Selecciona el período de fechas."); return; }
    if (start > end) { setError("La fecha de inicio debe ser anterior a la fecha de fin."); return; }
    const groupIds = groupSel === "all" ? null : [...selectedIds];
    if (groupSel === "custom" && groupIds!.length === 0) { setError("Selecciona al menos un grupo."); return; }
    setError(null);

    startTransition(async () => {
      try {
        const resp = await fetch("/api/reports/attendance-excel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ startDate: start, endDate: end, groupIds }),
        });

        if (!resp.ok) {
          const json = await resp.json().catch(() => ({}));
          setError((json as { error?: string }).error ?? "Error al generar el informe.");
          return;
        }

        const blob = await resp.blob();
        const label = period === "personalizado" ? `${start}_${end}` : period;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `informe-asistencia-${label}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
      } catch {
        setError("Error al generar el informe.");
      }
    });
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
      onClick={onClose}>
      <div style={{ background: "var(--bg)", borderRadius: 12, padding: "28px 32px", width: 480, maxHeight: "85vh", overflowY: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.14)" }}
        onClick={e => e.stopPropagation()}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: "var(--t1)" }}>Informe de asistencia</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--t3)", lineHeight: 1 }}>✕</button>
        </div>

        {/* Período */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Período</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
            {(["mes", "trimestre", "curso", "personalizado"] as Period[]).map(p => (
              <label key={p} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--t1)", cursor: "pointer" }}>
                <input type="radio" checked={period === p} onChange={() => setPeriod(p)} style={{ cursor: "pointer" }} />
                {p === "mes" ? "Este mes" : p === "trimestre" ? "Este trimestre" : p === "curso" ? "Curso actual" : "Personalizado"}
              </label>
            ))}
          </div>
          {period === "personalizado" && (
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
              <span style={{ fontSize: 12, color: "var(--t3)" }}>hasta</span>
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
            </div>
          )}
        </div>

        {/* Grupos */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Grupos</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--t1)", cursor: "pointer" }}>
              <input type="radio" checked={groupSel === "all"} onChange={() => setGroupSel("all")} style={{ cursor: "pointer" }} />
              Todos los grupos
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--t1)", cursor: "pointer" }}>
              <input type="radio" checked={groupSel === "custom"} onChange={() => setGroupSel("custom")} style={{ cursor: "pointer" }} />
              Seleccionar grupos
            </label>
          </div>
          {groupSel === "custom" && (
            <div style={{ marginTop: 10, maxHeight: 160, overflowY: "auto", border: "1px solid var(--line)", borderRadius: 8, padding: "8px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
              {groups.map(g => (
                <label key={g.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--t1)", cursor: "pointer" }}>
                  <input type="checkbox" checked={selectedIds.has(g.id)} onChange={() => toggleGroup(g.id)} style={{ cursor: "pointer" }} />
                  {g.name}
                </label>
              ))}
            </div>
          )}
        </div>

        {error && (
          <p style={{ fontSize: 12.5, color: "var(--err)", background: "#fef2f2", borderRadius: 6, padding: "8px 12px", marginBottom: 16 }}>{error}</p>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 6, fontSize: 13, color: "var(--t2)", background: "transparent", border: "1px solid var(--line)", cursor: "pointer" }}>
            Cancelar
          </button>
          <button onClick={handleExport} disabled={isPending} style={{ padding: "8px 16px", borderRadius: 6, fontSize: 13, fontWeight: 500, color: "#fff", background: "var(--accent)", border: "none", cursor: "pointer", opacity: isPending ? 0.6 : 1 }}>
            {isPending ? "Generando…" : "Exportar Excel"}
          </button>
        </div>
      </div>
    </div>
  );
}
