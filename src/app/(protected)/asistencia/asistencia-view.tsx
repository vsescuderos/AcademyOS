"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { confirmarAsistencia } from "@/actions/asistencia";
import { ATTENDANCE_STATUSES } from "@/lib/constants";

type Group = { id: string; name: string };
type Student = { id: string; full_name: string };
type AttendanceMap = Record<string, "present" | "absent" | "late">;
type GroupState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "pending"; students: Student[] }
  | { status: "confirmed"; students: Student[]; records: AttendanceMap };

const STATUSES = ATTENDANCE_STATUSES;

export default function AsistenciaView({ groups }: { groups: Group[] }) {
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [groupState, setGroupState] = useState<GroupState>({ status: "idle" });
  const [attendance, setAttendance] = useState<AttendanceMap>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function selectGroup(groupId: string) {
    if (groupId === selectedGroupId) {
      setSelectedGroupId(null);
      setGroupState({ status: "idle" });
      return;
    }
    setSelectedGroupId(groupId);
    setAttendance({});
    setSaveError(null);
    setGroupState({ status: "loading" });

    const supabase = createClient();
    const today = new Date().toISOString().split("T")[0];

    const { data: gsData } = await supabase
      .from("group_students")
      .select("students(id, full_name)")
      .eq("group_id", groupId);

    const students: Student[] = (gsData ?? [])
      .map((d) => (d as unknown as { students: Student }).students)
      .filter(Boolean);

    const { data: session } = await supabase
      .from("attendance_sessions")
      .select("id")
      .eq("group_id", groupId)
      .eq("date", today)
      .maybeSingle();

    if (!session) {
      setGroupState({ status: "pending", students });
      return;
    }

    const { data: records } = await supabase
      .from("attendance_records")
      .select("student_id, status")
      .eq("session_id", session.id);

    const recordsMap: AttendanceMap = {};
    for (const r of records ?? []) {
      if (r.status === "present" || r.status === "absent" || r.status === "late") {
        recordsMap[r.student_id] = r.status;
      }
    }

    setGroupState({ status: "confirmed", students, records: recordsMap });
  }

  async function handleConfirmar() {
    if (!selectedGroupId || groupState.status !== "pending") return;
    const allMarked = groupState.students.every((s) => attendance[s.id]);
    if (!allMarked) return;

    setSaving(true);
    setSaveError(null);
    const result = await confirmarAsistencia(selectedGroupId, attendance);
    if (result.error) {
      setSaveError(result.error);
    } else {
      setGroupState({ status: "confirmed", students: groupState.students, records: { ...attendance } });
    }
    setSaving(false);
  }

  const today = new Date().toLocaleDateString("es-ES", {
    weekday: "long", day: "numeric", month: "long",
  });

  const allMarked =
    groupState.status === "pending" &&
    groupState.students.every((s) => attendance[s.id]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{
        height: 54, borderBottom: "1px solid var(--line)", display: "flex",
        alignItems: "center", padding: "0 28px", justifyContent: "space-between",
        flexShrink: 0, background: "var(--bg)",
      }}>
        <span style={{ fontWeight: 600, fontSize: 16, color: "var(--t1)" }}>Asistencia</span>
        <span style={{ fontSize: 12.5, color: "var(--t3)", textTransform: "capitalize" }}>{today}</span>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
        {groups.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--t3)" }}>No tienes grupos asignados.</p>
        ) : (
          <div style={{ border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden" }}>
            {groups.map((g, i) => {
              const isSelected = selectedGroupId === g.id;
              const isLast = i === groups.length - 1;
              const isPending = groupState.status === "pending";
              return (
                <div key={g.id}>
                  <GroupRow
                    label={g.name}
                    isSelected={isSelected}
                    hasBorder={!isLast || isSelected}
                    onClick={() => selectGroup(g.id)}
                  />

                  {isSelected && (
                    <div style={{ borderBottom: isLast ? "none" : "1px solid var(--line)" }}>
                      {groupState.status === "loading" && (
                        <p style={{ padding: "20px 24px", fontSize: 13, color: "var(--t3)" }}>
                          Cargando alumnos…
                        </p>
                      )}

                      {(groupState.status === "pending" || groupState.status === "confirmed") && (
                        groupState.students.length === 0 ? (
                          <p style={{ padding: "20px 24px", fontSize: 13, color: "var(--t3)" }}>
                            No hay alumnos en este grupo.
                          </p>
                        ) : (
                          <>
                            {groupState.status === "confirmed" && (
                              <div style={{
                                padding: "10px 20px",
                                borderBottom: "1px solid var(--line)",
                                background: "var(--ok-dim)",
                                fontSize: 12.5,
                                color: "var(--ok)",
                                fontWeight: 500,
                              }}>
                                ✓ Asistencia ya confirmada hoy
                              </div>
                            )}

                            {groupState.students.map((student, si) => {
                              const isConfirmed = groupState.status === "confirmed";
                              const currentStatus = isConfirmed
                                ? groupState.records[student.id]
                                : attendance[student.id];
                              const isLastStudent = si === groupState.students.length - 1;
                              return (
                                <StudentRow
                                  key={student.id}
                                  student={student}
                                  currentStatus={currentStatus}
                                  disabled={isConfirmed}
                                  hasBorder={isPending || !isLastStudent}
                                  onChange={(val) => setAttendance((a) => ({ ...a, [student.id]: val }))}
                                />
                              );
                            })}

                            {isPending && (
                              <div style={{ padding: "14px 20px", background: "var(--bg2)" }}>
                                {saveError && (
                                  <p style={{
                                    marginBottom: 10, fontSize: 12.5, color: "var(--err)",
                                    background: "#fef2f2", borderRadius: 6, padding: "8px 14px",
                                  }}>
                                    {saveError}
                                  </p>
                                )}
                                <button
                                  onClick={handleConfirmar}
                                  disabled={!allMarked || saving}
                                  style={{
                                    width: "100%", padding: "10px", borderRadius: 6,
                                    fontSize: 13, fontWeight: 500, color: "#fff",
                                    background: "var(--accent)", border: "none",
                                    cursor: allMarked && !saving ? "pointer" : "not-allowed",
                                    opacity: !allMarked || saving ? 0.5 : 1,
                                    transition: "opacity 0.15s",
                                  }}
                                >
                                  {saving ? "Guardando…" : "Confirmar asistencia"}
                                </button>
                              </div>
                            )}
                          </>
                        )
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

function GroupRow({ label, isSelected, hasBorder, onClick }: {
  label: string;
  isSelected: boolean;
  hasBorder: boolean;
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
        padding: "13px 20px", cursor: "pointer",
        background: isSelected ? "var(--accent-light)" : hovered ? "var(--bg2)" : "var(--bg)",
        borderLeft: `3px solid ${isSelected ? "var(--accent)" : "transparent"}`,
        borderBottom: hasBorder ? "1px solid var(--line)" : "none",
        transition: "background 0.12s",
        userSelect: "none",
      }}
    >
      <span style={{
        flex: 1, fontSize: 13.5,
        fontWeight: isSelected ? 500 : 400,
        color: isSelected ? "var(--accent)" : "var(--t1)",
      }}>
        {label}
      </span>
      <svg
        width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke={isSelected ? "var(--accent)" : "var(--t3)"}
        strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        style={{ flexShrink: 0, transform: isSelected ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  );
}

function StudentRow({ student, currentStatus, disabled, hasBorder, onChange }: {
  student: Student;
  currentStatus: "present" | "absent" | "late" | undefined;
  disabled: boolean;
  hasBorder: boolean;
  onChange: (val: "present" | "absent" | "late") => void;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center",
      padding: "10px 20px",
      borderBottom: hasBorder ? "1px solid var(--line)" : "none",
      background: "var(--bg)",
    }}>
      <span style={{ flex: 1, fontSize: 13, color: "var(--t1)" }}>{student.full_name}</span>
      <div style={{ display: "flex", gap: 6 }}>
        {STATUSES.map(({ value, label, color }) => {
          const isActive = currentStatus === value;
          return (
            <button
              key={value}
              onClick={() => !disabled && onChange(value)}
              style={{
                padding: "4px 12px", borderRadius: 5,
                fontSize: 12, fontWeight: isActive ? 600 : 400,
                border: isActive ? "none" : "1px solid var(--line)",
                background: isActive ? color : "transparent",
                color: isActive ? "#fff" : "var(--t3)",
                cursor: disabled ? "default" : "pointer",
                transition: "all 0.12s",
                whiteSpace: "nowrap",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
