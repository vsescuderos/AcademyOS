"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { logout } from "@/actions/auth";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function SidebarLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + "/");
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      href={href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        padding: "8px 10px",
        borderRadius: 6,
        textDecoration: "none",
        background: isActive
          ? "var(--sidebar-active)"
          : hovered
            ? "var(--sidebar-hover)"
            : "transparent",
        color: isActive || hovered ? "#ffffff" : "rgba(255,255,255,0.65)",
        fontWeight: isActive ? 500 : 400,
        fontSize: 13.5,
        transition: "all 0.12s",
      }}
    >
      {label}
    </Link>
  );
}

function UserButton({
  userName,
  userEmail,
  role,
}: {
  userName: string;
  userEmail: string;
  role: string;
}) {
  const [hovered, setHovered] = useState(false);
  const display = userName || userEmail.split("@")[0];

  return (
    <form action={logout}>
      <button
        type="submit"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          padding: "8px 10px",
          borderRadius: 6,
          cursor: "pointer",
          width: "100%",
          border: "none",
          textAlign: "left",
          background: hovered ? "var(--sidebar-hover)" : "transparent",
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <span style={{ color: "#fff", fontSize: 11, fontWeight: 600 }}>
            {initials(display)}
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              color: "rgba(255,255,255,0.9)",
              fontSize: 12.5,
              fontWeight: 500,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {display}
          </div>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>
            {role === "director" ? "Director" : "Profesor"}
          </div>
        </div>
      </button>
    </form>
  );
}

export default function Sidebar({
  role,
  userEmail,
  userName,
}: {
  role: string;
  userEmail: string;
  userName: string;
}) {
  const directorNav = [
    { href: "/dashboard", label: "Inicio" },
    { href: "/grupos", label: "Grupos" },
    { href: "/profesores", label: "Profesores" },
    { href: "/alumnos", label: "Alumnos" },
    { href: "/asistencia", label: "Asistencia" },
    { href: "/cobros", label: "Cobros" },
  ];
  const profesorNav = [
    { href: "/asistencia", label: "Asistencia" },
    { href: "/cobros", label: "Cobros" },
  ];
  const navItems = role === "profesor" ? profesorNav : directorNav;

  return (
    <aside
      style={{
        width: "var(--sw)",
        flexShrink: 0,
        height: "100vh",
        position: "sticky",
        top: 0,
        background: "var(--sidebar)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Logo */}
      <div style={{ padding: "16px 14px 14px" }}>
        <div style={{ background: "#ffffff", borderRadius: 8, padding: "0 16px", height: 52, overflow: "hidden", display: "flex", alignItems: "center" }}>
          <Image
            src="/logo.png"
            alt="AcademyOS"
            width={1335}
            height={669}
            style={{ display: "block", width: "100%", height: "auto", flexShrink: 0 }}
            priority
          />
        </div>
      </div>

      {/* Nav */}
      <nav
        style={{
          flex: 1,
          padding: "4px 10px",
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: "rgba(255,255,255,0.35)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            padding: "10px 10px 6px",
          }}
        >
          Gestión
        </div>
        {navItems.map((item) => (
          <SidebarLink key={item.href} href={item.href} label={item.label} />
        ))}
      </nav>

      {/* Bottom: Configuración (director only) + User */}
      <div style={{ padding: "8px 10px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        {role === "director" && (
          <SidebarLink href="/configuracion" label="Configuración" />
        )}
        <div style={{ marginTop: 4 }}>
          <UserButton userName={userName} userEmail={userEmail} role={role} />
        </div>
      </div>
    </aside>
  );
}
