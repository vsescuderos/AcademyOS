"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/actions/auth";
import {
  crearGrupo,
  eliminarGrupo,
  actualizarProfesorGrupo,
  crearProfesor,
} from "@/actions/director";

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

const EMPTY_GROUP_FORM = {
  name: "",
  profesor_id: "",
  days: [] as string[],
  time_start: "",
  time_end: "",
};
const EMPTY_PROFESOR_FORM = { full_name: "", email: "", password: "" };

export default function GruposView({
  groups,
  profesores,
  directorEmail,
}: {
  groups: Group[];
  profesores: Profesor[];
  directorEmail: string;
}) {
  const router = useRouter();
  const [panel, setPanel] = useState<"none" | "grupo" | "profesor">("none");
  const [isPending, startTransition] = useTransition();

  const [groupForm, setGroupForm] = useState(EMPTY_GROUP_FORM);
  const [groupError, setGroupError] = useState<string | null>(null);

  const [profesorForm, setProfesorForm] = useState(EMPTY_PROFESOR_FORM);
  const [profesorError, setProfesorError] = useState<string | null>(null);

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

  function openPanel(p: "grupo" | "profesor") {
    setPanel((prev) => (prev === p ? "none" : p));
    setGroupError(null);
    setProfesorError(null);
  }

  function closePanel() {
    setPanel("none");
    setGroupForm(EMPTY_GROUP_FORM);
    setProfesorForm(EMPTY_PROFESOR_FORM);
    setGroupError(null);
    setProfesorError(null);
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

  function handleCrearProfesor() {
    if (
      !profesorForm.full_name.trim() ||
      !profesorForm.email.trim() ||
      !profesorForm.password
    ) {
      setProfesorError("Todos los campos son obligatorios.");
      return;
    }
    startTransition(async () => {
      const result = await crearProfesor(profesorForm);
      if (result.error) {
        setProfesorError(result.error);
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
    <main className="min-h-screen bg-gray-50">
      <nav className="border-b bg-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h1 className="text-lg font-bold text-gray-900">AcademyOS</h1>
          <a
            href="/dashboard"
            className="text-sm text-gray-500 hover:text-gray-900"
          >
            Dashboard
          </a>
          <span className="text-sm font-medium text-gray-900">Grupos</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{directorEmail}</span>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </nav>

      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Grupos</h2>
          <div className="flex gap-2">
            <button
              onClick={() => openPanel("profesor")}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              + Nuevo profesor
            </button>
            <button
              onClick={() => openPanel("grupo")}
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              + Nuevo grupo
            </button>
          </div>
        </div>

        {/* Create group panel */}
        {panel === "grupo" && (
          <div className="mb-6 bg-white rounded-lg border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Nuevo grupo
            </h3>
            <div className="grid gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Nombre
                </label>
                <input
                  type="text"
                  value={groupForm.name}
                  onChange={(e) =>
                    setGroupForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: Avanzado — Lunes y Miércoles"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Días
                </label>
                <div className="flex gap-2">
                  {DAYS.map((d) => (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => toggleDay(d.key)}
                      className={`w-9 h-9 rounded-full text-xs font-semibold transition-colors ${
                        groupForm.days.includes(d.key)
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {d.short}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Hora inicio
                  </label>
                  <input
                    type="time"
                    value={groupForm.time_start}
                    onChange={(e) =>
                      setGroupForm((f) => ({
                        ...f,
                        time_start: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Hora fin
                  </label>
                  <input
                    type="time"
                    value={groupForm.time_end}
                    onChange={(e) =>
                      setGroupForm((f) => ({
                        ...f,
                        time_end: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Profesor
                </label>
                <select
                  value={groupForm.profesor_id}
                  onChange={(e) =>
                    setGroupForm((f) => ({
                      ...f,
                      profesor_id: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sin asignar</option>
                  {profesores.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name}
                    </option>
                  ))}
                </select>
              </div>

              {groupError && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                  {groupError}
                </p>
              )}

              <div className="flex gap-2 justify-end">
                <button
                  onClick={closePanel}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCrearGrupo}
                  disabled={isPending}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isPending ? "Guardando..." : "Crear grupo"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create profesor panel */}
        {panel === "profesor" && (
          <div className="mb-6 bg-white rounded-lg border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Nuevo profesor
            </h3>
            <div className="grid gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Nombre completo
                </label>
                <input
                  type="text"
                  value={profesorForm.full_name}
                  onChange={(e) =>
                    setProfesorForm((f) => ({
                      ...f,
                      full_name: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ana García"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={profesorForm.email}
                  onChange={(e) =>
                    setProfesorForm((f) => ({ ...f, email: e.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ana@academia.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Contraseña
                </label>
                <input
                  type="password"
                  value={profesorForm.password}
                  onChange={(e) =>
                    setProfesorForm((f) => ({
                      ...f,
                      password: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {profesorError && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                  {profesorError}
                </p>
              )}

              <div className="flex gap-2 justify-end">
                <button
                  onClick={closePanel}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCrearProfesor}
                  disabled={isPending}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isPending ? "Guardando..." : "Crear profesor"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete error */}
        {deleteError && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">
            {deleteError}
          </div>
        )}

        {/* Groups list */}
        {groups.length === 0 ? (
          <p className="text-sm text-gray-500">No hay grupos creados todavía.</p>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="grid grid-cols-[1fr_auto_auto_11rem_2rem] gap-4 px-4 py-2 bg-gray-50 border-b">
              <span className="text-xs font-medium text-gray-500 uppercase">
                Grupo
              </span>
              <span className="text-xs font-medium text-gray-500 uppercase">
                Días
              </span>
              <span className="text-xs font-medium text-gray-500 uppercase">
                Horario
              </span>
              <span className="text-xs font-medium text-gray-500 uppercase">
                Profesor
              </span>
              <span />
            </div>
            {groups.map((group) => (
              <div
                key={`${group.id}-${group.profesor_id ?? "none"}`}
                className="grid grid-cols-[1fr_auto_auto_11rem_2rem] gap-4 items-center px-4 py-3 border-b last:border-0"
              >
                <span className="text-sm font-medium text-gray-900">
                  {group.name}
                </span>

                <div className="flex gap-1">
                  {DAYS.map((d) => (
                    <span
                      key={d.key}
                      className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-semibold ${
                        group.days.includes(d.key)
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-300"
                      }`}
                    >
                      {d.short}
                    </span>
                  ))}
                </div>

                <span className="text-sm text-gray-600 whitespace-nowrap">
                  {group.time_start && group.time_end
                    ? `${group.time_start.slice(0, 5)} – ${group.time_end.slice(0, 5)}`
                    : "—"}
                </span>

                <select
                  defaultValue={group.profesor_id ?? ""}
                  onChange={(e) =>
                    handleChangeProfesor(group.id, e.target.value)
                  }
                  className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sin asignar</option>
                  {profesores.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => handleEliminar(group.id)}
                  disabled={deletingId === group.id}
                  className="text-gray-400 hover:text-red-500 disabled:opacity-30 text-xl leading-none"
                  title="Eliminar grupo"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
