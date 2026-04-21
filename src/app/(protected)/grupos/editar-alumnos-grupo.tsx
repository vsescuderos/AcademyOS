"use client";

import { useState, useEffect, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { actualizarAlumnosGrupo } from "@/actions/director";

type Student = { id: string; full_name: string };

export default function EditarAlumnosGrupo({
  groupId,
  groupName,
  allStudents,
  onClose,
  onSaved,
}: {
  groupId: string;
  groupName: string;
  allStudents: Student[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    supabase
      .from("group_students")
      .select("student_id")
      .eq("group_id", groupId)
      .then(({ data }) => {
        setSelected(new Set((data ?? []).map((r) => r.student_id)));
        setLoading(false);
      });
  }, [groupId]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await actualizarAlumnosGrupo(groupId, [...selected]);
      if (result.error) {
        setError(result.error);
      } else {
        onSaved();
      }
    });
  }

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
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--t1)", marginBottom: 4 }}>
        Alumnos del grupo
      </div>
      <div style={{ fontSize: 12.5, color: "var(--t3)", marginBottom: 16 }}>
        {groupName}
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: "var(--t3)" }}>Cargando…</p>
      ) : allStudents.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--t3)" }}>
          No hay alumnos creados todavía. Crea alumnos en la sección Alumnos.
        </p>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            maxHeight: 300,
            overflowY: "auto",
            marginBottom: 16,
            border: "1px solid var(--line)",
            borderRadius: 6,
            padding: "4px 0",
          }}
        >
          {allStudents.map((s) => (
            <label
              key={s.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 14px",
                cursor: "pointer",
                fontSize: 13,
                color: "var(--t1)",
              }}
            >
              <input
                type="checkbox"
                checked={selected.has(s.id)}
                onChange={() => toggle(s.id)}
                style={{ width: 15, height: 15, accentColor: "var(--accent)", cursor: "pointer" }}
              />
              {s.full_name}
            </label>
          ))}
        </div>
      )}

      {error && (
        <p
          style={{
            marginBottom: 12,
            fontSize: 12.5,
            color: "var(--err)",
            background: "#fef2f2",
            borderRadius: 6,
            padding: "8px 12px",
          }}
        >
          {error}
        </p>
      )}

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button
          onClick={onClose}
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
          onClick={handleSave}
          disabled={isPending || loading}
          style={{
            fontSize: 12.5,
            fontWeight: 500,
            color: "#fff",
            border: "none",
            borderRadius: 6,
            padding: "6px 16px",
            background: "var(--accent)",
            cursor: "pointer",
            opacity: isPending || loading ? 0.6 : 1,
          }}
        >
          {isPending ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </div>
  );
}
