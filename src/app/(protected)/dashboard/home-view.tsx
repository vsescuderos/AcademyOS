"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  crearAcademia,
  actualizarAcademia,
  eliminarAcademia,
  cambiarAcademia,
} from "@/actions/academia";
import InformeAsistencia from "./informe-asistencia";

interface Academy { id: string; name: string; created_at: string }
interface TodayGroup {
  id: string; name: string;
  time_start: string | null; time_end: string | null;
  profiles: { full_name: string } | null;
}
interface AbsentLateStudent { student_id: string; status: "absent" | "late"; full_name: string }

interface Props {
  activeAcademy: Academy | null;
  allAcademies: Academy[];
  groupCount: number;
  professorCount: number;
  studentCount: number;
  todayGroups: TodayGroup[];
  absentLate: AbsentLateStudent[];
  userName: string;
  allGroups: { id: string; name: string }[];
}

function formatTime(t: string | null): string {
  return t ? t.slice(0, 5) : "";
}

const inputStyle: React.CSSProperties = {
  border: "1px solid var(--line)", borderRadius: 6, padding: "8px 11px",
  fontSize: 13, color: "var(--t1)", background: "var(--bg)", outline: "none", width: "100%",
};
const btnPrimary: React.CSSProperties = {
  padding: "8px 14px", borderRadius: 6, fontSize: 13, fontWeight: 500,
  color: "#fff", background: "var(--accent)", border: "none", cursor: "pointer",
};
const btnSecondary: React.CSSProperties = {
  padding: "8px 14px", borderRadius: 6, fontSize: 13, color: "var(--t2)",
  background: "transparent", border: "1px solid var(--line)", cursor: "pointer",
};

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 14px", border: "1px solid var(--line)", borderRadius: 20, fontSize: 12.5 }}>
      <span style={{ color: "var(--t3)" }}>{label}:</span>
      <span style={{ fontWeight: 600, color: "var(--t1)" }}>{value}</span>
    </div>
  );
}

function PanelSectionHeader({ title }: { title: string }) {
  return (
    <div style={{ padding: "14px 20px 10px", borderBottom: "1px solid var(--line)" }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)" }}>{title}</span>
    </div>
  );
}

export default function HomeView({
  activeAcademy, allAcademies, groupCount, professorCount, studentCount,
  todayGroups, absentLate, userName, allGroups,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [showConfig, setShowConfig] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(activeAcademy?.name ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [switchingTo, setSwitchingTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showInformesMenu, setShowInformesMenu] = useState(false);
  const [showInformeAsistencia, setShowInformeAsistencia] = useState(false);

  const otherAcademies = allAcademies.filter(a => a.id !== activeAcademy?.id);
  const firstName = userName?.split(" ")[0] || "Director";

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
    run(() => crearAcademia(createName.trim()), () => { setShowCreate(false); setCreateName(""); });
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

  // ── No academies yet ───────────────────────────────────────────────────────
  if (allAcademies.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{ height: 54, borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", padding: "0 28px", flexShrink: 0, background: "var(--bg)" }}>
          <span style={{ fontWeight: 600, fontSize: 16, color: "var(--t1)" }}>Inicio</span>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "32px 28px" }}>
          {error && <p style={{ fontSize: 12.5, color: "var(--err)", background: "#fef2f2", borderRadius: 6, padding: "8px 12px", marginBottom: 16 }}>{error}</p>}
          <div style={{ maxWidth: 480 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--t1)", marginBottom: 8 }}>Aún no tienes ninguna academia</h2>
            <p style={{ fontSize: 13.5, color: "var(--t2)", marginBottom: 24 }}>Crea tu primera academia para empezar a gestionar grupos, alumnos y profesores.</p>
            {!showCreate
              ? <button onClick={() => setShowCreate(true)} style={btnPrimary}>+ Crear academia</button>
              : <CreateForm value={createName} onChange={setCreateName} onSubmit={handleCreate} onCancel={() => { setShowCreate(false); setCreateName(""); setError(null); }} pending={isPending} />
            }
          </div>
        </div>
      </div>
    );
  }

  // ── Dashboard ──────────────────────────────────────────────────────────────
  const todayLabel = new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Topbar */}
      <div style={{
        height: 54, borderBottom: "1px solid var(--line)", display: "flex",
        alignItems: "center", padding: "0 28px", justifyContent: "space-between",
        flexShrink: 0, background: "var(--bg)",
      }}>
        <span style={{ fontWeight: 600, fontSize: 16, color: "var(--t1)" }}>
          ¡Hola, {firstName}!
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowInformesMenu(v => !v)}
              style={{ ...btnSecondary, display: "flex", alignItems: "center", gap: 5 }}
            >
              Informes <span style={{ fontSize: 10 }}>▾</span>
            </button>
            {showInformesMenu && (
              <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.10)", minWidth: 200, zIndex: 100 }}
                onClick={() => setShowInformesMenu(false)}>
                <button
                  onClick={() => setShowInformeAsistencia(true)}
                  style={{ width: "100%", textAlign: "left", padding: "10px 16px", fontSize: 13, color: "var(--t1)", background: "none", border: "none", cursor: "pointer", borderRadius: 8 }}
                >
                  Informe de asistencia
                </button>
              </div>
            )}
          </div>
          <StatPill label="Grupos" value={groupCount} />
          <StatPill label="Profesores" value={professorCount} />
          <StatPill label="Alumnos" value={studentCount} />
        </div>
      </div>
      {showInformeAsistencia && (
        <InformeAsistencia groups={allGroups} onClose={() => setShowInformeAsistencia(false)} />
      )}

      {/* Content */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 280px", overflow: "hidden" }}>

        {/* Left column — schedule + config */}
        <div style={{ borderRight: "1px solid var(--line)", overflowY: "auto", padding: "20px 28px" }}>
          {error && (
            <p style={{ fontSize: 12.5, color: "var(--err)", background: "#fef2f2", borderRadius: 6, padding: "8px 12px", marginBottom: 16 }}>
              {error}
            </p>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
            <span suppressHydrationWarning style={{ fontSize: 15, fontWeight: 600, color: "var(--t1)" }}>
              Grupos de hoy — {todayLabel}
            </span>
          </div>

          {todayGroups.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--t3)", marginBottom: 24 }}>No hay grupos programados para hoy.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
              {todayGroups.map(g => {
                const timeStr = [
                  g.time_start ? formatTime(g.time_start) : null,
                  g.time_end ? formatTime(g.time_end) : null,
                ].filter(Boolean).join(" – ");
                const meta = [timeStr, g.profiles?.full_name].filter(Boolean).join(" · ");
                return (
                  <div key={g.id} style={{
                    border: "1px solid var(--line)", borderLeft: "3px solid var(--accent)",
                    borderRadius: 6, padding: "12px 16px", background: "var(--bg)",
                  }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5, color: "var(--t1)" }}>{g.name}</div>
                    {meta && <div style={{ fontSize: 12, color: "var(--accent)", marginTop: 4 }}>{meta}</div>}
                  </div>
                );
              })}
            </div>
          )}

          {/* Academy config — collapsible */}
          <div style={{ borderTop: "1px solid var(--line)", paddingTop: 20 }}>
            <button
              onClick={() => setShowConfig(v => !v)}
              style={{ fontSize: 12.5, color: "var(--t3)", background: "none", border: "none", cursor: "pointer", fontWeight: 500, padding: 0, display: "flex", alignItems: "center", gap: 6 }}
            >
              <span>{showConfig ? "▲" : "▶"}</span>
              Configuración de academia
            </button>

            {showConfig && activeAcademy && (
              <div style={{ marginTop: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--t1)" }}>{activeAcademy.name}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: "var(--ok-dim)", color: "var(--ok)" }}>Activa</span>
                  <button
                    onClick={() => { setEditing(true); setEditName(activeAcademy.name); setError(null); }}
                    style={{ fontSize: 12, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}
                  >
                    Editar nombre
                  </button>
                </div>

                {editing && (
                  <div style={{ background: "var(--bg2)", border: "1px solid var(--line)", borderRadius: 10, padding: "16px 20px", marginBottom: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)", marginBottom: 10 }}>Editar nombre</div>
                    <input autoFocus value={editName} onChange={e => setEditName(e.target.value)} onKeyDown={e => e.key === "Enter" && handleEdit()} style={{ ...inputStyle, marginBottom: 10 }} />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={handleEdit} disabled={isPending} style={{ ...btnPrimary, opacity: isPending ? 0.6 : 1 }}>{isPending ? "Guardando…" : "Guardar"}</button>
                      <button onClick={() => { setEditing(false); setError(null); }} style={btnSecondary}>Cancelar</button>
                    </div>
                  </div>
                )}

                {otherAcademies.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Otras academias</div>
                    {otherAcademies.map(a => (
                      <div key={a.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--t1)" }}>{a.name}</span>
                        <button
                          onClick={() => handleSwitch(a.id)} disabled={isPending}
                          style={{ fontSize: 12, fontWeight: 500, color: "var(--accent)", background: "var(--accent-light)", border: "1px solid var(--accent-border)", borderRadius: 6, padding: "4px 10px", cursor: "pointer", opacity: isPending && switchingTo === a.id ? 0.6 : 1 }}
                        >
                          {isPending && switchingTo === a.id ? "Activando…" : "Activar"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ marginBottom: 16 }}>
                  {!showCreate ? (
                    <button onClick={() => { setShowCreate(true); setError(null); }} style={{ fontSize: 12.5, color: "var(--accent)", background: "none", border: "1px dashed var(--accent-border)", borderRadius: 7, padding: "7px 14px", cursor: "pointer", width: "100%" }}>
                      + Nueva academia
                    </button>
                  ) : (
                    <CreateForm value={createName} onChange={setCreateName} onSubmit={handleCreate} onCancel={() => { setShowCreate(false); setCreateName(""); setError(null); }} pending={isPending} />
                  )}
                </div>

                <div style={{ borderTop: "1px solid var(--line)", paddingTop: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Zona de peligro</div>
                  <p style={{ fontSize: 12.5, color: "var(--t2)", marginBottom: 10 }}>Solo es posible eliminar una academia vacía (sin grupos, alumnos ni profesores).</p>
                  {!confirmDelete ? (
                    <button onClick={() => { setConfirmDelete(true); setError(null); }} style={{ padding: "7px 12px", borderRadius: 6, fontSize: 12.5, fontWeight: 500, color: "var(--err)", background: "#fef2f2", border: "1px solid #fecaca", cursor: "pointer" }}>
                      Eliminar academia
                    </button>
                  ) : (
                    <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "12px 16px" }}>
                      <p style={{ fontSize: 12.5, color: "var(--err)", fontWeight: 500, marginBottom: 10 }}>¿Eliminar &quot;{activeAcademy.name}&quot;? Esta acción no se puede deshacer.</p>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={handleDelete} disabled={isPending} style={{ padding: "7px 12px", borderRadius: 6, fontSize: 12.5, fontWeight: 500, color: "#fff", background: "var(--err)", border: "none", cursor: "pointer", opacity: isPending ? 0.6 : 1 }}>
                          {isPending ? "Eliminando…" : "Sí, eliminar"}
                        </button>
                        <button onClick={() => { setConfirmDelete(false); setError(null); }} style={btnSecondary}>Cancelar</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div style={{ overflowY: "auto" }}>
          <PanelSectionHeader title="Asistencia hoy" />
          {absentLate.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--ok)", padding: "14px 20px", fontWeight: 500 }}>
              El 100% de los alumnos está en clase!
            </p>
          ) : (
            absentLate.map(s => (
              <div key={`${s.student_id}-${s.status}`} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 20px", borderBottom: "1px solid var(--line)",
              }}>
                <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--t1)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, marginRight: 10 }}>
                  {s.full_name}
                </span>
                <span style={{
                  fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 20, whiteSpace: "nowrap", flexShrink: 0,
                  background: s.status === "absent" ? "#fef2f2" : "var(--warn-dim)",
                  color: s.status === "absent" ? "var(--err)" : "var(--warn)",
                }}>
                  {s.status === "absent" ? "Ausente" : "Tarde"}
                </span>
              </div>
            ))
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
        autoFocus value={value}
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
