"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { crearAlumno, eliminarAlumno } from "@/actions/director";
import ExcelImportAlumnos from "./excel-import-alumnos";
import EditarAlumno from "./editar-alumno";

type Alumno = { id: string; full_name: string; email: string | null; phone: string | null };
type Group = { id: string; name: string; days: string[]; time_start: string | null; time_end: string | null };

function groupsConflict(a: Group, b: Group): boolean {
  const shareDay = a.days.some((d) => b.days.includes(d));
  if (!shareDay) return false;
  if (!a.time_start || !a.time_end || !b.time_start || !b.time_end) return false;
  return a.time_start < b.time_end && b.time_start < a.time_end;
}

const EMPTY_FORM = { full_name: "", email: "", phone: "", groupIds: [] as string[] };

function PanelCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--bg)",
        border: "1px solid var(--line)",
        borderRadius: 10,
        padding: 20,
        marginBottom: 16,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--t1)", marginBottom: 16 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label
        style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--t2)", marginBottom: 4 }}
      >
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

export default function AlumnosView({ alumnos, groups }: { alumnos: Alumno[]; groups: Group[] }) {
  const router = useRouter();
  const [panel, setPanel] = useState<"none" | "alumno" | "excel">("none");
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [groupConflictError, setGroupConflictError] = useState<string | null>(null);

  const [editingAlumno, setEditingAlumno] = useState<Alumno | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function openPanel(p: "alumno" | "excel") {
    setEditingAlumno(null);
    setPanel((prev) => (prev === p ? "none" : p));
    setFormError(null);
  }

  function handleEditAlumno(alumno: Alumno) {
    setEditingAlumno((prev) => (prev?.id === alumno.id ? null : alumno));
    setPanel("none");
    setForm(EMPTY_FORM);
    setFormError(null);
  }

  async function handleEliminar(id: string) {
    setDeleteError(null);
    setDeletingId(id);
    const result = await eliminarAlumno(id);
    setDeletingId(null);
    if (result.error) {
      setDeleteError(result.error);
    } else {
      router.refresh();
    }
  }

  function closePanel() {
    setPanel("none");
    setForm(EMPTY_FORM);
    setFormError(null);
    setGroupConflictError(null);
  }

  function toggleGroup(groupId: string) {
    setGroupConflictError(null);
    if (form.groupIds.includes(groupId)) {
      setForm((f) => ({ ...f, groupIds: f.groupIds.filter((id) => id !== groupId) }));
      return;
    }
    const newGroup = groups.find((g) => g.id === groupId);
    if (newGroup) {
      const conflict = groups.find(
        (g) => form.groupIds.includes(g.id) && groupsConflict(newGroup, g)
      );
      if (conflict) {
        setGroupConflictError(
          `"${newGroup.name}" tiene conflicto de horario con "${conflict.name}".`
        );
        return;
      }
    }
    setForm((f) => ({ ...f, groupIds: [...f.groupIds, groupId] }));
  }

  function handleCrear() {
    if (!form.full_name.trim()) {
      setFormError("El nombre es obligatorio.");
      return;
    }
    startTransition(async () => {
      const result = await crearAlumno(form);
      if (result.error) {
        setFormError(result.error);
      } else {
        closePanel();
        router.refresh();
      }
    });
  }

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
        <span style={{ fontWeight: 600, fontSize: 16, color: "var(--t1)" }}>Alumnos</span>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => openPanel("excel")}
            style={{
              fontSize: 12.5,
              color: "var(--t2)",
              border: "1px solid var(--line)",
              borderRadius: 6,
              padding: "5px 12px",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            Importar Excel
          </button>
          <button
            onClick={() => openPanel("alumno")}
            style={{
              fontSize: 12.5,
              fontWeight: 500,
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "5px 14px",
              background: "var(--accent)",
              cursor: "pointer",
            }}
          >
            + Nuevo alumno
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {panel === "excel" && (
          <div style={{ padding: "20px 28px 0" }}>
            <ExcelImportAlumnos
              onSuccess={() => { closePanel(); router.refresh(); }}
              onCancel={closePanel}
            />
          </div>
        )}

        {panel === "alumno" && (
          <div style={{ padding: "20px 28px 0" }}>
            <PanelCard title="Nuevo alumno">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <Field label="Nombre completo *">
                    <input
                      type="text"
                      value={form.full_name}
                      onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                      placeholder="Carlos Ruiz"
                      style={inputStyle}
                    />
                  </Field>
                </div>
                <Field label="Email">
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="carlos@email.com"
                    style={inputStyle}
                  />
                </Field>
                <Field label="Teléfono">
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="600 000 000"
                    style={inputStyle}
                  />
                </Field>

                {groups.length > 0 && (
                  <div style={{ gridColumn: "1 / -1" }}>
                    <Field label="Grupos (opcional)">
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                          marginTop: 4,
                          border: "1px solid var(--line)",
                          borderRadius: 6,
                          padding: "4px 0",
                          maxHeight: 160,
                          overflowY: "auto",
                        }}
                      >
                        {groups.map((g) => (
                          <label
                            key={g.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              padding: "7px 12px",
                              cursor: "pointer",
                              fontSize: 13,
                              color: "var(--t1)",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={form.groupIds.includes(g.id)}
                              onChange={() => toggleGroup(g.id)}
                              style={{ width: 14, height: 14, accentColor: "var(--accent)", cursor: "pointer" }}
                            />
                            {g.name}
                          </label>
                        ))}
                      </div>
                      {groupConflictError && (
                        <p style={{ margin: "6px 12px 2px", fontSize: 12, color: "var(--err)" }}>
                          {groupConflictError}
                        </p>
                      )}
                    </Field>
                  </div>
                )}
              </div>

              {formError && (
                <p
                  style={{
                    marginTop: 12,
                    fontSize: 12.5,
                    color: "var(--err)",
                    background: "#fef2f2",
                    borderRadius: 6,
                    padding: "8px 12px",
                  }}
                >
                  {formError}
                </p>
              )}

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
                <button
                  onClick={closePanel}
                  style={{
                    fontSize: 12.5,
                    color: "var(--t2)",
                    border: "1px solid var(--line)",
                    borderRadius: 6,
                    padding: "6px 14px",
                    background: "transparent",
                    cursor: "pointer",
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCrear}
                  disabled={isPending}
                  style={{
                    fontSize: 12.5,
                    fontWeight: 500,
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    padding: "6px 16px",
                    background: "var(--accent)",
                    cursor: "pointer",
                    opacity: isPending ? 0.6 : 1,
                  }}
                >
                  {isPending ? "Guardando…" : "Crear alumno"}
                </button>
              </div>
            </PanelCard>
          </div>
        )}

        {/* Edit panel */}
        {editingAlumno && (
          <div style={{ padding: "20px 28px 0" }}>
            <EditarAlumno
              alumno={editingAlumno}
              groups={groups}
              onClose={() => setEditingAlumno(null)}
              onSaved={() => { setEditingAlumno(null); router.refresh(); }}
            />
          </div>
        )}

        {/* Delete error */}
        {deleteError && (
          <div
            style={{
              margin: "16px 28px 0",
              fontSize: 12.5,
              color: "var(--err)",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 6,
              padding: "10px 14px",
            }}
          >
            {deleteError}
          </div>
        )}

        {/* Table */}
        {alumnos.length === 0 ? (
          <p style={{ padding: "40px 28px", color: "var(--t3)", fontSize: 13 }}>
            No hay alumnos creados todavía.
          </p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg2)" }}>
                {["Nombre", "Email", "Teléfono", ""].map((col) => (
                  <th
                    key={col}
                    style={{
                      textAlign: "left",
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
              {alumnos.map((a) => (
                <AlumnoRow
                  key={a.id}
                  alumno={a}
                  editing={editingAlumno?.id === a.id}
                  deleting={deletingId === a.id}
                  onEdit={() => handleEditAlumno(a)}
                  onDelete={() => handleEliminar(a.id)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function AlumnoRow({
  alumno,
  editing,
  deleting,
  onEdit,
  onDelete,
}: {
  alumno: Alumno;
  editing: boolean;
  deleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <tr
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ background: hovered ? "var(--bg2)" : "transparent", transition: "background 0.1s" }}
    >
      <td style={{ padding: "11px 20px", borderBottom: "1px solid var(--line)", fontSize: 13, fontWeight: 500, color: "var(--t1)" }}>
        {alumno.full_name}
      </td>
      <td style={{ padding: "11px 20px", borderBottom: "1px solid var(--line)", fontSize: 13, color: "var(--t2)" }}>
        {alumno.email ?? "—"}
      </td>
      <td style={{ padding: "11px 20px", borderBottom: "1px solid var(--line)", fontSize: 13, color: "var(--t2)" }}>
        {alumno.phone ?? "—"}
      </td>
      <td
        style={{
          padding: "11px 20px",
          borderBottom: "1px solid var(--line)",
          textAlign: "right",
          whiteSpace: "nowrap",
        }}
      >
        <button
          onClick={onEdit}
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: editing ? "var(--accent)" : "var(--t2)",
            background: editing ? "var(--accent-light)" : "transparent",
            border: `1px solid ${editing ? "var(--accent-border)" : "var(--line)"}`,
            borderRadius: 6,
            padding: "4px 12px",
            cursor: "pointer",
            marginRight: 6,
            transition: "all 0.12s",
          }}
        >
          Editar
        </button>
        <button
          onClick={onDelete}
          disabled={deleting}
          style={{
            fontSize: 18,
            lineHeight: 1,
            color: hovered ? "var(--err)" : "var(--t3)",
            background: "none",
            border: "none",
            cursor: "pointer",
            opacity: deleting ? 0.3 : 1,
            transition: "color 0.1s",
            verticalAlign: "middle",
          }}
          title="Eliminar alumno"
        >
          ×
        </button>
      </td>
    </tr>
  );
}
