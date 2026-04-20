"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

async function getDirectorCtx() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("academy_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "director") return null;
  return { supabase, profile };
}

export async function crearGrupo(data: {
  name: string;
  profesor_id: string;
  days: string[];
  time_start: string | null;
  time_end: string | null;
}): Promise<{ error?: string }> {
  const ctx = await getDirectorCtx();
  if (!ctx) return { error: "Sin permiso" };

  const { error } = await ctx.supabase.from("groups").insert({
    academy_id: ctx.profile.academy_id,
    name: data.name,
    profesor_id: data.profesor_id || null,
    days: data.days,
    time_start: data.time_start || null,
    time_end: data.time_end || null,
  });

  if (error) return { error: error.message };
  revalidatePath("/grupos");
  return {};
}

export async function eliminarGrupo(
  groupId: string
): Promise<{ error?: string }> {
  const ctx = await getDirectorCtx();
  if (!ctx) return { error: "Sin permiso" };

  const { count } = await ctx.supabase
    .from("attendance_sessions")
    .select("id", { count: "exact", head: true })
    .eq("group_id", groupId);

  if (count && count > 0) {
    return {
      error: "No se puede eliminar un grupo con sesiones de asistencia registradas.",
    };
  }

  const { error } = await ctx.supabase
    .from("groups")
    .delete()
    .eq("id", groupId);

  if (error) return { error: error.message };
  revalidatePath("/grupos");
  return {};
}

export async function actualizarProfesorGrupo(
  groupId: string,
  profesorId: string
): Promise<{ error?: string }> {
  const ctx = await getDirectorCtx();
  if (!ctx) return { error: "Sin permiso" };

  const { error } = await ctx.supabase
    .from("groups")
    .update({ profesor_id: profesorId || null })
    .eq("id", groupId);

  if (error) return { error: error.message };
  revalidatePath("/grupos");
  return {};
}

export async function crearProfesor(data: {
  full_name: string;
  email: string;
  password: string;
}): Promise<{ error?: string }> {
  const ctx = await getDirectorCtx();
  if (!ctx) return { error: "Sin permiso" };

  const admin = createAdminClient();

  const { data: authUser, error: authError } =
    await admin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });

  if (authError) return { error: authError.message };

  const { error: profileError } = await admin.from("profiles").insert({
    id: authUser.user.id,
    academy_id: ctx.profile.academy_id,
    role: "profesor",
    full_name: data.full_name,
    email: data.email,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(authUser.user.id);
    return { error: profileError.message };
  }

  revalidatePath("/grupos");
  return {};
}
