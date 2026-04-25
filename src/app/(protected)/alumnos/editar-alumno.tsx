"use client";

import { useState, useEffect, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { editarAlumno } from "@/actions/director";

type Alumno = { id: string; full_name: string; email: string | null; phone: string | null };
type Group = { id: string; name: string; days: string[]; time_start: string | null; time_end: string | null };

function groupsConflict(a: Group, b: Group): boolean {
  const shareDay = a.days.some((d) => b.days.includes(d));
  if (!shareDay) return false;
  if (!a.time_start || !a.time_end || !b.time_start || !b.time_end) return false;
  return a.time_start < b.time_end && b.time_start < a.time_end;
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

export default function EditarAlumno({
  alumno,
  groups,
  onClose,
  onSaved,
}: {
  alumno: Alumno;
  groups: Group[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    full_name: alumno.full_name,
    email: alumno.email ?? "",
    phone: alumno.phone ?? "",
  });
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [groupConflictError, setGroupConflictError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("group_students")
      .select("group_id")
      .eq("student_id", alumno.id)
      .then(({ data }) => {
        setSelectedGroupIds(new Set((data ?? []).map((r) => r.group_id)));
        setLoadingGroups(false);
      });
  }, [alumno.id]);

  function toggleGroup(groupId: string) {
    setGroupConflictError(null);
    if (selectedGroupIds.has(groupId)) {
      setSelectedGroupIds((prev) => { const next = new Set(prev); next.delete(groupId); return next; });
      return;
    }
    const newGroup = groups.find((g) => g.id === groupId);
    if (newGroup) {
      const conflict = groups.find((g) => selectedGroupIds.has(g.id) && groupsConflict(newGroup, g));
      if (conflict) {
        setGroupConflictError(`"${newGroup.name}" tiene conflicto de horario con "${conflict.name}".`);
        return;
      }
    }
    setSelectedGroupIds((prev) => new Set([...prev, groupId]));
  }

  function handleSave() {
    if (!form.full_name.trim()) { setError("El nombre es obligatorio."); return; }
    setError(null);
    startTransition(async () => {
      const result = await editarAlumno(alumno.id, {
        full_name: form.full_name.trim(),
        email: form.email,
        phone: form.phone,
        groupIds: [...selectedGroupIds],
      });
      if (result.error) { setError(result.error); } else { onSaved(); }
    });
  }

  return (
    <div style={{ padding: "20px 24px 24px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <Field label="Nombre completo *">
            <input type="text" value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} style={inputStyle} />
          </Field>
        </div>
        <Field label="Email">
          <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} style={inputStyle} />
        </Field>
        <Field label="Teléfono">
          <input type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} style={inputStyle} />
        </Field>
        {groups.length > 0 && (
          <div style={{ gridColumn: "1 / -1" }}>
            <Field label="Grupos">
              {loadingGroups ? (
                <p style={{ fontSize: 13, color: "var(--t3)", marginTop: 4 }}>Cargando…</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4, border: "1px solid var(--line)", borderRadius: 6, padding: "4px 0", maxHeight: 160, overflowY: "auto" }}>
                  {groups.map((g) => (
                    <label key={g.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 12px", cursor: "pointer", fontSize: 13, color: "var(--t1)" }}>
                      <input type="checkbox" checked={selectedGroupIds.has(g.id)} onChange={() => toggleGroup(g.id)} style={{ width: 14, height: 14, accentColor: "var(--accent)", cursor: "pointer" }} />
                      {g.name}
                    </label>
                  ))}
                </div>
              )}
              {groupConflictError && (
                <p style={{ margin: "6px 12px 2px", fontSize: 12, color: "var(--err)" }}>{groupConflictError}</p>
              )}
            </Field>
          </div>
        )}
      </div>
      {error && <p style={{ marginTop: 12, fontSize: 12.5, color: "var(--err)", background: "#fef2f2", borderRadius: 6, padding: "8px 12px" }}>{error}</p>}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
        <button onClick={onClose} style={{ fontSize: 12.5, color: "var(--t2)", border: "1px solid var(--line)", borderRadius: 6, padding: "6px 14px", background: "transparent", cursor: "pointer" }}>
          Cancelar
        </button>
        <button onClick={handleSave} disabled={isPending || loadingGroups} style={{ fontSize: 12.5, fontWeight: 500, color: "#fff", border: "none", borderRadius: 6, padding: "6px 16px", background: "var(--accent)", cursor: "pointer", opacity: isPending || loadingGroups ? 0.6 : 1 }}>
          {isPending ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </div>
  );
}
