"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  crearGrupo,
  eliminarGrupo,
  actualizarProfesorGrupo,
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
};
type Profesor = { id: string; full_name: string; email: string };

const EMPTY_GROUP = {
  name: "",
  profesor_id: "",
  days: [] as string[],
  time_start: "",
  time_end: "",
};
// ── shared sub-components ──────────────────────────────────────────────────

function Pill({
  children,
  variant = "neutral",
}: {
  children: React.ReactNode;
  variant?: "neutral" | "active" | "green";
}) {
  const styles: Record<string, [string, string]> = {
    neutral: ["#f3f4f6", "#6b7280"],
    active: ["var(--ok-dim)", "var(--ok)"],
    green: ["var(--ok-dim)", "var(--ok)"],
  };
  const [bg, color] = styles[variant] ?? styles.neutral;
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 500,
        padding: "2px 8px",
        borderRadius: 20,
        background: bg,
        color,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function PanelCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
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
      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: "var(--t1)",
          marginBottom: 16,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        style={{
          display: "block",
          fontSize: 11,
          fontWeight: 500,
          color: "var(--t2)",
          marginBottom: 4,
        }}
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

// ── main component ─────────────────────────────────────────────────────────

export default function GruposView({
  groups,
  profesores,
}: {
  groups: Group[];
  profesores: Profesor[];
}) {
  const router = useRouter();
  const [panel, setPanel] = useState<"none" | "grupo" | "excel">("none");
  const [isPending, startTransition] = useTransition();

  const [groupForm, setGroupForm] = useState(EMPTY_GROUP);
  const [groupError, setGroupError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function toggleDay(day: string) {
    setGroupForm((f) => ({
      ...f,
      days: f.days.includes(day)
        ? f.days.filter((d) => d !== day)
        : [...f.days, day],
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

  async function handleChangeProfesor(groupId: string, profesorId: string) {
    await actualizarProfesorGrupo(groupId, profesorId);
    router.refresh();
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
        <span style={{ fontWeight: 600, fontSize: 16, color: "var(--t1)" }}>
          Grupos
        </span>
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
            onClick={() => openPanel("grupo")}
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
            + Nuevo grupo
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {/* Forms */}
        {panel === "excel" && (
          <div style={{ padding: "20px 28px 0" }}>
            <ExcelImportPanel
              onSuccess={() => {
                closePanel();
                router.refresh();
              }}
              onCancel={closePanel}
            />
          </div>
        )}

        {panel === "grupo" && (
          <div style={{ padding: "20px 28px 0" }}>
            <PanelCard title="Nuevo grupo">
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 14,
                  }}
                >
                  <div style={{ gridColumn: "1 / -1" }}>
                    <Field label="Nombre">
                      <input
                        type="text"
                        value={groupForm.name}
                        onChange={(e) =>
                          setGroupForm((f) => ({ ...f, name: e.target.value }))
                        }
                        placeholder="Ej: Avanzado — Lunes y Miércoles"
                        style={inputStyle}
                      />
                    </Field>
                  </div>

                  <div style={{ gridColumn: "1 / -1" }}>
                    <Field label="Días">
                      <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
                        {DAYS.map((d) => (
                          <button
                            key={d.key}
                            type="button"
                            onClick={() => toggleDay(d.key)}
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: "50%",
                              border: "none",
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: "pointer",
                              transition: "all 0.12s",
                              background: groupForm.days.includes(d.key)
                                ? "var(--accent)"
                                : "var(--bg2)",
                              color: groupForm.days.includes(d.key)
                                ? "#fff"
                                : "var(--t2)",
                            }}
                          >
                            {d.short}
                          </button>
                        ))}
                      </div>
                    </Field>
                  </div>

                  <Field label="Hora inicio">
                    <input
                      type="time"
                      value={groupForm.time_start}
                      onChange={(e) =>
                        setGroupForm((f) => ({
                          ...f,
                          time_start: e.target.value,
                        }))
                      }
                      style={inputStyle}
                    />
                  </Field>

                  <Field label="Hora fin">
                    <input
                      type="time"
                      value={groupForm.time_end}
                      onChange={(e) =>
                        setGroupForm((f) => ({
                          ...f,
                          time_end: e.target.value,
                        }))
                      }
                      style={inputStyle}
                    />
                  </Field>

                  <div style={{ gridColumn: "1 / -1" }}>
                    <Field label="Profesor">
                      <select
                        value={groupForm.profesor_id}
                        onChange={(e) =>
                          setGroupForm((f) => ({
                            ...f,
                            profesor_id: e.target.value,
                          }))
                        }
                        style={inputStyle}
                      >
                        <option value="">Sin asignar</option>
                        {profesores.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.full_name}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                </div>

                {groupError && (
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
                    {groupError}
                  </p>
                )}

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    justifyContent: "flex-end",
                    marginTop: 16,
                  }}
                >
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
                    onClick={handleCrearGrupo}
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
                    {isPending ? "Guardando…" : "Crear grupo"}
                  </button>
                </div>
              </PanelCard>
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
        {groups.length === 0 ? (
          <p
            style={{
              padding: "40px 28px",
              color: "var(--t3)",
              fontSize: 13,
            }}
          >
            No hay grupos creados todavía.
          </p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg2)" }}>
                {["Grupo", "Días", "Horario", "Profesor", ""].map((col) => (
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
              {groups.map((group) => (
                <GroupRow
                  key={`${group.id}-${group.profesor_id ?? "none"}`}
                  group={group}
                  profesores={profesores}
                  deleting={deletingId === group.id}
                  onDelete={() => handleEliminar(group.id)}
                  onChangeProfesor={(pid) =>
                    handleChangeProfesor(group.id, pid)
                  }
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function GroupRow({
  group,
  profesores,
  deleting,
  onDelete,
  onChangeProfesor,
}: {
  group: Group;
  profesores: Profesor[];
  deleting: boolean;
  onDelete: () => void;
  onChangeProfesor: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <tr
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "var(--bg2)" : "transparent",
        transition: "background 0.1s",
      }}
    >
      <td
        style={{
          padding: "11px 20px",
          borderBottom: "1px solid var(--line)",
          verticalAlign: "middle",
        }}
      >
        <span style={{ fontWeight: 500, fontSize: 13, color: "var(--t1)" }}>
          {group.name}
        </span>
      </td>

      <td
        style={{
          padding: "11px 20px",
          borderBottom: "1px solid var(--line)",
          verticalAlign: "middle",
        }}
      >
        <div style={{ display: "flex", gap: 3 }}>
          {DAYS.map((d) => (
            <span
              key={d.key}
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                fontSize: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 600,
                background: group.days.includes(d.key)
                  ? "var(--accent-light)"
                  : "var(--bg2)",
                color: group.days.includes(d.key)
                  ? "var(--accent)"
                  : "var(--t3)",
              }}
            >
              {d.short}
            </span>
          ))}
        </div>
      </td>

      <td
        style={{
          padding: "11px 20px",
          borderBottom: "1px solid var(--line)",
          verticalAlign: "middle",
          color: "var(--t3)",
          fontSize: 12,
          whiteSpace: "nowrap",
        }}
      >
        {group.time_start && group.time_end
          ? `${group.time_start.slice(0, 5)} – ${group.time_end.slice(0, 5)}`
          : "—"}
      </td>

      <td
        style={{
          padding: "11px 20px",
          borderBottom: "1px solid var(--line)",
          verticalAlign: "middle",
          minWidth: 160,
        }}
      >
        <select
          defaultValue={group.profesor_id ?? ""}
          onChange={(e) => onChangeProfesor(e.target.value)}
          style={{
            border: "1px solid var(--line)",
            borderRadius: 6,
            padding: "5px 8px",
            fontSize: 12.5,
            color: "var(--t1)",
            background: "var(--bg)",
            outline: "none",
            width: "100%",
          }}
        >
          <option value="">Sin asignar</option>
          {profesores.map((p) => (
            <option key={p.id} value={p.id}>
              {p.full_name}
            </option>
          ))}
        </select>
      </td>

      <td
        style={{
          padding: "11px 20px",
          borderBottom: "1px solid var(--line)",
          verticalAlign: "middle",
          textAlign: "right",
        }}
      >
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
          }}
          title="Eliminar grupo"
        >
          ×
        </button>
      </td>
    </tr>
  );
}
