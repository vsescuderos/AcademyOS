"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { STATUS_LABEL, STATUS_COLOR, STATUS_BG } from "@/lib/constants";

type Group = { id: string; name: string };
type Session = { id: string; date: string };
type AttRecord = { student_id: string; status: string; students: { full_name: string } | null };

export default function DirectorAsistenciaView({ groups }: { groups: Group[] }) {
  const [groupId, setGroupId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [records, setRecords] = useState<AttRecord[] | null>(null);
  const [loadingRecords, setLoadingRecords] = useState(false);

  async function pickGroup(id: string) {
    if (id === groupId) {
      setGroupId(null); setSessions(null); setSessionId(null); setRecords(null);
      return;
    }
    setGroupId(id); setSessions(null); setSessionId(null); setRecords(null);
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
    if (id === sessionId) {
      setSessionId(null); setRecords(null);
      return;
    }
    setSessionId(id); setRecords(null);
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
        {groups.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--t3)" }}>No hay grupos en esta academia.</p>
        ) : (
          <div style={{ border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden" }}>
            {groups.map((g, gi) => {
              const isGroupSelected = groupId === g.id;
              const isLastGroup = gi === groups.length - 1;
              return (
                <div key={g.id}>
                  <ExpandRow
                    label={g.name}
                    isSelected={isGroupSelected}
                    hasBorder={!isLastGroup || isGroupSelected}
                    indent={0}
                    onClick={() => pickGroup(g.id)}
                  />

                  {isGroupSelected && (
                    <div style={{ borderBottom: isLastGroup ? "none" : "1px solid var(--line)" }}>
                      {loadingSessions ? (
                        <p style={{ padding: "16px 24px", fontSize: 13, color: "var(--t3)" }}>
                          Cargando sesiones…
                        </p>
                      ) : sessions?.length === 0 ? (
                        <p style={{ padding: "16px 24px", fontSize: 13, color: "var(--t3)" }}>
                          Sin sesiones registradas.
                        </p>
                      ) : (
                        sessions?.map((s, si) => {
                          const isSessionSelected = sessionId === s.id;
                          const isLastSession = si === (sessions?.length ?? 0) - 1;
                          return (
                            <div key={s.id}>
                              <ExpandRow
                                label={formatDate(s.date)}
                                isSelected={isSessionSelected}
                                hasBorder={!isLastSession || isSessionSelected}
                                indent={20}
                                onClick={() => pickSession(s.id)}
                              />

                              {isSessionSelected && (
                                <div style={{ borderBottom: isLastSession ? "none" : "1px solid var(--line)" }}>
                                  {loadingRecords ? (
                                    <p style={{ padding: "14px 44px", fontSize: 13, color: "var(--t3)" }}>
                                      Cargando…
                                    </p>
                                  ) : !records ? null : records.length === 0 ? (
                                    <p style={{ padding: "14px 44px", fontSize: 13, color: "var(--t3)" }}>
                                      Sin registros en esta sesión.
                                    </p>
                                  ) : records.map((r, ri) => (
                                    <div key={r.student_id} style={{
                                      display: "flex", alignItems: "center",
                                      padding: "10px 44px",
                                      borderBottom: ri < records.length - 1 ? "1px solid var(--line)" : "none",
                                      background: "var(--bg)",
                                    }}>
                                      <span style={{ flex: 1, fontSize: 13, color: "var(--t1)" }}>
                                        {r.students?.full_name ?? "—"}
                                      </span>
                                      <span style={{
                                        fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 4,
                                        background: STATUS_BG[r.status] ?? "var(--bg2)",
                                        color: STATUS_COLOR[r.status] ?? "var(--t3)",
                                      }}>
                                        {STATUS_LABEL[r.status] ?? r.status}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ExpandRow({ label, isSelected, hasBorder, indent, onClick }: {
  label: string;
  isSelected: boolean;
  hasBorder: boolean;
  indent: number;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", alignItems: "center",
        paddingTop: 12, paddingBottom: 12,
        paddingLeft: 20 + indent, paddingRight: 20,
        cursor: "pointer",
        background: isSelected ? "var(--accent-light)" : hovered ? "var(--bg2)" : indent > 0 ? "var(--bg2)" : "var(--bg)",
        borderLeft: `3px solid ${isSelected ? "var(--accent)" : "transparent"}`,
        borderBottom: hasBorder ? "1px solid var(--line)" : "none",
        transition: "background 0.12s",
        userSelect: "none",
      }}
    >
      <span style={{
        flex: 1,
        fontSize: indent > 0 ? 13 : 13.5,
        fontWeight: isSelected ? 500 : 400,
        color: isSelected ? "var(--accent)" : indent > 0 ? "var(--t2)" : "var(--t1)",
        textTransform: indent > 0 ? "capitalize" : "none",
      }}>
        {label}
      </span>
      <svg
        width="13" height="13" viewBox="0 0 24 24" fill="none"
        stroke={isSelected ? "var(--accent)" : "var(--t3)"}
        strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        style={{ flexShrink: 0, transform: isSelected ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  );
}
