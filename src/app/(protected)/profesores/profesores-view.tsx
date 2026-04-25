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

function InfoItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 600, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 13, color: "var(--t1)" }}>{children}</div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", border: "1px solid var(--line)", borderRadius: 6,
  padding: "7px 10px", fontSize: 13, color: "var(--t1)", background: "var(--bg)", outline: "none",
};

function GroupChecklist({ allGroups, selectedIds, currentProfesorId, onChange }: {
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
            <label key={g.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 14px", cursor: isTaken ? "not-allowed" : "pointer", fontSize: 13, color: isTaken ? "var(--t3)" : "var(--t1)", opacity: isTaken ? 0.6 : 1 }}>
              <input
                type="checkbox"
                checked={isChecked}
                disabled={isTaken}
                onChange={() => {
                  if (isTaken) return;
                  onChange(isChecked ? selectedIds.filter((id) => id !== g.id) : [...selectedIds, g.id]);
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

export default function ProfesoresView({ profesores, allGroups }: {
  profesores: Profesor[];
  allGroups: GroupInfo[];
}) {
  const router = useRouter();
  const [panel, setPanel] = useState<"none" | "profesor" | "excel">("none");
  const [isPending, startTransition] = useTransition();
  const [expandedProfesorId, setExpandedProfesorId] = useState<string | null>(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [showSinGrupo, setShowSinGrupo] = useState(false);
  const [search, setSearch] = useState("");

  const filteredProfesores = profesores.filter((p) => {
    if (showSinGrupo) return !p.hasGroups;
    if (search.trim()) return p.full_name.toLowerCase().includes(search.toLowerCase().trim());
    return true;
  });

  function handleSearch(val: string) { setSearch(val); if (val.trim()) setShowSinGrupo(false); }
  function toggleSinGrupo() { if (!showSinGrupo) setSearch(""); setShowSinGrupo((v) => !v); }

  function openPanel(p: "profesor" | "excel") {
    setPanel((prev) => (prev === p ? "none" : p));
    setFormError(null);
    setForm(EMPTY_FORM);
  }

  function closePanel() { setPanel("none"); setForm(EMPTY_FORM); setFormError(null); }

  function handleClickProfesor(profesorId: string) {
    setExpandedProfesorId((prev) => (prev === profesorId ? null : profesorId));
    setPanel("none");
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
      if (result.error) { setFormError(result.error); } else { closePanel(); router.refresh(); }
    });
  }

  async function handleEliminar(profesorId: string) {
    setDeleteError(null);
    setDeletingId(profesorId);
    const result = await eliminarProfesor(profesorId);
    setDeletingId(null);
    if (result.error) { setDeleteError(result.error); } else { setExpandedProfesorId(null); router.refresh(); }
  }

  const confirmingProfesor = confirmingDeleteId ? profesores.find((p) => p.id === confirmingDeleteId) ?? null : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Topbar */}
      <div style={{ height: 54, borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", padding: "0 28px", justifyContent: "space-between", flexShrink: 0, background: "var(--bg)" }}>
        <span style={{ fontWeight: 600, fontSize: 16, color: "var(--t1)" }}>Profesores</span>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => openPanel("excel")} style={{ fontSize: 12.5, color: "var(--t2)", border: "1px solid var(--line)", borderRadius: 6, padding: "5px 12px", background: "transparent", cursor: "pointer" }}>Importar Excel</button>
          <button onClick={() => openPanel("profesor")} style={{ fontSize: 12.5, fontWeight: 500, color: "#fff", border: "none", borderRadius: 6, padding: "5px 14px", background: "var(--accent)", cursor: "pointer" }}>+ Nuevo profesor</button>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ padding: "8px 28px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 8, flexShrink: 0, background: "var(--bg)" }}>
        <input type="text" placeholder="Buscar por profesor…" value={search} onChange={(e) => handleSearch(e.target.value)} style={{ flex: 1, maxWidth: 260, border: "1px solid var(--line)", borderRadius: 6, padding: "6px 10px", fontSize: 12.5, color: "var(--t1)", background: "var(--bg)", outline: "none" }} />
        <button onClick={toggleSinGrupo} style={{ fontSize: 12, fontWeight: 500, color: showSinGrupo ? "var(--accent)" : "var(--t2)", background: showSinGrupo ? "var(--accent-light)" : "transparent", border: `1px solid ${showSinGrupo ? "var(--accent-border)" : "var(--line)"}`, borderRadius: 6, padding: "5px 12px", cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.12s" }}>
          Profesores sin grupo
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {panel === "excel" && (
          <div style={{ padding: "20px 28px 0" }}>
            <ExcelImportProfesores onSuccess={() => { closePanel(); router.refresh(); }} onCancel={closePanel} />
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
                  <GroupChecklist allGroups={allGroups} selectedIds={form.groupIds} currentProfesorId={undefined} onChange={(ids) => setForm((f) => ({ ...f, groupIds: ids }))} />
                </div>
              </div>
              {formError && <p style={{ marginTop: 12, fontSize: 12.5, color: "var(--err)", background: "#fef2f2", borderRadius: 6, padding: "8px 12px" }}>{formError}</p>}
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

        {profesores.length === 0 ? (
          <p style={{ padding: "40px 28px", color: "var(--t3)", fontSize: 13 }}>No hay profesores creados todavía.</p>
        ) : filteredProfesores.length === 0 ? (
          <p style={{ padding: "40px 28px", color: "var(--t3)", fontSize: 13 }}>No hay profesores que coincidan con el filtro.</p>
        ) : (
          <div style={{ margin: "20px 28px", border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden" }}>
            {filteredProfesores.map((p, i) => (
              <ProfesorRow
                key={p.id}
                profesor={p}
                allGroups={allGroups}
                expanded={expandedProfesorId === p.id}
                isLast={i === filteredProfesores.length - 1}
                onToggle={() => handleClickProfesor(p.id)}
                onRequestDelete={() => setConfirmingDeleteId(p.id)}
                onSaved={() => { setExpandedProfesorId(null); router.refresh(); }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {confirmingProfesor && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setConfirmingDeleteId(null)}>
          <div style={{ background: "var(--bg)", borderRadius: 12, padding: "28px 32px", maxWidth: 380, width: "90%", boxShadow: "0 8px 32px rgba(0,0,0,0.14)" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--t1)", marginBottom: 10 }}>Eliminar profesor</div>
            <p style={{ fontSize: 13.5, color: "var(--t2)", marginBottom: 24, lineHeight: 1.55 }}>
              Estás a punto de eliminar al profesor <strong>&apos;{confirmingProfesor.full_name}&apos;</strong>. Esta acción no se puede deshacer.
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setConfirmingDeleteId(null)} style={{ fontSize: 12.5, color: "var(--t2)", border: "1px solid var(--line)", borderRadius: 6, padding: "7px 16px", background: "transparent", cursor: "pointer" }}>Cancelar</button>
              <button onClick={() => { setConfirmingDeleteId(null); handleEliminar(confirmingProfesor.id); }} disabled={deletingId === confirmingProfesor.id} style={{ fontSize: 12.5, fontWeight: 500, color: "#fff", border: "none", borderRadius: 6, padding: "7px 16px", background: "#dc2626", cursor: "pointer", opacity: deletingId === confirmingProfesor.id ? 0.6 : 1 }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProfesorRow({ profesor, allGroups, expanded, isLast, onToggle, onRequestDelete, onSaved }: {
  profesor: Profesor; allGroups: GroupInfo[];
  expanded: boolean; isLast: boolean;
  onToggle: () => void; onRequestDelete: () => void; onSaved: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: profesor.full_name,
    groupIds: profesor.groups.map((g) => g.id),
  });
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    if (!expanded) setIsEditMode(false);
  }, [expanded]);

  useEffect(() => {
    if (isEditMode) {
      setEditForm({ full_name: profesor.full_name, groupIds: profesor.groups.map((g) => g.id) });
      setEditError(null);
    }
  }, [isEditMode]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave() {
    if (!editForm.full_name.trim()) { setEditError("El nombre es obligatorio."); return; }
    setSaving(true); setEditError(null);
    const r1 = await actualizarProfesor(profesor.id, { full_name: editForm.full_name });
    if (r1.error) { setSaving(false); setEditError(r1.error); return; }
    const r2 = await asignarGruposAProfesor(profesor.id, editForm.groupIds);
    setSaving(false);
    if (r2.error) { setEditError(r2.error); } else { onSaved(); }
  }

  const rowInputStyle: React.CSSProperties = { width: "100%", border: "1px solid var(--line)", borderRadius: 6, padding: "7px 10px", fontSize: 13, color: "var(--t1)", background: "var(--bg)", outline: "none" };

  return (
    <div>
      <div
        onClick={onToggle}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: "flex", alignItems: "center", padding: "13px 20px", cursor: "pointer",
          background: expanded ? "var(--accent-light)" : hovered ? "var(--bg2)" : "var(--bg)",
          borderLeft: `3px solid ${expanded ? "var(--accent)" : "transparent"}`,
          borderBottom: (!isLast || expanded) ? "1px solid var(--line)" : "none",
          transition: "background 0.12s", userSelect: "none",
        }}
      >
        <span style={{ flex: 1, fontSize: 13.5, fontWeight: expanded ? 500 : 400, color: expanded ? "var(--accent)" : "var(--t1)" }}>
          {profesor.full_name}
        </span>
        {profesor.groups.length > 0 && (
          <div style={{ display: "flex", gap: 4, marginRight: 14, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {profesor.groups.map((g) => (
              <span key={g.id} style={{ fontSize: 11, fontWeight: 500, background: expanded ? "var(--accent)" : "var(--accent-light)", color: expanded ? "#fff" : "var(--accent)", borderRadius: 4, padding: "2px 7px", whiteSpace: "nowrap" }}>
                {g.name}
              </span>
            ))}
          </div>
        )}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={expanded ? "var(--accent)" : "var(--t3)"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {expanded && (
        <div style={{ borderBottom: isLast ? "none" : "1px solid var(--line)" }}>
          {!isEditMode ? (
            <div style={{ padding: "16px 20px", background: "var(--bg2)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 16 }}>
                <InfoItem label="Nombre">{profesor.full_name}</InfoItem>
                <InfoItem label="Email"><span style={{ color: "var(--t2)" }}>{profesor.email}</span></InfoItem>
                <InfoItem label="Grupos">
                  {profesor.groups.length === 0 ? (
                    <span style={{ color: "var(--t3)" }}>Sin grupos</span>
                  ) : (
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {profesor.groups.map((g) => (
                        <span key={g.id} style={{ fontSize: 11, fontWeight: 500, background: "var(--accent-light)", color: "var(--accent)", borderRadius: 4, padding: "2px 7px" }}>{g.name}</span>
                      ))}
                    </div>
                  )}
                </InfoItem>
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button onClick={onRequestDelete} style={{ fontSize: 12.5, fontWeight: 500, color: "#dc2626", border: "1px solid #fecaca", background: "#fef2f2", borderRadius: 6, padding: "6px 14px", cursor: "pointer" }}>Eliminar</button>
                <button onClick={() => setIsEditMode(true)} style={{ fontSize: 12.5, fontWeight: 500, color: "#fff", border: "none", background: "var(--accent)", borderRadius: 6, padding: "6px 14px", cursor: "pointer" }}>Editar</button>
              </div>
            </div>
          ) : (
            <div style={{ padding: "20px 24px 24px", background: "var(--bg)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
                <Field label="Nombre completo">
                  <input type="text" value={editForm.full_name} onChange={(e) => setEditForm((f) => ({ ...f, full_name: e.target.value }))} style={rowInputStyle} />
                </Field>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: "var(--t2)" }}>GRUPOS ASIGNADOS</div>
                  <GroupChecklist allGroups={allGroups} selectedIds={editForm.groupIds} currentProfesorId={profesor.id} onChange={(ids) => setEditForm((f) => ({ ...f, groupIds: ids }))} />
                </div>
              </div>
              {editError && <p style={{ marginTop: 14, fontSize: 12.5, color: "var(--err)", background: "#fef2f2", borderRadius: 6, padding: "8px 12px" }}>{editError}</p>}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
                <button onClick={() => setIsEditMode(false)} style={{ fontSize: 12.5, color: "var(--t2)", border: "1px solid var(--line)", borderRadius: 6, padding: "6px 14px", background: "transparent", cursor: "pointer" }}>Cancelar</button>
                <button onClick={handleSave} disabled={saving} style={{ fontSize: 12.5, fontWeight: 500, color: "#fff", border: "none", borderRadius: 6, padding: "6px 16px", background: "var(--accent)", cursor: "pointer", opacity: saving ? 0.6 : 1 }}>
                  {saving ? "Guardando…" : "Guardar cambios"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
