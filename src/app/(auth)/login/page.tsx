import { login } from "@/actions/auth";

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg2)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 360,
          background: "var(--bg)",
          borderRadius: 12,
          padding: "32px 28px",
          border: "1px solid var(--line)",
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            marginBottom: 28,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="white">
              <path d="M12 3L1 9l11 6 9-4.91V17h2V9M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z" />
            </svg>
          </div>
          <span
            style={{ fontWeight: 600, fontSize: 16, color: "var(--t1)", letterSpacing: "-0.01em" }}
          >
            AcademyOS
          </span>
        </div>

        <h1
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: "var(--t1)",
            marginBottom: 20,
          }}
        >
          Iniciar sesión
        </h1>

        <form action={login} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label
              htmlFor="email"
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 500,
                color: "var(--t2)",
                marginBottom: 5,
              }}
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              style={{
                width: "100%",
                border: "1px solid var(--line)",
                borderRadius: 6,
                padding: "8px 11px",
                fontSize: 13,
                color: "var(--t1)",
                background: "var(--bg)",
                outline: "none",
              }}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 500,
                color: "var(--t2)",
                marginBottom: 5,
              }}
            >
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              style={{
                width: "100%",
                border: "1px solid var(--line)",
                borderRadius: 6,
                padding: "8px 11px",
                fontSize: 13,
                color: "var(--t1)",
                background: "var(--bg)",
                outline: "none",
              }}
            />
          </div>

          <MessagesAsync searchParams={searchParams} />

          <button
            type="submit"
            style={{
              marginTop: 4,
              width: "100%",
              padding: "9px",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 500,
              color: "#fff",
              background: "var(--accent)",
              border: "none",
              cursor: "pointer",
            }}
          >
            Entrar
          </button>
        </form>
      </div>
    </main>
  );
}

async function MessagesAsync({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  if (params.error) {
    return (
      <p
        style={{
          background: "#fef2f2",
          borderRadius: 6,
          padding: "8px 12px",
          fontSize: 12.5,
          color: "var(--err)",
        }}
      >
        {params.error}
      </p>
    );
  }
  if (params.message) {
    return (
      <p
        style={{
          background: "var(--ok-dim)",
          borderRadius: 6,
          padding: "8px 12px",
          fontSize: 12.5,
          color: "var(--ok)",
        }}
      >
        {params.message}
      </p>
    );
  }
  return null;
}
