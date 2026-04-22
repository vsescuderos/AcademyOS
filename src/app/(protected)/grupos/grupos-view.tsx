"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  crearGrupo,
  eliminarGrupo,
  actualizarGrupo,
  actualizarAlumnosGrupo,
} from "@/actions/director";
import ExcelImportPanel from "./excel-import";

const DAYS = [
  { key: "lunes", short: "L" },
  { key: "martes", short: "M" },
  { key: "miercoles", short: "X" },
  { key: "jueves", short: "J" },
  { key: "viernes", short: "V" },
  { key: "sabado", short: "S" },
  { key: "domingo", short: "D" },
];

type Group = {
  id: string;
  name: string;
  days: string[];
  time_start: string | null;
  time_end: string | null;
  profesor_id: string | null;
  max_students: number;
  student_ids: string[];
};
type Profesor = { id: string; full_name: string; email: string };
type Student = { id: string; full_name: string };

const EMPTY_GROUP = {
  name: "",
  profesor_id: "",
  days: [] as string[],
  time_start: "",
  time_end: "",
  max_students: 20,
};

// ── shared sub-components ──────────────────────────────────────────────────

function PanelCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 10, padding: 20, marginBottom: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--t1)", marginBottom: 16 }}>{title}</div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--t2)", marginBottom: 4 }}>
        {label}
      </label>
      {children}
    </div>
  );
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

// ── main component ─────────────────────────────────────────────────────────

export default function GruposView({
  groups,
  profesores,
  students,
}: {
  groups: Group[];
  profesores: Profesor[];
  students: Student[];
}) {
  const router = useRouter();
  const [panel, setPanel] = useState<"none" | "grupo" | "excel">("none");
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [groupForm, setGroupForm] = useState(EMPTY_GROUP);
  const [groupError, setGroupError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [showSinProfesor, setShowSinProfesor] = useState(false);

  const filteredGroups = groups.filter((g) => {
    if (showSinProfesor) return !g.profesor_id;
    if (search.trim()) {
      const prof = profesores.find((p) => p.id === g.profesor_id);
      return (prof?.full_name ?? "").toLowerCase().includes(search.toLowerCase().trim());
    }
    return true;
  });

  function handleSearch(val: string) {
    setSearch(val);
    if (val.trim()) setShowSinProfesor(false);
  }

  function toggleSinProfesor() {
    if (!showSinProfesor) setSearch("");
    setShowSinProfesor((v) => !v);
  }

  function toggleDay(day: string) {
    setGroupForm((f) => ({
      ...f,
      days: f.days.includes(day) ? f.days.filter((d) => d !== day) : [...f.days, day],
    }));
  }

  function openPanel(p: "grupo" | "excel") {
    setPanel((prev) => (prev === p ? "none" : p));
    setGroupError(null);
  }

  function closePanel() {
    setPanel("none");
    setGroupForm(EMPTY_GROUP);
    setGroupError(null);
  }

  function handleEditGroup(groupId: string) {
    setEditingGroupId((prev) => (prev === groupId ? null : groupId));
    setPanel("none");
  }

  function handleCrearGrupo() {
    if (!groupForm.name.trim() || groupForm.days.length === 0) {
      setGroupError("El nombre y al menos un día son obligatorios.");
      return;
    }
    startTransition(async () => {
      const result = await crearGrupo({
        name: groupForm.name.trim(),
        profesor_id: groupForm.profesor_id,
        days: groupForm.days,
        time_start: groupForm.time_start || null,
        time_end: groupForm.time_end || null,
        max_students: groupForm.max_students,
      });
      if (result.error) {
        setGroupError(result.error);
      } else {
        closePanel();
        router.refresh();
      }
    });
  }

  async function handleEliminar(groupId: string) {
    setDeleteError(null);
    setDeletingId(groupId);
    const result = await eliminarGrupo(groupId);
    setDeletingId(null);
    if (result.error) {
      setDeleteError(result.error);
    } else {
      router.refresh();
    }
  }

  function handleSavedGroup() {
    setEditingGroupId(null);
    router.refresh();
  }

  const confirmingGroup = confirmingDeleteId
    ? groups.find((g) => g.id === confirmingDeleteId) ?? null
    : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Topbar */}
      <div style={{ height: 54, borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", padding: "0 28px", justifyContent: "space-between", flexShrink: 0, background: "var(--bg)" }}>
        <span style={{ fontWeight: 600, fontSize: 16, color: "var(--t1)" }}>Grupos</span>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => openPanel("excel")}
            style={{ fontSize: 12.5, color: "var(--t2)", border: "1px solid var(--line)", borderRadius: 6, padding: "5px 12px", background: "transparent", cursor: "pointer" }}
          >
            Importar Excel
          </button>
          <button
            onClick={() => openPanel("grupo")}
            style={{ fontSize: 12.5, fontWeight: 500, color: "#fff", border: "none", borderRadius: 6, padding: "5px 14px", background: "var(--accent)", cursor: "pointer" }}
          >
            + Nuevo grupo
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ padding: "8px 28px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 8, flexShrink: 0, background: "var(--bg)" }}>
        <input
          type="text"
          placeholder="Buscar por profesor…"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          style={{ flex: 1, maxWidth: 260, border: "1px solid var(--line)", borderRadius: 6, padding: "6px 10px", fontSize: 12.5, color: "var(--t1)", background: "var(--bg)", outline: "none" }}
        />
        <button
          onClick={toggleSinProfesor}
          style={{ fontSize: 12, fontWeight: 500, color: showSinProfesor ? "var(--accent)" : "var(--t2)", background: showSinProfesor ? "var(--accent-light)" : "transparent", border: `1px solid ${showSinProfesor ? "var(--accent-border)" : "var(--line)"}`, borderRadius: 6, padding: "5px 12px", cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.12s" }}
        >
          Grupos sin profesor
        </button>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {panel === "excel" && (
          <div style={{ padding: "20px 28px 0" }}>
            <ExcelImportPanel onSuccess={() => { closePanel(); router.refresh(); }} onCancel={closePanel} />
          </div>
        )}

        {panel === "grupo" && (
          <div style={{ padding: "20px 28px 0" }}>
            <PanelCard title="Nuevo grupo">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <Field label="Nombre">
                    <input type="text" value={groupForm.name} onChange={(e) => setGroupForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ej: Avanzado — Lunes y Miércoles" style={inputStyle} />
                  </Field>
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <Field label="Días">
                    <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
                      {DAYS.map((d) => (
                        <button key={d.key} type="button" onClick={() => toggleDay(d.key)} style={{ width: 34, height: 34, borderRadius: "50%", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.12s", background: groupForm.days.includes(d.key) ? "var(--accent)" : "var(--bg2)", color: groupForm.days.includes(d.key) ? "#fff" : "var(--t2)" }}>
                          {d.short}
                        </button>
                      ))}
                    </div>
                  </Field>
                </div>

                <Field label="Hora inicio">
                  <input type="time" value={groupForm.time_start} onChange={(e) => setGroupForm((f) => ({ ...f, time_start: e.target.value }))} style={inputStyle} />
                </Field>
                <Field label="Hora fin">
                  <input type="time" value={groupForm.time_end} onChange={(e) => setGroupForm((f) => ({ ...f, time_end: e.target.value }))} style={inputStyle} />
                </Field>
                <Field label="Máx. alumnos">
                  <input type="number" min={1} value={groupForm.max_students} onChange={(e) => setGroupForm((f) => ({ ...f, max_students: Math.max(1, parseInt(e.target.value) || 1) }))} style={inputStyle} />
                </Field>

                <div style={{ gridColumn: "1 / -1" }}>
                  <Field label="Profesor">
                    <select value={groupForm.profesor_id} onChange={(e) => setGroupForm((f) => ({ ...f, profesor_id: e.target.value }))} style={inputStyle}>
                      <option value="">Sin asignar</option>
                      {profesores.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                    </select>
                  </Field>
                </div>
              </div>

              {groupError && <p style={{ marginTop: 12, fontSize: 12.5, color: "var(--err)", background: "#fef2f2", borderRadius: 6, padding: "8px 12px" }}>{groupError}</p>}

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
                <button onClick={closePanel} style={{ fontSize: 12.5, color: "var(--t2)", border: "1px solid var(--line)", borderRadius: 6, padding: "6px 14px", background: "transparent", cursor: "pointer" }}>Cancelar</button>
                <button onClick={handleCrearGrupo} disabled={isPending} style={{ fontSize: 12.5, fontWeight: 500, color: "#fff", border: "none", borderRadius: 6, padding: "6px 16px", background: "var(--accent)", cursor: "pointer", opacity: isPending ? 0.6 : 1 }}>
                  {isPending ? "Guardando…" : "Crear grupo"}
                </button>
              </div>
            </PanelCard>
          </div>
        )}

        {deleteError && (
          <div style={{ margin: "16px 28px 0", fontSize: 12.5, color: "var(--err)", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <span>{deleteError}</span>
            <button onClick={() => setDeleteError(null)} style={{ fontSize: 16, lineHeight: 1, color: "var(--err)", background: "none", border: "none", cursor: "pointer", flexShrink: 0 }}>×</button>
          </div>
        )}

        {/* Table */}
        {groups.length === 0 ? (
          <p style={{ padding: "40px 28px", color: "var(--t3)", fontSize: 13 }}>No hay grupos creados todavía.</p>
        ) : filteredGroups.length === 0 ? (
          <p style={{ padding: "40px 28px", color: "var(--t3)", fontSize: 13 }}>No hay grupos que coincidan con el filtro.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg2)" }}>
                {["Grupo", "Días", "Horario", "Profesor", "Alumnos", ""].map((col) => (
                  <th key={col} style={{ textAlign: "left", padding: "9px 20px", fontSize: 11, fontWeight: 600, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid var(--line)" }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredGroups.map((group) => (
                <GroupRow
                  key={group.id}
                  group={group}
                  profesores={profesores}
                  students={students}
                  editing={editingGroupId === group.id}
                  onEdit={() => handleEditGroup(group.id)}
                  onSaved={handleSavedGroup}
                  onRequestDelete={() => setConfirmingDeleteId(group.id)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Delete confirmation modal */}
      {confirmingGroup && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
          onClick={() => setConfirmingDeleteId(null)}
        >
          <div
            style={{ background: "var(--bg)", borderRadius: 12, padding: "28px 32px", maxWidth: 380, width: "90%", boxShadow: "0 8px 32px rgba(0,0,0,0.14)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--t1)", marginBottom: 10 }}>Eliminar grupo</div>
            <p style={{ fontSize: 13.5, color: "var(--t2)", marginBottom: 24, lineHeight: 1.55 }}>
              Estás a punto de eliminar el grupo <strong>'{confirmingGroup.name}'</strong>.
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                onClick={() => setConfirmingDeleteId(null)}
                style={{ fontSize: 12.5, color: "var(--t2)", border: "1px solid var(--line)", borderRadius: 6, padding: "7px 16px", background: "transparent", cursor: "pointer" }}
              >
                Cancelar
              </button>
              <button
                onClick={() => { setConfirmingDeleteId(null); handleEliminar(confirmingGroup.id); }}
                disabled={deletingId === confirmingGroup.id}
                style={{ fontSize: 12.5, fontWeight: 500, color: "#fff", border: "none", borderRadius: 6, padding: "7px 16px", background: "#dc2626", cursor: "pointer", opacity: deletingId === confirmingGroup.id ? 0.6 : 1 }}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GroupRow({
  group,
  profesores,
  students,
  editing,
  onEdit,
  onSaved,
  onRequestDelete,
}: {
  group: Group;
  profesores: Profesor[];
  students: Student[];
  editing: boolean;
  onEdit: () => void;
  onSaved: () => void;
  onRequestDelete: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  const [editForm, setEditForm] = useState({
    name: group.name,
    days: group.days,
    time_start: group.time_start ?? "",
    time_end: group.time_end ?? "",
    max_students: group.max_students,
    profesor_id: group.profesor_id ?? "",
    student_ids: group.student_ids,
  });
  const [studentSearch, setStudentSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    if (editing) {
      setEditForm({
        name: group.name,
        days: group.days,
        time_start: group.time_start ?? "",
        time_end: group.time_end ?? "",
        max_students: group.max_students,
        profesor_id: group.profesor_id ?? "",
        student_ids: group.student_ids,
      });
      setStudentSearch("");
      setEditError(null);
    }
  }, [editing]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave() {
    if (!editForm.name.trim()) {
      setEditError("El nombre es obligatorio.");
      return;
    }
    if (editForm.student_ids.length > editForm.max_students) {
      setEditError(`El grupo tiene un máximo de ${editForm.max_students} alumnos. Has seleccionado ${editForm.student_ids.length}.`);
      return;
    }
    setSaving(true);
    setEditError(null);
    const r1 = await actualizarGrupo(group.id, {
      name: editForm.name.trim(),
      days: editForm.days,
      time_start: editForm.time_start || null,
      time_end: editForm.time_end || null,
      max_students: editForm.max_students,
      profesor_id: editForm.profesor_id || null,
    });
    if (r1.error) { setSaving(false); setEditError(r1.error); return; }
    const r2 = await actualizarAlumnosGrupo(group.id, editForm.student_ids);
    setSaving(false);
    if (r2.error) { setEditError(r2.error); } else { onSaved(); }
  }

  const profName = profesores.find((p) => p.id === group.profesor_id)?.full_name ?? null;
  const visibleStudents = students.filter((s) =>
    s.full_name.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const cellBorder = editing ? "none" : "1px solid var(--line)";

  return (
    <>
      <tr
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ background: editing ? "var(--accent-light)" : hovered ? "var(--bg2)" : "transparent", transition: "background 0.1s" }}
      >
        {/* Nombre */}
        <td style={{ padding: "11px 20px", borderBottom: cellBorder, verticalAlign: "middle" }}>
          <span style={{ fontWeight: 500, fontSize: 13, color: "var(--t1)" }}>{group.name}</span>
        </td>

        {/* Días */}
        <td style={{ padding: "11px 20px", borderBottom: cellBorder, verticalAlign: "middle" }}>
          <div style={{ display: "flex", gap: 3 }}>
            {DAYS.map((d) => (
              <span key={d.key} style={{ width: 22, height: 22, borderRadius: "50%", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, background: group.days.includes(d.key) ? "var(--accent-light)" : "var(--bg2)", color: group.days.includes(d.key) ? "var(--accent)" : "var(--t3)" }}>
                {d.short}
              </span>
            ))}
          </div>
        </td>

        {/* Horario */}
        <td style={{ padding: "11px 20px", borderBottom: cellBorder, verticalAlign: "middle", color: "var(--t3)", fontSize: 12, whiteSpace: "nowrap" }}>
          {group.time_start && group.time_end ? `${group.time_start.slice(0, 5)} – ${group.time_end.slice(0, 5)}` : "—"}
        </td>

        {/* Profesor (read-only) */}
        <td style={{ padding: "11px 20px", borderBottom: cellBorder, verticalAlign: "middle" }}>
          <span style={{ fontSize: 13, color: profName ? "var(--t1)" : "var(--t3)" }}>
            {profName ?? "Sin asignar"}
          </span>
        </td>

        {/* Alumnos */}
        <td style={{ padding: "11px 20px", borderBottom: cellBorder, verticalAlign: "middle" }}>
          <span style={{ fontSize: 13, color: "var(--t2)", fontVariantNumeric: "tabular-nums" }}>
            {group.student_ids.length} / {group.max_students}
          </span>
        </td>

        {/* Acciones */}
        <td style={{ padding: "11px 20px", borderBottom: cellBorder, verticalAlign: "middle", textAlign: "right" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
            <button
              onClick={onEdit}
              style={{ fontSize: 12, fontWeight: 500, color: editing ? "var(--accent)" : "var(--t2)", background: editing ? "var(--accent-light)" : "transparent", border: `1px solid ${editing ? "var(--accent-border)" : "var(--line)"}`, borderRadius: 6, padding: "4px 12px", cursor: "pointer", transition: "all 0.12s", whiteSpace: "nowrap" }}
            >
              {editing ? "Cerrar" : "Editar"}
            </button>
            <button
              onClick={onRequestDelete}
              style={{ fontSize: 12, fontWeight: 500, color: "var(--t2)", background: "transparent", border: "1px solid var(--line)", borderRadius: 6, padding: "4px 12px", cursor: "pointer", transition: "all 0.12s", whiteSpace: "nowrap" }}
            >
              Eliminar
            </button>
          </div>
        </td>
      </tr>

      {editing && (
        <tr>
          <td colSpan={6} style={{ padding: 0, borderBottom: "1px solid var(--line)", background: "var(--bg2)" }}>
            <div style={{ padding: "20px 28px 24px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
                {/* Left: group fields */}
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <Field label="Nombre">
                    <input type="text" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} style={inputStyle} />
                  </Field>

                  <Field label="Profesor">
                    <select value={editForm.profesor_id} onChange={(e) => setEditForm((f) => ({ ...f, profesor_id: e.target.value }))} style={inputStyle}>
                      <option value="">Sin asignar</option>
                      {profesores.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                    </select>
                  </Field>

                  <Field label="Días">
                    <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
                      {DAYS.map((d) => (
                        <button key={d.key} type="button" onClick={() => setEditForm((f) => ({ ...f, days: f.days.includes(d.key) ? f.days.filter((x) => x !== d.key) : [...f.days, d.key] }))}
                          style={{ width: 34, height: 34, borderRadius: "50%", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.12s", background: editForm.days.includes(d.key) ? "var(--accent)" : "var(--bg)", color: editForm.days.includes(d.key) ? "#fff" : "var(--t2)" }}>
                          {d.short}
                        </button>
                      ))}
                    </div>
                  </Field>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 90px", gap: 10 }}>
                    <Field label="Hora inicio">
                      <input type="time" value={editForm.time_start} onChange={(e) => setEditForm((f) => ({ ...f, time_start: e.target.value }))} style={inputStyle} />
                    </Field>
                    <Field label="Hora fin">
                      <input type="time" value={editForm.time_end} onChange={(e) => setEditForm((f) => ({ ...f, time_end: e.target.value }))} style={inputStyle} />
                    </Field>
                    <Field label="Máx.">
                      <input type="number" min={1} value={editForm.max_students} onChange={(e) => setEditForm((f) => ({ ...f, max_students: Math.max(1, parseInt(e.target.value) || 1) }))} style={inputStyle} />
                    </Field>
                  </div>
                </div>

                {/* Right: student list */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: "var(--t2)" }}>
                    ALUMNOS ({editForm.student_ids.length} / {editForm.max_students})
                  </div>
                  <input type="text" placeholder="Buscar alumno…" value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} style={{ ...inputStyle, marginBottom: 2 }} />
                  <div style={{ border: "1px solid var(--line)", borderRadius: 6, maxHeight: 200, overflowY: "auto", background: "var(--bg)" }}>
                    {students.length === 0 ? (
                      <p style={{ padding: "12px 14px", fontSize: 13, color: "var(--t3)" }}>No hay alumnos creados todavía.</p>
                    ) : visibleStudents.length === 0 ? (
                      <p style={{ padding: "12px 14px", fontSize: 13, color: "var(--t3)" }}>Sin resultados.</p>
                    ) : (
                      visibleStudents.map((s) => (
                        <label key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", cursor: "pointer", fontSize: 13, color: "var(--t1)" }}>
                          <input
                            type="checkbox"
                            checked={editForm.student_ids.includes(s.id)}
                            onChange={() => setEditForm((f) => { const has = f.student_ids.includes(s.id); return { ...f, student_ids: has ? f.student_ids.filter((id) => id !== s.id) : [...f.student_ids, s.id] }; })}
                            style={{ width: 15, height: 15, accentColor: "var(--accent)", cursor: "pointer" }}
                          />
                          {s.full_name}
                        </label>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {editError && (
                <p style={{ marginTop: 14, fontSize: 12.5, color: "var(--err)", background: "#fef2f2", borderRadius: 6, padding: "8px 12px" }}>
                  {editError}
                </p>
              )}

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
                <button onClick={onEdit} style={{ fontSize: 12.5, color: "var(--t2)", border: "1px solid var(--line)", borderRadius: 6, padding: "6px 14px", background: "transparent", cursor: "pointer" }}>
                  Cancelar
                </button>
                <button onClick={handleSave} disabled={saving} style={{ fontSize: 12.5, fontWeight: 500, color: "#fff", border: "none", borderRadius: 6, padding: "6px 16px", background: "var(--accent)", cursor: "pointer", opacity: saving ? 0.6 : 1 }}>
                  {saving ? "Guardando…" : "Guardar cambios"}
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
