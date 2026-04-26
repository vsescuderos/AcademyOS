"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  crearAcademia,
  actualizarAcademia,
  eliminarAcademia,
  cambiarAcademia,
} from "@/actions/academia";

interface Academy { id: string; name: string; phone: string | null; created_at: string }
interface Props {
  activeAcademy: Academy | null;
  allAcademies: Academy[];
}

const inputStyle: React.CSSProperties = {
  border: "1px solid var(--line)", borderRadius: 6, padding: "8px 11px",
  fontSize: 13, color: "var(--t1)", background: "var(--bg)", outline: "none", width: "100%",
};
const labelStyle: React.CSSProperties = {
  fontSize: 11.5, fontWeight: 600, color: "var(--t3)", marginBottom: 4, display: "block",
};
const btnPrimary: React.CSSProperties = {
  padding: "8px 16px", borderRadius: 6, fontSize: 13, fontWeight: 500,
  color: "#fff", background: "var(--accent)", border: "none", cursor: "pointer",
};
const btnSecondary: React.CSSProperties = {
  padding: "8px 14px", borderRadius: 6, fontSize: 13, color: "var(--t2)",
  background: "transparent", border: "1px solid var(--line)", cursor: "pointer",
};

export default function ConfiguracionView({ activeAcademy, allAcademies }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(activeAcademy?.name ?? "");
  const [editPhone, setEditPhone] = useState(activeAcademy?.phone ?? "");
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [switchingTo, setSwitchingTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const otherAcademies = allAcademies.filter(a => a.id !== activeAcademy?.id);

  function run(fn: () => Promise<{ error?: string }>, onOk?: () => void) {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await fn();
      if (res.error) { setError(res.error); return; }
      onOk?.();
      router.refresh();
    });
  }

  function handleSave() {
    if (!editName.trim()) return;
    run(
      () => actualizarAcademia({ name: editName.trim(), phone: editPhone.trim() || null }),
      () => { setEditing(false); setSaved(true); }
    );
  }

  function handleCreate() {
    if (!createName.trim()) return;
    run(() => crearAcademia(createName.trim()), () => { setShowCreate(false); setCreateName(""); });
  }

  function handleDelete() {
    run(() => eliminarAcademia(), () => setConfirmDelete(false));
  }

  function handleSwitch(academyId: string) {
    setSwitchingTo(academyId);
    run(() => cambiarAcademia(academyId), () => setSwitchingTo(null));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{
        height: 54, borderBottom: "1px solid var(--line)", display: "flex",
        alignItems: "center", padding: "0 28px", flexShrink: 0, background: "var(--bg)",
      }}>
        <span style={{ fontWeight: 600, fontSize: 16, color: "var(--t1)" }}>Configuración</span>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "32px 28px" }}>
        <div style={{ maxWidth: 520 }}>

          {error && (
            <p style={{ fontSize: 12.5, color: "var(--err)", background: "#fef2f2", borderRadius: 6, padding: "8px 12px", marginBottom: 16 }}>
              {error}
            </p>
          )}
          {saved && (
            <p style={{ fontSize: 12.5, color: "var(--ok)", background: "var(--ok-dim)", borderRadius: 6, padding: "8px 12px", marginBottom: 16 }}>
              Cambios guardados correctamente.
            </p>
          )}

          {/* ── No academies ── */}
          {allAcademies.length === 0 && (
            <div style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--t1)", marginBottom: 8 }}>
                Aún no tienes ninguna academia
              </h2>
              <p style={{ fontSize: 13, color: "var(--t2)", marginBottom: 16 }}>
                Crea tu primera academia para empezar a gestionar grupos, alumnos y profesores.
              </p>
              {!showCreate ? (
                <button onClick={() => { setShowCreate(true); setError(null); }} style={btnPrimary}>
                  + Crear academia
                </button>
              ) : (
                <CreateForm
                  value={createName}
                  onChange={setCreateName}
                  onSubmit={handleCreate}
                  onCancel={() => { setShowCreate(false); setCreateName(""); setError(null); }}
                  pending={isPending}
                />
              )}
            </div>
          )}

          {/* ── Active academy ── */}
          {activeAcademy && (
            <>
              <section style={{ marginBottom: 32 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--t1)", margin: 0 }}>
                    {activeAcademy.name}
                  </h2>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: "var(--ok-dim)", color: "var(--ok)" }}>
                    Activa
                  </span>
                  {!editing && (
                    <button
                      onClick={() => { setEditing(true); setEditName(activeAcademy.name); setEditPhone(activeAcademy.phone ?? ""); setSaved(false); setError(null); }}
                      style={{ fontSize: 12, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}
                    >
                      Editar
                    </button>
                  )}
                </div>

                {!editing && activeAcademy.phone && (
                  <p style={{ fontSize: 13, color: "var(--t2)", marginBottom: 0 }}>
                    Tel: {activeAcademy.phone}
                  </p>
                )}

                {editing && (
                  <div style={{ background: "var(--bg2)", border: "1px solid var(--line)", borderRadius: 10, padding: "16px 20px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 14 }}>
                      <div>
                        <label style={labelStyle}>Nombre de la academia</label>
                        <input
                          autoFocus
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          style={inputStyle}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Teléfono de contacto</label>
                        <input
                          value={editPhone}
                          onChange={e => setEditPhone(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && handleSave()}
                          placeholder="Ej. 600 000 000"
                          style={inputStyle}
                        />
                        <span style={{ fontSize: 11.5, color: "var(--t3)", marginTop: 4, display: "block" }}>
                          Aparece en los recibos de cobro.
                        </span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={handleSave} disabled={isPending || !editName.trim()} style={{ ...btnPrimary, opacity: isPending || !editName.trim() ? 0.6 : 1 }}>
                        {isPending ? "Guardando…" : "Guardar"}
                      </button>
                      <button onClick={() => { setEditing(false); setError(null); }} style={btnSecondary}>Cancelar</button>
                    </div>
                  </div>
                )}
              </section>

              {/* ── Other academies ── */}
              {(otherAcademies.length > 0 || allAcademies.length > 0) && (
                <section style={{ marginBottom: 32 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
                    Otras academias
                  </div>
                  {otherAcademies.length === 0 ? (
                    <p style={{ fontSize: 13, color: "var(--t3)" }}>No tienes más academias.</p>
                  ) : (
                    otherAcademies.map(a => (
                      <div key={a.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--t1)" }}>{a.name}</span>
                        <button
                          onClick={() => handleSwitch(a.id)}
                          disabled={isPending}
                          style={{ fontSize: 12, fontWeight: 500, color: "var(--accent)", background: "var(--accent-light)", border: "1px solid var(--accent-border)", borderRadius: 6, padding: "4px 10px", cursor: "pointer", opacity: isPending && switchingTo === a.id ? 0.6 : 1 }}
                        >
                          {isPending && switchingTo === a.id ? "Activando…" : "Activar"}
                        </button>
                      </div>
                    ))
                  )}
                </section>
              )}

              {/* ── Create new ── */}
              <section style={{ marginBottom: 32 }}>
                {!showCreate ? (
                  <button
                    onClick={() => { setShowCreate(true); setError(null); }}
                    style={{ fontSize: 12.5, color: "var(--accent)", background: "none", border: "1px dashed var(--accent-border)", borderRadius: 7, padding: "7px 14px", cursor: "pointer", width: "100%" }}
                  >
                    + Nueva academia
                  </button>
                ) : (
                  <CreateForm
                    value={createName}
                    onChange={setCreateName}
                    onSubmit={handleCreate}
                    onCancel={() => { setShowCreate(false); setCreateName(""); setError(null); }}
                    pending={isPending}
                  />
                )}
              </section>

              {/* ── Danger zone ── */}
              <section style={{ borderTop: "1px solid var(--line)", paddingTop: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                  Zona de peligro
                </div>
                <p style={{ fontSize: 12.5, color: "var(--t2)", marginBottom: 12 }}>
                  Solo es posible eliminar una academia vacía (sin grupos, alumnos ni profesores).
                </p>
                {!confirmDelete ? (
                  <button
                    onClick={() => { setConfirmDelete(true); setError(null); }}
                    style={{ padding: "7px 12px", borderRadius: 6, fontSize: 12.5, fontWeight: 500, color: "var(--err)", background: "#fef2f2", border: "1px solid #fecaca", cursor: "pointer" }}
                  >
                    Eliminar academia
                  </button>
                ) : (
                  <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "12px 16px" }}>
                    <p style={{ fontSize: 12.5, color: "var(--err)", fontWeight: 500, marginBottom: 10 }}>
                      ¿Eliminar &quot;{activeAcademy.name}&quot;? Esta acción no se puede deshacer.
                    </p>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={handleDelete} disabled={isPending} style={{ padding: "7px 12px", borderRadius: 6, fontSize: 12.5, fontWeight: 500, color: "#fff", background: "var(--err)", border: "none", cursor: "pointer", opacity: isPending ? 0.6 : 1 }}>
                        {isPending ? "Eliminando…" : "Sí, eliminar"}
                      </button>
                      <button onClick={() => { setConfirmDelete(false); setError(null); }} style={btnSecondary}>Cancelar</button>
                    </div>
                  </div>
                )}
              </section>
            </>
          )}

        </div>
      </div>
    </div>
  );
}

function CreateForm({
  value, onChange, onSubmit, onCancel, pending,
}: { value: string; onChange: (v: string) => void; onSubmit: () => void; onCancel: () => void; pending: boolean }) {
  return (
    <div style={{ background: "var(--bg2)", border: "1px solid var(--line)", borderRadius: 10, padding: "20px 24px" }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)", marginBottom: 12 }}>Nueva academia</div>
      <input
        autoFocus
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => e.key === "Enter" && onSubmit()}
        placeholder="Nombre de la academia"
        style={{ border: "1px solid var(--line)", borderRadius: 6, padding: "8px 11px", fontSize: 13, color: "var(--t1)", background: "var(--bg)", outline: "none", width: "100%", marginBottom: 12 }}
      />
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onSubmit} disabled={pending || !value.trim()} style={{ padding: "8px 14px", borderRadius: 6, fontSize: 13, fontWeight: 500, color: "#fff", background: "var(--accent)", border: "none", cursor: "pointer", opacity: pending ? 0.6 : 1 }}>
          {pending ? "Creando…" : "Crear"}
        </button>
        <button onClick={onCancel} style={{ padding: "8px 14px", borderRadius: 6, fontSize: 13, color: "var(--t2)", background: "transparent", border: "1px solid var(--line)", cursor: "pointer" }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
