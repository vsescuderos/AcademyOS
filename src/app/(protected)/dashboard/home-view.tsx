"use client";

import { useState } from "react";
import Link from "next/link";
import InformeAsistencia from "./informe-asistencia";

interface TodayGroup {
  id: string; name: string;
  time_start: string | null; time_end: string | null;
  profiles: { full_name: string } | null;
}
interface AbsentLateStudent { student_id: string; status: "absent" | "late"; full_name: string }

interface Props {
  hasAcademy: boolean;
  groupCount: number;
  professorCount: number;
  studentCount: number;
  todayGroups: TodayGroup[];
  absentLate: AbsentLateStudent[];
  userName: string;
  allGroups: { id: string; name: string }[];
}

function formatTime(t: string | null): string {
  return t ? t.slice(0, 5) : "";
}

const btnSecondary: React.CSSProperties = {
  padding: "8px 14px", borderRadius: 6, fontSize: 13, color: "var(--t2)",
  background: "transparent", border: "1px solid var(--line)", cursor: "pointer",
};

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 14px", border: "1px solid var(--line)", borderRadius: 20, fontSize: 12.5 }}>
      <span style={{ color: "var(--t3)" }}>{label}:</span>
      <span style={{ fontWeight: 600, color: "var(--t1)" }}>{value}</span>
    </div>
  );
}

function PanelSectionHeader({ title }: { title: string }) {
  return (
    <div style={{ padding: "14px 20px 10px", borderBottom: "1px solid var(--line)" }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)" }}>{title}</span>
    </div>
  );
}

export default function HomeView({
  hasAcademy, groupCount, professorCount, studentCount,
  todayGroups, absentLate, userName, allGroups,
}: Props) {
  const [showInformesMenu, setShowInformesMenu] = useState(false);
  const [showInformeAsistencia, setShowInformeAsistencia] = useState(false);

  const firstName = userName?.split(" ")[0] || "Director";

  // ── No academies yet ───────────────────────────────────────────────────────
  if (!hasAcademy) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{ height: 54, borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", padding: "0 28px", flexShrink: 0, background: "var(--bg)" }}>
          <span style={{ fontWeight: 600, fontSize: 16, color: "var(--t1)" }}>Inicio</span>
        </div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center", maxWidth: 360 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--t1)", marginBottom: 8 }}>
              Aún no tienes ninguna academia
            </h2>
            <p style={{ fontSize: 13.5, color: "var(--t2)", marginBottom: 24 }}>
              Crea tu primera academia desde la sección Configuración.
            </p>
            <Link
              href="/configuracion"
              style={{ display: "inline-block", padding: "9px 20px", borderRadius: 6, fontSize: 13, fontWeight: 600, color: "#fff", background: "var(--accent)", textDecoration: "none" }}
            >
              Ir a Configuración
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Dashboard ──────────────────────────────────────────────────────────────
  const todayLabel = new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Topbar */}
      <div style={{
        height: 54, borderBottom: "1px solid var(--line)", display: "flex",
        alignItems: "center", padding: "0 28px", justifyContent: "space-between",
        flexShrink: 0, background: "var(--bg)",
      }}>
        <span style={{ fontWeight: 600, fontSize: 16, color: "var(--t1)" }}>
          ¡Hola, {firstName}!
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowInformesMenu(v => !v)}
              style={{ ...btnSecondary, display: "flex", alignItems: "center", gap: 5 }}
            >
              Informes <span style={{ fontSize: 10 }}>▾</span>
            </button>
            {showInformesMenu && (
              <div
                style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.10)", minWidth: 200, zIndex: 100 }}
                onClick={() => setShowInformesMenu(false)}
              >
                <button
                  onClick={() => setShowInformeAsistencia(true)}
                  style={{ width: "100%", textAlign: "left", padding: "10px 16px", fontSize: 13, color: "var(--t1)", background: "none", border: "none", cursor: "pointer", borderRadius: 8 }}
                >
                  Informe de asistencia
                </button>
              </div>
            )}
          </div>
          <StatPill label="Grupos" value={groupCount} />
          <StatPill label="Profesores" value={professorCount} />
          <StatPill label="Alumnos" value={studentCount} />
        </div>
      </div>

      {showInformeAsistencia && (
        <InformeAsistencia groups={allGroups} onClose={() => setShowInformeAsistencia(false)} />
      )}

      {/* Content */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 280px", overflow: "hidden" }}>

        {/* Left column — today's schedule */}
        <div style={{ borderRight: "1px solid var(--line)", overflowY: "auto", padding: "20px 28px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
            <span suppressHydrationWarning style={{ fontSize: 15, fontWeight: 600, color: "var(--t1)" }}>
              Grupos de hoy — {todayLabel}
            </span>
          </div>

          {todayGroups.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--t3)" }}>No hay grupos programados para hoy.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {todayGroups.map(g => {
                const timeStr = [
                  g.time_start ? formatTime(g.time_start) : null,
                  g.time_end ? formatTime(g.time_end) : null,
                ].filter(Boolean).join(" – ");
                const meta = [timeStr, g.profiles?.full_name].filter(Boolean).join(" · ");
                return (
                  <div key={g.id} style={{
                    border: "1px solid var(--line)", borderLeft: "3px solid var(--accent)",
                    borderRadius: 6, padding: "12px 16px", background: "var(--bg)",
                  }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5, color: "var(--t1)" }}>{g.name}</div>
                    {meta && <div style={{ fontSize: 12, color: "var(--accent)", marginTop: 4 }}>{meta}</div>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div style={{ overflowY: "auto" }}>
          <PanelSectionHeader title="Asistencia hoy" />
          {absentLate.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--ok)", padding: "14px 20px", fontWeight: 500 }}>
              El 100% de los alumnos está en clase!
            </p>
          ) : (
            absentLate.map(s => (
              <div key={`${s.student_id}-${s.status}`} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 20px", borderBottom: "1px solid var(--line)",
              }}>
                <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--t1)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, marginRight: 10 }}>
                  {s.full_name}
                </span>
                <span style={{
                  fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 20, whiteSpace: "nowrap", flexShrink: 0,
                  background: s.status === "absent" ? "#fef2f2" : "var(--warn-dim)",
                  color: s.status === "absent" ? "var(--err)" : "var(--warn)",
                }}>
                  {s.status === "absent" ? "Ausente" : "Tarde"}
                </span>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}
