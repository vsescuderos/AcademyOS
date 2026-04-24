"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  crearProfesor,
  actualizarProfesor,
  eliminarProfesor,
  asignarGruposAProfesor,
} from "@/actions/director";
import ExcelImportProfesores from "./excel-import-profesores";

type Profesor = {
  id: string;
  full_name: string;
  email: string;
  hasGroups: boolean;
  groups: { id: string; name: string }[];
};
type GroupInfo = { id: string; name: string; profesor_id: string | null };

const EMPTY_FORM = { full_name: "", email: "", password: "", groupIds: [] as string[] };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--t2)", marginBottom: 4 }}>{label}</label>
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

function GroupChecklist({
  allGroups,
  selectedIds,
  currentProfesorId,
  onChange,
}: {
  allGroups: GroupInfo[];
  selectedIds: string[];
  currentProfesorId?: string;
  onChange: (ids: string[]) => void;
}) {
  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: 6, maxHeight: 180, overflowY: "auto", background: "var(--bg)" }}>
      {allGroups.length === 0 ? (
        <p style={{ padding: "12px 14px", fontSize: 13, color: "var(--t3)" }}>No hay grupos creados.</p>
      ) : (
        allGroups.map((g) => {
          const isChecked = selectedIds.includes(g.id);
          const isTaken = !!g.profesor_id && g.profesor_id !== currentProfesorId;
          return (
            <label
              key={g.id}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 14px", cursor: isTaken ? "not-allowed" : "pointer", fontSize: 13, color: isTaken ? "var(--t3)" : "var(--t1)", opacity: isTaken ? 0.6 : 1 }}
            >
              <input
                type="checkbox"
                checked={isChecked}
                disabled={isTaken}
                onChange={() => {
                  if (isTaken) return;
                  onChange(
                    isChecked ? selectedIds.filter((id) => id !== g.id) : [...selectedIds, g.id]
                  );
                }}
                style={{ width: 15, height: 15, accentColor: "var(--accent)", cursor: isTaken ? "not-allowed" : "pointer" }}
              />
              <span style={{ flex: 1 }}>{g.name}</span>
              {isTaken && <span style={{ fontSize: 11 }}>Asignado</span>}
            </label>
          );
        })
      )}
    </div>
  );
}

export default function ProfesoresView({
  profesores,
  allGroups,
}: {
  profesores: Profesor[];
  allGroups: GroupInfo[];
}) {
  const router = useRouter();
  const [panel, setPanel] = useState<"none" | "profesor" | "excel">("none");
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [showSinGrupo, setShowSinGrupo] = useState(false);

  const filteredProfesores = showSinGrupo
    ? profesores.filter((p) => !p.hasGroups)
    : profesores;

  function openPanel(p: "profesor" | "excel") {
    setPanel((prev) => (prev === p ? "none" : p));
    setFormError(null);
    setForm(EMPTY_FORM);
  }

  function closePanel() {
    setPanel("none");
    setForm(EMPTY_FORM);
    setFormError(null);
  }

  function handleCrear() {
    if (!form.full_name.trim() || !form.email.trim() || !form.password) {
      setFormError("Todos los campos son obligatorios.");
      return;
    }
    startTransition(async () => {
      const result = await crearProfesor({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        password: form.password,
        groupIds: form.groupIds,
      });
      if (result.error) {
        setFormError(result.error);
      } else {
        closePanel();
        router.refresh();
      }
    });
  }

  async function handleEliminar(profesorId: string) {
    setDeleteError(null);
    setDeletingId(profesorId);
    const result = await eliminarProfesor(profesorId);
    setDeletingId(null);
    if (result.error) {
      setDeleteError(result.error);
    } else {
      router.refresh();
    }
  }

  const confirmingProfesor = confirmingDeleteId
    ? profesores.find((p) => p.id === confirmingDeleteId) ?? null
    : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Topbar */}
      <div style={{ height: 54, borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", padding: "0 28px", justifyContent: "space-between", flexShrink: 0, background: "var(--bg)" }}>
        <span style={{ fontWeight: 600, fontSize: 16, color: "var(--t1)" }}>Profesores</span>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => openPanel("excel")}
            style={{ fontSize: 12.5, color: "var(--t2)", border: "1px solid var(--line)", borderRadius: 6, padding: "5px 12px", background: "transparent", cursor: "pointer" }}
          >
            Importar Excel
          </button>
          <button
            onClick={() => openPanel("profesor")}
            style={{ fontSize: 12.5, fontWeight: 500, color: "#fff", border: "none", borderRadius: 6, padding: "5px 14px", background: "var(--accent)", cursor: "pointer" }}
          >
            + Nuevo profesor
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ padding: "8px 28px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 8, flexShrink: 0, background: "var(--bg)" }}>
        <button
          onClick={() => setShowSinGrupo((v) => !v)}
          style={{ fontSize: 12, fontWeight: 500, color: showSinGrupo ? "var(--accent)" : "var(--t2)", background: showSinGrupo ? "var(--accent-light)" : "transparent", border: `1px solid ${showSinGrupo ? "var(--accent-border)" : "var(--line)"}`, borderRadius: 6, padding: "5px 12px", cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.12s" }}
        >
          Profesores sin grupo
        </button>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {panel === "excel" && (
          <div style={{ padding: "20px 28px 0" }}>
            <ExcelImportProfesores
              onSuccess={() => { closePanel(); router.refresh(); }}
              onCancel={closePanel}
            />
          </div>
        )}

        {panel === "profesor" && (
          <div style={{ padding: "20px 28px 0" }}>
            <div style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 10, padding: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--t1)", marginBottom: 16 }}>Nuevo profesor</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <Field label="Nombre completo">
                    <input type="text" value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} placeholder="Ana García" style={inputStyle} />
                  </Field>
                  <Field label="Email">
                    <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="ana@academia.com" style={inputStyle} />
                  </Field>
                  <Field label="Contraseña">
                    <input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} style={inputStyle} />
                  </Field>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: "var(--t2)" }}>GRUPOS ASIGNADOS</div>
                  <GroupChecklist
                    allGroups={allGroups}
                    selectedIds={form.groupIds}
                    currentProfesorId={undefined}
                    onChange={(ids) => setForm((f) => ({ ...f, groupIds: ids }))}
                  />
                </div>
              </div>

              {formError && (
                <p style={{ marginTop: 12, fontSize: 12.5, color: "var(--err)", background: "#fef2f2", borderRadius: 6, padding: "8px 12px" }}>{formError}</p>
              )}

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
                <button onClick={closePanel} style={{ fontSize: 12.5, color: "var(--t2)", border: "1px solid var(--line)", borderRadius: 6, padding: "6px 14px", background: "transparent", cursor: "pointer" }}>Cancelar</button>
                <button onClick={handleCrear} disabled={isPending} style={{ fontSize: 12.5, fontWeight: 500, color: "#fff", border: "none", borderRadius: 6, padding: "6px 16px", background: "var(--accent)", cursor: "pointer", opacity: isPending ? 0.6 : 1 }}>
                  {isPending ? "Guardando…" : "Crear profesor"}
                </button>
              </div>
            </div>
          </div>
        )}

        {deleteError && (
          <div style={{ margin: "16px 28px 0", fontSize: 12.5, color: "var(--err)", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <span>{deleteError}</span>
            <button onClick={() => setDeleteError(null)} style={{ fontSize: 16, lineHeight: 1, color: "var(--err)", background: "none", border: "none", cursor: "pointer", flexShrink: 0 }}>×</button>
          </div>
        )}

        {/* Table */}
        {profesores.length === 0 ? (
          <p style={{ padding: "40px 28px", color: "var(--t3)", fontSize: 13 }}>No hay profesores creados todavía.</p>
        ) : filteredProfesores.length === 0 ? (
          <p style={{ padding: "40px 28px", color: "var(--t3)", fontSize: 13 }}>No hay profesores que coincidan con el filtro.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg2)" }}>
                {["Nombre", "Email", "Grupos", ""].map((col) => (
                  <th key={col} style={{ textAlign: "left", padding: "9px 20px", fontSize: 11, fontWeight: 600, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid var(--line)" }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredProfesores.map((p) => (
                <ProfesorRow
                  key={p.id}
                  profesor={p}
                  allGroups={allGroups}
                  editing={editingId === p.id}
                  onEdit={() => setEditingId((prev) => (prev === p.id ? null : p.id))}
                  onSaved={() => { setEditingId(null); router.refresh(); }}
                  onRequestDelete={() => setConfirmingDeleteId(p.id)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Delete confirmation modal */}
      {confirmingProfesor && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
          onClick={() => setConfirmingDeleteId(null)}
        >
          <div
            style={{ background: "var(--bg)", borderRadius: 12, padding: "28px 32px", maxWidth: 380, width: "90%", boxShadow: "0 8px 32px rgba(0,0,0,0.14)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--t1)", marginBottom: 10 }}>Eliminar profesor</div>
            <p style={{ fontSize: 13.5, color: "var(--t2)", marginBottom: 24, lineHeight: 1.55 }}>
              Estás a punto de eliminar al profesor <strong>'{confirmingProfesor.full_name}'</strong>. Esta acción no se puede deshacer.
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setConfirmingDeleteId(null)} style={{ fontSize: 12.5, color: "var(--t2)", border: "1px solid var(--line)", borderRadius: 6, padding: "7px 16px", background: "transparent", cursor: "pointer" }}>Cancelar</button>
              <button
                onClick={() => { setConfirmingDeleteId(null); handleEliminar(confirmingProfesor.id); }}
                disabled={deletingId === confirmingProfesor.id}
                style={{ fontSize: 12.5, fontWeight: 500, color: "#fff", border: "none", borderRadius: 6, padding: "7px 16px", background: "#dc2626", cursor: "pointer", opacity: deletingId === confirmingProfesor.id ? 0.6 : 1 }}
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

function ProfesorRow({
  profesor,
  allGroups,
  editing,
  onEdit,
  onSaved,
  onRequestDelete,
}: {
  profesor: Profesor;
  allGroups: GroupInfo[];
  editing: boolean;
  onEdit: () => void;
  onSaved: () => void;
  onRequestDelete: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: profesor.full_name,
    groupIds: profesor.groups.map((g) => g.id),
  });
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    if (editing) {
      setEditForm({
        full_name: profesor.full_name,
        groupIds: profesor.groups.map((g) => g.id),
      });
      setEditError(null);
    }
  }, [editing]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave() {
    if (!editForm.full_name.trim()) {
      setEditError("El nombre es obligatorio.");
      return;
    }
    setSaving(true);
    setEditError(null);
    const r1 = await actualizarProfesor(profesor.id, { full_name: editForm.full_name });
    if (r1.error) { setSaving(false); setEditError(r1.error); return; }
    const r2 = await asignarGruposAProfesor(profesor.id, editForm.groupIds);
    setSaving(false);
    if (r2.error) { setEditError(r2.error); } else { onSaved(); }
  }

  const cellBorder = editing ? "none" : "1px solid var(--line)";

  return (
    <>
      <tr
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ background: editing ? "var(--accent-light)" : hovered ? "var(--bg2)" : "transparent", transition: "background 0.1s" }}
      >
        <td style={{ padding: "11px 20px", borderBottom: cellBorder, fontSize: 13, fontWeight: 500, color: "var(--t1)", whiteSpace: "nowrap" }}>
          {profesor.full_name}
        </td>
        <td style={{ padding: "11px 20px", borderBottom: cellBorder, fontSize: 13, color: "var(--t2)", whiteSpace: "nowrap" }}>
          {profesor.email}
        </td>
        <td style={{ padding: "11px 20px", borderBottom: cellBorder, verticalAlign: "middle" }}>
          {profesor.groups.length === 0 ? (
            <span style={{ fontSize: 12, color: "var(--t3)" }}>—</span>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {profesor.groups.map((g) => (
                <span key={g.id} style={{ fontSize: 11, fontWeight: 500, background: "var(--accent-light)", color: "var(--accent)", borderRadius: 4, padding: "2px 7px", whiteSpace: "nowrap" }}>
                  {g.name}
                </span>
              ))}
            </div>
          )}
        </td>
        <td style={{ padding: "11px 20px", borderBottom: cellBorder, textAlign: "right", whiteSpace: "nowrap" }}>
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
          <td colSpan={4} style={{ padding: 0, borderBottom: "1px solid var(--line)", background: "var(--bg2)" }}>
            <div style={{ padding: "20px 28px 24px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
                <Field label="Nombre completo">
                  <input
                    type="text"
                    value={editForm.full_name}
                    onChange={(e) => setEditForm((f) => ({ ...f, full_name: e.target.value }))}
                    style={inputStyle}
                  />
                </Field>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: "var(--t2)" }}>GRUPOS ASIGNADOS</div>
                  <GroupChecklist
                    allGroups={allGroups}
                    selectedIds={editForm.groupIds}
                    currentProfesorId={profesor.id}
                    onChange={(ids) => setEditForm((f) => ({ ...f, groupIds: ids }))}
                  />
                </div>
              </div>

              {editError && (
                <p style={{ marginTop: 14, fontSize: 12.5, color: "var(--err)", background: "#fef2f2", borderRadius: 6, padding: "8px 12px" }}>{editError}</p>
              )}

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
                <button onClick={onEdit} style={{ fontSize: 12.5, color: "var(--t2)", border: "1px solid var(--line)", borderRadius: 6, padding: "6px 14px", background: "transparent", cursor: "pointer" }}>Cancelar</button>
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
