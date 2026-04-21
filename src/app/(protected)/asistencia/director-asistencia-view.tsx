"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Group = { id: string; name: string };
type Session = { id: string; date: string };
type AttRecord = { student_id: string; status: string; students: { full_name: string } | null };

const STATUS_LABEL: Record<string, string> = { present: "Presente", absent: "Ausente", late: "Tarde" };
const STATUS_COLOR: Record<string, string> = {
  present: "var(--ok)",
  absent: "var(--err)",
  late: "var(--warn)",
};

export default function DirectorAsistenciaView({ groups }: { groups: Group[] }) {
  const [groupId, setGroupId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [records, setRecords] = useState<AttRecord[] | null>(null);
  const [loadingRecords, setLoadingRecords] = useState(false);

  async function pickGroup(id: string) {
    if (id === groupId) return;
    setGroupId(id);
    setSessions(null);
    setSessionId(null);
    setRecords(null);
    setLoadingSessions(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("attendance_sessions")
      .select("id, date")
      .eq("group_id", id)
      .order("date", { ascending: false });
    setSessions(data ?? []);
    setLoadingSessions(false);
  }

  async function pickSession(id: string) {
    if (id === sessionId) return;
    setSessionId(id);
    setRecords(null);
    setLoadingRecords(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("attendance_records")
      .select("student_id, status, students(full_name)")
      .eq("session_id", id);
    setRecords((data ?? []) as unknown as AttRecord[]);
    setLoadingRecords(false);
  }

  function formatDate(d: string) {
    return new Date(d + "T00:00:00").toLocaleDateString("es-ES", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{
        height: 54, borderBottom: "1px solid var(--line)", display: "flex",
        alignItems: "center", padding: "0 28px", justifyContent: "space-between",
        flexShrink: 0, background: "var(--bg)",
      }}>
        <span style={{ fontWeight: 600, fontSize: 16, color: "var(--t1)" }}>Asistencia</span>
        <span style={{
          fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
          background: "var(--bg2)", color: "var(--t3)", border: "1px solid var(--line)",
        }}>
          Solo lectura
        </span>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
        <Section label="Grupos">
          {groups.length === 0
            ? <p style={{ fontSize: 13, color: "var(--t3)" }}>No hay grupos en esta academia.</p>
            : groups.map((g) => (
              <NavButton key={g.id} label={g.name} active={groupId === g.id} onClick={() => pickGroup(g.id)} />
            ))
          }
        </Section>

        {groupId && (
          <Section label="Sesiones">
            {loadingSessions
              ? <p style={{ fontSize: 13, color: "var(--t3)" }}>Cargando…</p>
              : sessions?.length === 0
                ? <p style={{ fontSize: 13, color: "var(--t3)" }}>Sin sesiones registradas.</p>
                : sessions?.map((s) => (
                  <NavButton
                    key={s.id}
                    label={formatDate(s.date)}
                    active={sessionId === s.id}
                    onClick={() => pickSession(s.id)}
                  />
                ))
            }
          </Section>
        )}

        {sessionId && (
          <div>
            {loadingRecords
              ? <p style={{ fontSize: 13, color: "var(--t3)" }}>Cargando…</p>
              : records && (
                records.length === 0
                  ? <p style={{ fontSize: 13, color: "var(--t3)" }}>Sin registros en esta sesión.</p>
                  : (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ background: "var(--bg2)" }}>
                          {["Alumno", "Estado"].map((col) => (
                            <th key={col} style={{
                              textAlign: "left", padding: "9px 20px", fontSize: 11, fontWeight: 600,
                              color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.06em",
                              borderBottom: "1px solid var(--line)",
                            }}>
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {records.map((r) => (
                          <tr key={r.student_id}>
                            <td style={{ padding: "11px 20px", borderBottom: "1px solid var(--line)", fontSize: 13, color: "var(--t1)" }}>
                              {r.students?.full_name ?? "—"}
                            </td>
                            <td style={{ padding: "11px 20px", borderBottom: "1px solid var(--line)", fontSize: 13, fontWeight: 500, color: STATUS_COLOR[r.status] ?? "var(--t2)" }}>
                              {STATUS_LABEL[r.status] ?? r.status}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )
              )
            }
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        fontSize: 10, fontWeight: 600, color: "var(--t3)",
        textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10,
      }}>
        {label}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {children}
      </div>
    </div>
  );
}

function NavButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        textAlign: "left", padding: "10px 14px", borderRadius: 6, fontSize: 13,
        fontWeight: active ? 500 : 400, cursor: "pointer",
        border: `1px solid ${active ? "var(--accent-border)" : hovered ? "#d1d5db" : "var(--line)"}`,
        background: active ? "var(--accent-light)" : "var(--bg)",
        color: active ? "var(--accent)" : "var(--t1)",
        transition: "all 0.12s",
      }}
    >
      {label}
    </button>
  );
}
