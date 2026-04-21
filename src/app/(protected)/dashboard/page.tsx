import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "profesor") redirect("/asistencia");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div
        style={{
          height: 54,
          borderBottom: "1px solid var(--line)",
          display: "flex",
          alignItems: "center",
          padding: "0 28px",
          flexShrink: 0,
          background: "var(--bg)",
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 16, color: "var(--t1)" }}>
          Dashboard
        </span>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "32px 28px" }}>
        <h2
          style={{
            fontSize: 20,
            fontWeight: 600,
            color: "var(--t1)",
            marginBottom: 8,
          }}
        >
          Bienvenido a AcademyOS
        </h2>
        <p style={{ color: "var(--t2)", fontSize: 14, marginBottom: 32 }}>
          Gestiona tu academia desde el panel lateral.
        </p>

        <div style={{ display: "flex", gap: 16 }}>
          <a
            href="/grupos"
            style={{
              display: "block",
              padding: "20px 24px",
              background: "var(--bg)",
              border: "1px solid var(--line)",
              borderRadius: 10,
              textDecoration: "none",
              minWidth: 200,
              transition: "border-color 0.12s",
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.borderColor =
                "var(--accent-border)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.borderColor =
                "var(--line)")
            }
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--t3)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 8,
              }}
            >
              Grupos
            </div>
            <div
              style={{
                fontSize: 13,
                color: "var(--accent)",
                fontWeight: 500,
              }}
            >
              Gestionar grupos →
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
