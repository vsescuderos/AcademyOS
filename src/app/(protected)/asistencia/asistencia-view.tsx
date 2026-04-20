"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { logout } from "@/actions/auth";
import { confirmarAsistencia } from "@/actions/asistencia";

type Group = { id: string; name: string };
type Student = { id: string; full_name: string };
type AttendanceMap = Record<string, "present" | "absent">;
type GroupState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "pending"; students: Student[] }
  | { status: "confirmed"; students: Student[]; records: AttendanceMap };

export default function AsistenciaView({
  groups,
  profesorEmail,
}: {
  groups: Group[];
  profesorEmail: string;
}) {
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

    // Load students
    const { data: gsData } = await supabase
      .from("group_students")
      .select("students(id, full_name)")
      .eq("group_id", groupId);

    const students: Student[] = (gsData ?? [])
      .map((d) => (d as { students: Student }).students)
      .filter(Boolean);

    // Check if today's session already exists
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

    // Load existing records
    const { data: records } = await supabase
      .from("attendance_records")
      .select("student_id, status")
      .eq("session_id", session.id);

    const recordsMap: AttendanceMap = {};
    for (const r of records ?? []) {
      if (r.status === "present" || r.status === "absent") {
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
    <main className="min-h-screen bg-gray-50">
      <nav className="border-b bg-white px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">AcademyOS</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{profesorEmail}</span>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </nav>

      <div className="mx-auto max-w-2xl px-6 py-10">
        <p className="text-sm text-gray-500 mb-1 capitalize">{today}</p>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Asistencia</h2>

        {/* Group list */}
        <div className="mb-8">
          <p className="text-xs font-medium text-gray-500 uppercase mb-3">
            Mis grupos
          </p>
          {groups.length === 0 ? (
            <p className="text-sm text-gray-500">No tienes grupos asignados.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {groups.map((g) => (
                <button
                  key={g.id}
                  onClick={() => selectGroup(g.id)}
                  className={`text-left px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
                    selectedGroupId === g.id
                      ? "bg-blue-50 border-blue-400 text-blue-700"
                      : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {g.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Students panel */}
        {groupState.status === "loading" && (
          <p className="text-sm text-gray-400">Cargando...</p>
        )}

        {(groupState.status === "pending" ||
          groupState.status === "confirmed") && (
          <>
            {groupState.students.length === 0 ? (
              <p className="text-sm text-gray-500">
                No hay alumnos en este grupo.
              </p>
            ) : (
              <>
                {groupState.status === "confirmed" && (
                  <div className="mb-3 flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <span>Asistencia confirmada para hoy</span>
                  </div>
                )}

                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-4">
                  <div className="grid grid-cols-[1fr_6rem_6rem] px-4 py-2 bg-gray-50 border-b">
                    <span className="text-xs font-medium text-gray-500 uppercase">
                      Alumno
                    </span>
                    <span className="text-xs font-medium text-gray-500 uppercase text-center">
                      Presente
                    </span>
                    <span className="text-xs font-medium text-gray-500 uppercase text-center">
                      Ausente
                    </span>
                  </div>

                  {groupState.students.map((student) => {
                    const isConfirmed = groupState.status === "confirmed";
                    const savedStatus = isConfirmed
                      ? groupState.records[student.id]
                      : undefined;
                    const currentStatus = isConfirmed
                      ? savedStatus
                      : attendance[student.id];

                    return (
                      <div
                        key={student.id}
                        className="grid grid-cols-[1fr_6rem_6rem] items-center px-4 py-3 border-b last:border-0"
                      >
                        <span className="text-sm text-gray-800">
                          {student.full_name}
                        </span>
                        <div className="flex justify-center">
                          <input
                            type="radio"
                            name={`a-${student.id}`}
                            disabled={isConfirmed}
                            checked={currentStatus === "present"}
                            onChange={() =>
                              setAttendance((a) => ({
                                ...a,
                                [student.id]: "present",
                              }))
                            }
                            className="w-4 h-4 accent-blue-600 disabled:opacity-60"
                          />
                        </div>
                        <div className="flex justify-center">
                          <input
                            type="radio"
                            name={`a-${student.id}`}
                            disabled={isConfirmed}
                            checked={currentStatus === "absent"}
                            onChange={() =>
                              setAttendance((a) => ({
                                ...a,
                                [student.id]: "absent",
                              }))
                            }
                            className="w-4 h-4 accent-red-500 disabled:opacity-60"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {groupState.status === "pending" && (
                  <>
                    {saveError && (
                      <p className="mb-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                        {saveError}
                      </p>
                    )}
                    <button
                      onClick={handleConfirmar}
                      disabled={!allMarked || saving}
                      className="w-full py-2.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {saving ? "Guardando..." : "Confirmar asistencia alumnos"}
                    </button>
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
