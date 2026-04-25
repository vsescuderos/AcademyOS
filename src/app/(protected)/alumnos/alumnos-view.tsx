"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { crearAlumno, eliminarAlumno } from "@/actions/director";
import ExcelImportAlumnos from "./excel-import-alumnos";
import EditarAlumno from "./editar-alumno";

type Alumno = { id: string; full_name: string; email: string | null; phone: string | null; groups: { id: string; name: string }[] };
type Group = { id: string; name: string; days: string[]; time_start: string | null; time_end: string | null };

function groupsConflict(a: Group, b: Group): boolean {
  const shareDay = a.days.some((d) => b.days.includes(d));
  if (!shareDay) return false;
  if (!a.time_start || !a.time_end || !b.time_start || !b.time_end) return false;
  return a.time_start < b.time_end && b.time_start < a.time_end;
}

const EMPTY_FORM = { full_name: "", email: "", phone: "", groupIds: [] as string[] };

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

export default function AlumnosView({ alumnos, groups }: { alumnos: Alumno[]; groups: Group[] }) {
  const router = useRouter();
  const [panel, setPanel] = useState<"none" | "alumno" | "excel">("none");
  const [isPending, startTransition] = useTransition();
  const [expandedAlumnoId, setExpandedAlumnoId] = useState<string | null>(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [groupConflictError, setGroupConflictError] = useState<string | null>(null);

  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [showSinGrupo, setShowSinGrupo] = useState(false);
  const [search, setSearch] = useState("");

  const filteredAlumnos = alumnos.filter((a) => {
    if (showSinGrupo) return a.groups.length === 0;
    if (search.trim()) return a.full_name.toLowerCase().includes(search.toLowerCase().trim());
    return true;
  });

  function handleSearch(val: string) { setSearch(val); if (val.trim()) setShowSinGrupo(false); }
  function toggleSinGrupo() { if (!showSinGrupo) setSearch(""); setShowSinGrupo((v) => !v); }

  function openPanel(p: "alumno" | "excel") {
    setPanel((prev) => (prev === p ? "none" : p));
    setFormError(null);
    setForm(EMPTY_FORM);
  }

  function closePanel() { setPanel("none"); setForm(EMPTY_FORM); setFormError(null); setGroupConflictError(null); }

  function handleClickAlumno(alumnoId: string) {
    setExpandedAlumnoId((prev) => (prev === alumnoId ? null : alumnoId));
    setPanel("none");
  }

  function toggleGroup(groupId: string) {
    setGroupConflictError(null);
    if (form.groupIds.includes(groupId)) {
      setForm((f) => ({ ...f, groupIds: f.groupIds.filter((id) => id !== groupId) }));
      return;
    }
    const newGroup = groups.find((g) => g.id === groupId);
    if (newGroup) {
      const conflict = groups.find((g) => form.groupIds.includes(g.id) && groupsConflict(newGroup, g));
      if (conflict) {
        setGroupConflictError(`"${newGroup.name}" tiene conflicto de horario con "${conflict.name}".`);
        return;
      }
    }
    setForm((f) => ({ ...f, groupIds: [...f.groupIds, groupId] }));
  }

  function handleCrear() {
    if (!form.full_name.trim()) { setFormError("El nombre es obligatorio."); return; }
    startTransition(async () => {
      const result = await crearAlumno(form);
      if (result.error) { setFormError(result.error); } else { closePanel(); router.refresh(); }
    });
  }

  async function handleEliminar(id: string) {
    setDeleteError(null);
    setDeletingId(id);
    const result = await eliminarAlumno(id);
    setDeletingId(null);
    if (result.error) { setDeleteError(result.error); } else { setExpandedAlumnoId(null); router.refresh(); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Topbar */}
      <div style={{ height: 54, borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", padding: "0 28px", justifyContent: "space-between", flexShrink: 0, background: "var(--bg)" }}>
        <span style={{ fontWeight: 600, fontSize: 16, color: "var(--t1)" }}>Alumnos</span>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => openPanel("excel")} style={{ fontSize: 12.5, color: "var(--t2)", border: "1px solid var(--line)", borderRadius: 6, padding: "5px 12px", background: "transparent", cursor: "pointer" }}>Importar Excel</button>
          <button onClick={() => openPanel("alumno")} style={{ fontSize: 12.5, fontWeight: 500, color: "#fff", border: "none", borderRadius: 6, padding: "5px 14px", background: "var(--accent)", cursor: "pointer" }}>+ Nuevo alumno</button>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ padding: "8px 28px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 8, flexShrink: 0, background: "var(--bg)" }}>
        <input type="text" placeholder="Buscar por alumno…" value={search} onChange={(e) => handleSearch(e.target.value)} style={{ flex: 1, maxWidth: 260, border: "1px solid var(--line)", borderRadius: 6, padding: "6px 10px", fontSize: 12.5, color: "var(--t1)", background: "var(--bg)", outline: "none" }} />
        <button onClick={toggleSinGrupo} style={{ fontSize: 12, fontWeight: 500, color: showSinGrupo ? "var(--accent)" : "var(--t2)", background: showSinGrupo ? "var(--accent-light)" : "transparent", border: `1px solid ${showSinGrupo ? "var(--accent-border)" : "var(--line)"}`, borderRadius: 6, padding: "5px 12px", cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.12s" }}>
          Alumnos sin grupo
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {panel === "excel" && (
          <div style={{ padding: "20px 28px 0" }}>
            <ExcelImportAlumnos onSuccess={() => { closePanel(); router.refresh(); }} onCancel={closePanel} />
          </div>
        )}

        {panel === "alumno" && (
          <div style={{ padding: "20px 28px 0" }}>
            <div style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 10, padding: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--t1)", marginBottom: 16 }}>Nuevo alumno</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <Field label="Nombre completo *">
                    <input type="text" value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} placeholder="Carlos Ruiz" style={inputStyle} />
                  </Field>
                </div>
                <Field label="Email">
                  <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="carlos@email.com" style={inputStyle} />
                </Field>
                <Field label="Teléfono">
                  <input type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="600 000 000" style={inputStyle} />
                </Field>
                {groups.length > 0 && (
                  <div style={{ gridColumn: "1 / -1" }}>
                    <Field label="Grupos (opcional)">
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4, border: "1px solid var(--line)", borderRadius: 6, padding: "4px 0", maxHeight: 160, overflowY: "auto" }}>
                        {groups.map((g) => (
                          <label key={g.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 12px", cursor: "pointer", fontSize: 13, color: "var(--t1)" }}>
                            <input type="checkbox" checked={form.groupIds.includes(g.id)} onChange={() => toggleGroup(g.id)} style={{ width: 14, height: 14, accentColor: "var(--accent)", cursor: "pointer" }} />
                            {g.name}
                          </label>
                        ))}
                      </div>
                      {groupConflictError && <p style={{ margin: "6px 12px 2px", fontSize: 12, color: "var(--err)" }}>{groupConflictError}</p>}
                    </Field>
                  </div>
                )}
              </div>
              {formError && <p style={{ marginTop: 12, fontSize: 12.5, color: "var(--err)", background: "#fef2f2", borderRadius: 6, padding: "8px 12px" }}>{formError}</p>}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
                <button onClick={closePanel} style={{ fontSize: 12.5, color: "var(--t2)", border: "1px solid var(--line)", borderRadius: 6, padding: "6px 14px", background: "transparent", cursor: "pointer" }}>Cancelar</button>
                <button onClick={handleCrear} disabled={isPending} style={{ fontSize: 12.5, fontWeight: 500, color: "#fff", border: "none", borderRadius: 6, padding: "6px 16px", background: "var(--accent)", cursor: "pointer", opacity: isPending ? 0.6 : 1 }}>
                  {isPending ? "Guardando…" : "Crear alumno"}
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

        {alumnos.length === 0 ? (
          <p style={{ padding: "40px 28px", color: "var(--t3)", fontSize: 13 }}>No hay alumnos creados todavía.</p>
        ) : filteredAlumnos.length === 0 ? (
          <p style={{ padding: "40px 28px", color: "var(--t3)", fontSize: 13 }}>No hay alumnos que coincidan con el filtro.</p>
        ) : (
          <div style={{ margin: "20px 28px", border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden" }}>
            {filteredAlumnos.map((a, i) => (
              <AlumnoRow
                key={a.id}
                alumno={a}
                groups={groups}
                expanded={expandedAlumnoId === a.id}
                isLast={i === filteredAlumnos.length - 1}
                onToggle={() => handleClickAlumno(a.id)}
                onRequestDelete={() => setConfirmingDeleteId(a.id)}
                onSaved={() => { setExpandedAlumnoId(null); router.refresh(); }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {confirmingDeleteId && (() => {
        const alumno = alumnos.find((a) => a.id === confirmingDeleteId) ?? null;
        if (!alumno) return null;
        return (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setConfirmingDeleteId(null)}>
            <div style={{ background: "var(--bg)", borderRadius: 12, padding: "28px 32px", maxWidth: 380, width: "90%", boxShadow: "0 8px 32px rgba(0,0,0,0.14)" }} onClick={(e) => e.stopPropagation()}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--t1)", marginBottom: 10 }}>Eliminar alumno</div>
              <p style={{ fontSize: 13.5, color: "var(--t2)", marginBottom: 24, lineHeight: 1.55 }}>
                Estás a punto de eliminar al alumno <strong>&apos;{alumno.full_name}&apos;</strong>. Esta acción no se puede deshacer.
              </p>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button onClick={() => setConfirmingDeleteId(null)} style={{ fontSize: 12.5, color: "var(--t2)", border: "1px solid var(--line)", borderRadius: 6, padding: "7px 16px", background: "transparent", cursor: "pointer" }}>Cancelar</button>
                <button onClick={() => { setConfirmingDeleteId(null); handleEliminar(alumno.id); }} disabled={deletingId === alumno.id} style={{ fontSize: 12.5, fontWeight: 500, color: "#fff", border: "none", borderRadius: 6, padding: "7px 16px", background: "#dc2626", cursor: "pointer", opacity: deletingId === alumno.id ? 0.6 : 1 }}>Eliminar</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function AlumnoRow({ alumno, groups, expanded, isLast, onToggle, onRequestDelete, onSaved }: {
  alumno: Alumno; groups: Group[];
  expanded: boolean; isLast: boolean;
  onToggle: () => void; onRequestDelete: () => void; onSaved: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    if (!expanded) setIsEditMode(false);
  }, [expanded]);

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
          {alumno.full_name}
        </span>
        {alumno.groups.length > 0 && (
          <div style={{ display: "flex", gap: 4, marginRight: 14, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {alumno.groups.map((g) => (
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
                <InfoItem label="Email">
                  <span style={{ color: alumno.email ? "var(--t2)" : "var(--t3)" }}>{alumno.email ?? "—"}</span>
                </InfoItem>
                <InfoItem label="Teléfono">
                  <span style={{ color: alumno.phone ? "var(--t2)" : "var(--t3)" }}>{alumno.phone ?? "—"}</span>
                </InfoItem>
                <InfoItem label="Grupos">
                  {alumno.groups.length === 0 ? (
                    <span style={{ color: "var(--t3)" }}>Sin grupos</span>
                  ) : (
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {alumno.groups.map((g) => (
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
            <div style={{ background: "var(--bg)" }}>
              <EditarAlumno
                alumno={alumno}
                groups={groups}
                onClose={() => setIsEditMode(false)}
                onSaved={onSaved}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
