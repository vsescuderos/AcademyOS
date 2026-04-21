"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { confirmarAsistencia } from "@/actions/asistencia";

type Group = { id: string; name: string };
type Student = { id: string; full_name: string };
type AttendanceMap = Record<string, "present" | "absent" | "late">;
type GroupState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "pending"; students: Student[] }
  | { status: "confirmed"; students: Student[]; records: AttendanceMap };

export default function AsistenciaView({ groups }: { groups: Group[] }) {
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [groupState, setGroupState] = useState<GroupState>({ status: "idle" });
  const [attendance, setAttendance] = useState<AttendanceMap>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function selectGroup(groupId: string) {
    if (groupId === selectedGroupId) return;
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
      setGroupState({
        status: "confirmed",
        students: groupState.students,
        records: { ...attendance },
      });
    }
    setSaving(false);
  }

  const today = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const allMarked =
    groupState.status === "pending" &&
    groupState.students.every((s) => attendance[s.id]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Topbar */}
      <div
        style={{
          height: 54,
          borderBottom: "1px solid var(--line)",
          display: "flex",
          alignItems: "center",
          padding: "0 28px",
          justifyContent: "space-between",
          flexShrink: 0,
          background: "var(--bg)",
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 16, color: "var(--t1)" }}>
          Asistencia
        </span>
        <span
          style={{ fontSize: 12.5, color: "var(--t3)", textTransform: "capitalize" }}
        >
          {today}
        </span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
        {/* Group list */}
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "var(--t3)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 10,
            }}
          >
            Mis grupos
          </div>
          {groups.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--t3)" }}>
              No tienes grupos asignados.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {groups.map((g) => (
                <GroupButton
                  key={g.id}
                  group={g}
                  isSelected={selectedGroupId === g.id}
                  onClick={() => selectGroup(g.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Students panel */}
        {groupState.status === "loading" && (
          <p style={{ fontSize: 13, color: "var(--t3)" }}>Cargando…</p>
        )}

        {(groupState.status === "pending" ||
          groupState.status === "confirmed") && (
          <>
            {groupState.students.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--t3)" }}>
                No hay alumnos en este grupo.
              </p>
            ) : (
              <>
                {groupState.status === "confirmed" && (
                  <div
                    style={{
                      marginBottom: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 12.5,
                      color: "var(--ok)",
                      background: "var(--ok-dim)",
                      border: "1px solid var(--accent-border)",
                      borderRadius: 6,
                      padding: "8px 14px",
                    }}
                  >
                    Asistencia confirmada para hoy
                  </div>
                )}

                <table
                  style={{ width: "100%", borderCollapse: "collapse" }}
                >
                  <thead>
                    <tr style={{ background: "var(--bg2)" }}>
                      {["Alumno", "Presente", "Ausente", "Tarde"].map((col) => (
                        <th
                          key={col}
                          style={{
                            textAlign: col === "Alumno" ? "left" : "center",
                            padding: "9px 20px",
                            fontSize: 11,
                            fontWeight: 600,
                            color: "var(--t3)",
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                            borderBottom: "1px solid var(--line)",
                          }}
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {groupState.students.map((student) => {
                      const isConfirmed = groupState.status === "confirmed";
                      const savedStatus = isConfirmed
                        ? groupState.records[student.id]
                        : undefined;
                      const currentStatus = isConfirmed
                        ? savedStatus
                        : attendance[student.id];

                      return (
                        <StudentRow
                          key={student.id}
                          student={student}
                          currentStatus={currentStatus}
                          disabled={isConfirmed}
                          onChange={(val) =>
                            setAttendance((a) => ({
                              ...a,
                              [student.id]: val,
                            }))
                          }
                        />
                      );
                    })}
                  </tbody>
                </table>

                {groupState.status === "pending" && (
                  <div style={{ marginTop: 16 }}>
                    {saveError && (
                      <p
                        style={{
                          marginBottom: 10,
                          fontSize: 12.5,
                          color: "var(--err)",
                          background: "#fef2f2",
                          borderRadius: 6,
                          padding: "8px 14px",
                        }}
                      >
                        {saveError}
                      </p>
                    )}
                    <button
                      onClick={handleConfirmar}
                      disabled={!allMarked || saving}
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: 6,
                        fontSize: 13,
                        fontWeight: 500,
                        color: "#fff",
                        background: "var(--accent)",
                        border: "none",
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
            )}
          </>
        )}
      </div>
    </div>
  );
}

function GroupButton({
  group,
  isSelected,
  onClick,
}: {
  group: Group;
  isSelected: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        textAlign: "left",
        padding: "10px 14px",
        borderRadius: 6,
        fontSize: 13,
        fontWeight: isSelected ? 500 : 400,
        cursor: "pointer",
        border: `1px solid ${isSelected ? "var(--accent-border)" : hovered ? "#d1d5db" : "var(--line)"}`,
        background: isSelected ? "var(--accent-light)" : "var(--bg)",
        color: isSelected ? "var(--accent)" : "var(--t1)",
        transition: "all 0.12s",
      }}
    >
      {group.name}
    </button>
  );
}

function StudentRow({
  student,
  currentStatus,
  disabled,
  onChange,
}: {
  student: Student;
  currentStatus: "present" | "absent" | "late" | undefined;
  disabled: boolean;
  onChange: (val: "present" | "absent" | "late") => void;
}) {
  const [hovered, setHovered] = useState(false);
  const tdBase: React.CSSProperties = {
    padding: "11px 20px",
    borderBottom: "1px solid var(--line)",
    textAlign: "center",
  };
  return (
    <tr
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ background: hovered ? "var(--bg2)" : "transparent", transition: "background 0.1s" }}
    >
      <td style={{ ...tdBase, textAlign: "left", fontSize: 13, color: "var(--t1)" }}>
        {student.full_name}
      </td>
      <td style={tdBase}>
        <input
          type="radio"
          name={`a-${student.id}`}
          disabled={disabled}
          checked={currentStatus === "present"}
          onChange={() => onChange("present")}
          style={{ width: 15, height: 15, accentColor: "var(--accent)", cursor: disabled ? "default" : "pointer" }}
        />
      </td>
      <td style={tdBase}>
        <input
          type="radio"
          name={`a-${student.id}`}
          disabled={disabled}
          checked={currentStatus === "absent"}
          onChange={() => onChange("absent")}
          style={{ width: 15, height: 15, accentColor: "var(--err)", cursor: disabled ? "default" : "pointer" }}
        />
      </td>
      <td style={tdBase}>
        <input
          type="radio"
          name={`a-${student.id}`}
          disabled={disabled}
          checked={currentStatus === "late"}
          onChange={() => onChange("late")}
          style={{ width: 15, height: 15, accentColor: "var(--warn)", cursor: disabled ? "default" : "pointer" }}
        />
      </td>
    </tr>
  );
}
