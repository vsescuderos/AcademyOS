"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  crearAcademia,
  actualizarAcademia,
  eliminarAcademia,
  cambiarAcademia,
} from "@/actions/academia";

interface Academy {
  id: string;
  name: string;
  created_at: string;
}

interface Props {
  activeAcademy: Academy | null;
  allAcademies: Academy[];
  groupCount: number;
  professorCount: number;
  studentCount: number;
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ flex: 1, padding: "16px 20px", borderRight: "1px solid var(--line)" }}>
      <div style={{ fontSize: 22, fontWeight: 600, color: "var(--t1)" }}>{value}</div>
      <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 2 }}>{label}</div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  border: "1px solid var(--line)",
  borderRadius: 6,
  padding: "8px 11px",
  fontSize: 13,
  color: "var(--t1)",
  background: "var(--bg)",
  outline: "none",
  width: "100%",
};

const btnPrimary: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 6,
  fontSize: 13,
  fontWeight: 500,
  color: "#fff",
  background: "var(--accent)",
  border: "none",
  cursor: "pointer",
};

const btnSecondary: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 6,
  fontSize: 13,
  color: "var(--t2)",
  background: "transparent",
  border: "1px solid var(--line)",
  cursor: "pointer",
};

export default function HomeView({
  activeAcademy,
  allAcademies,
  groupCount,
  professorCount,
  studentCount,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(activeAcademy?.name ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [switchingTo, setSwitchingTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const otherAcademies = allAcademies.filter((a) => a.id !== activeAcademy?.id);

  function run(fn: () => Promise<{ error?: string }>, onOk?: () => void) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res.error) { setError(res.error); return; }
      onOk?.();
      router.refresh();
    });
  }

  function handleCreate() {
    if (!createName.trim()) return;
    run(() => crearAcademia(createName.trim()), () => {
      setShowCreate(false);
      setCreateName("");
    });
  }

  function handleEdit() {
    if (!editName.trim()) return;
    run(() => actualizarAcademia(editName.trim()), () => setEditing(false));
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
      {/* Topbar */}
      <div style={{
        height: 54, borderBottom: "1px solid var(--line)", display: "flex",
        alignItems: "center", padding: "0 28px", flexShrink: 0, background: "var(--bg)",
      }}>
        <span style={{ fontWeight: 600, fontSize: 16, color: "var(--t1)" }}>Inicio</span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "32px 28px" }}>
        <div style={{ maxWidth: 620 }}>

          {/* Global error */}
          {error && (
            <p style={{
              fontSize: 12.5, color: "var(--err)", background: "#fef2f2",
              borderRadius: 6, padding: "8px 12px", marginBottom: 16,
            }}>
              {error}
            </p>
          )}

          {allAcademies.length === 0 ? (
            /* ── No academies yet ── */
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--t1)", marginBottom: 6 }}>
                Aún no tienes ninguna academia
              </h2>
              <p style={{ fontSize: 13.5, color: "var(--t2)", marginBottom: 24 }}>
                Crea tu primera academia para empezar a gestionar grupos, alumnos y profesores.
              </p>
              {!showCreate ? (
                <button onClick={() => setShowCreate(true)} style={btnPrimary}>
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
          ) : (
            <>
              {/* ── Active academy ── */}
              {activeAcademy ? (
                <div>
                  {/* Name + edit */}
                  <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 20 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 600, color: "var(--t1)" }}>
                      {activeAcademy.name}
                    </h2>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
                      background: "var(--ok-dim)", color: "var(--ok)",
                    }}>
                      Activa
                    </span>
                    <button
                      onClick={() => { setEditing(true); setEditName(activeAcademy.name); setError(null); }}
                      style={{ fontSize: 12, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 500 }}
                    >
                      Editar nombre
                    </button>
                  </div>

                  {/* Stats */}
                  <div style={{
                    display: "flex", border: "1px solid var(--line)", borderRadius: 10,
                    overflow: "hidden", background: "var(--bg)", marginBottom: 24,
                  }}>
                    <Stat label="Grupos" value={groupCount} />
                    <Stat label="Profesores" value={professorCount} />
                    <div style={{ flex: 1, padding: "16px 20px" }}>
                      <div style={{ fontSize: 22, fontWeight: 600, color: "var(--t1)" }}>{studentCount}</div>
                      <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 2 }}>Alumnos</div>
                    </div>
                  </div>

                  {/* Edit form */}
                  {editing && (
                    <div style={{
                      background: "var(--bg2)", border: "1px solid var(--line)", borderRadius: 10,
                      padding: "20px 24px", marginBottom: 24,
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)", marginBottom: 12 }}>
                        Editar nombre
                      </div>
                      <input
                        autoFocus value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleEdit()}
                        style={{ ...inputStyle, marginBottom: 12 }}
                      />
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={handleEdit} disabled={isPending} style={{ ...btnPrimary, opacity: isPending ? 0.6 : 1 }}>
                          {isPending ? "Guardando…" : "Guardar"}
                        </button>
                        <button onClick={() => { setEditing(false); setError(null); }} style={btnSecondary}>
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Danger zone */}
                  <div style={{ borderTop: "1px solid var(--line)", paddingTop: 20 }}>
                    <div style={{
                      fontSize: 12, fontWeight: 600, color: "var(--t3)",
                      textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8,
                    }}>
                      Zona de peligro
                    </div>
                    <p style={{ fontSize: 13, color: "var(--t2)", marginBottom: 12 }}>
                      Solo es posible eliminar una academia vacía (sin grupos, alumnos ni profesores).
                    </p>
                    {!confirmDelete ? (
                      <button
                        onClick={() => { setConfirmDelete(true); setError(null); }}
                        style={{
                          padding: "8px 14px", borderRadius: 6, fontSize: 13, fontWeight: 500,
                          color: "var(--err)", background: "#fef2f2", border: "1px solid #fecaca", cursor: "pointer",
                        }}
                      >
                        Eliminar academia
                      </button>
                    ) : (
                      <div style={{
                        background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8,
                        padding: "14px 18px", maxWidth: 400,
                      }}>
                        <p style={{ fontSize: 13, color: "var(--err)", fontWeight: 500, marginBottom: 10 }}>
                          ¿Eliminar &quot;{activeAcademy.name}&quot;? Esta acción no se puede deshacer.
                        </p>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            onClick={handleDelete} disabled={isPending}
                            style={{ padding: "8px 14px", borderRadius: 6, fontSize: 13, fontWeight: 500, color: "#fff", background: "var(--err)", border: "none", cursor: "pointer", opacity: isPending ? 0.6 : 1 }}
                          >
                            {isPending ? "Eliminando…" : "Sí, eliminar"}
                          </button>
                          <button onClick={() => { setConfirmDelete(false); setError(null); }} style={btnSecondary}>
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Has academies but none active — shouldn't normally happen */
                <p style={{ fontSize: 13, color: "var(--t2)", marginBottom: 24 }}>
                  Selecciona una academia para activarla.
                </p>
              )}

              {/* ── Other academies ── */}
              {otherAcademies.length > 0 && (
                <div style={{ marginTop: 36, paddingTop: 28, borderTop: "1px solid var(--line)" }}>
                  <div style={{
                    fontSize: 12, fontWeight: 600, color: "var(--t3)",
                    textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14,
                  }}>
                    Otras academias
                  </div>
                  {otherAcademies.map((a) => (
                    <div key={a.id} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "12px 0", borderBottom: "1px solid var(--line)",
                    }}>
                      <span style={{ fontSize: 13.5, fontWeight: 500, color: "var(--t1)" }}>{a.name}</span>
                      <button
                        onClick={() => handleSwitch(a.id)}
                        disabled={isPending}
                        style={{
                          fontSize: 12.5, fontWeight: 500, color: "var(--accent)",
                          background: "var(--accent-light)", border: "1px solid var(--accent-border)",
                          borderRadius: 6, padding: "5px 12px", cursor: "pointer",
                          opacity: isPending && switchingTo === a.id ? 0.6 : 1,
                        }}
                      >
                        {isPending && switchingTo === a.id ? "Activando…" : "Activar"}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Create new academy ── */}
              <div style={{ marginTop: 28 }}>
                {!showCreate ? (
                  <button
                    onClick={() => { setShowCreate(true); setError(null); }}
                    style={{
                      fontSize: 13, color: "var(--accent)", background: "none",
                      border: "1px dashed var(--accent-border)", borderRadius: 8,
                      padding: "9px 18px", cursor: "pointer", width: "100%",
                    }}
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
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateForm({
  value, onChange, onSubmit, onCancel, pending,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  pending: boolean;
}) {
  return (
    <div style={{
      background: "var(--bg2)", border: "1px solid var(--line)", borderRadius: 10,
      padding: "20px 24px",
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)", marginBottom: 12 }}>
        Nueva academia
      </div>
      <input
        autoFocus value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onSubmit()}
        placeholder="Nombre de la academia"
        style={{
          border: "1px solid var(--line)", borderRadius: 6, padding: "8px 11px",
          fontSize: 13, color: "var(--t1)", background: "var(--bg)", outline: "none",
          width: "100%", marginBottom: 12,
        }}
      />
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={onSubmit} disabled={pending || !value.trim()}
          style={{
            padding: "8px 14px", borderRadius: 6, fontSize: 13, fontWeight: 500,
            color: "#fff", background: "var(--accent)", border: "none", cursor: "pointer",
            opacity: pending ? 0.6 : 1,
          }}
        >
          {pending ? "Creando…" : "Crear"}
        </button>
        <button onClick={onCancel} style={{
          padding: "8px 14px", borderRadius: 6, fontSize: 13, color: "var(--t2)",
          background: "transparent", border: "1px solid var(--line)", cursor: "pointer",
        }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
