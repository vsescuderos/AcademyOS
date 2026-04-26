"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { actualizarAcademia } from "@/actions/academia";

interface Props {
  academy: { id: string; name: string; phone: string | null };
}

const inputStyle: React.CSSProperties = {
  border: "1px solid var(--line)", borderRadius: 6, padding: "8px 11px",
  fontSize: 13, color: "var(--t1)", background: "var(--bg)", outline: "none", width: "100%",
};
const label: React.CSSProperties = {
  fontSize: 12.5, fontWeight: 600, color: "var(--t2)", marginBottom: 5, display: "block",
};

export default function ConfiguracionView({ academy }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(academy.name);
  const [phone, setPhone] = useState(academy.phone ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    if (!name.trim()) return;
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await actualizarAcademia({ name: name.trim(), phone: phone.trim() || null });
      if (res.error) { setError(res.error); return; }
      setSaved(true);
      router.refresh();
    });
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
        <div style={{ maxWidth: 480 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--t1)", marginBottom: 20 }}>
            Datos de la academia
          </h2>

          {error && (
            <p style={{ fontSize: 12.5, color: "var(--err)", background: "#fef2f2", borderRadius: 6, padding: "8px 12px", marginBottom: 16 }}>
              {error}
            </p>
          )}
          {saved && !error && (
            <p style={{ fontSize: 12.5, color: "var(--ok)", background: "var(--ok-dim)", borderRadius: 6, padding: "8px 12px", marginBottom: 16 }}>
              Cambios guardados correctamente.
            </p>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={label}>Nombre de la academia</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSave()}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={label}>Teléfono de contacto</label>
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSave()}
                placeholder="Ej. 600 000 000"
                style={inputStyle}
              />
              <span style={{ fontSize: 11.5, color: "var(--t3)", marginTop: 4, display: "block" }}>
                Aparecerá en los recibos de cobro.
              </span>
            </div>
          </div>

          <div style={{ marginTop: 24 }}>
            <button
              onClick={handleSave}
              disabled={isPending || !name.trim()}
              style={{
                padding: "8px 18px", borderRadius: 6, fontSize: 13, fontWeight: 500,
                color: "#fff", background: "var(--accent)", border: "none", cursor: "pointer",
                opacity: isPending || !name.trim() ? 0.6 : 1,
              }}
            >
              {isPending ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
