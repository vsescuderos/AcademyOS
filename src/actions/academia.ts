"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

async function getDirectorUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, academy_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "director") return null;
  return { supabase, userId: user.id, profile };
}

export async function crearAcademia(
  name: string
): Promise<{ error?: string }> {
  const ctx = await getDirectorUser();
  if (!ctx) return { error: "Sin permiso" };

  const admin = createAdminClient();

  const { data: academy, error: acadError } = await admin
    .from("academies")
    .insert({ name })
    .select("id")
    .single();

  if (acadError) return { error: acadError.message };

  const { error: linkError } = await admin
    .from("director_academies")
    .insert({ director_id: ctx.userId, academy_id: academy.id });

  if (linkError) {
    await admin.from("academies").delete().eq("id", academy.id);
    return { error: linkError.message };
  }

  // If director has no active academy yet, set this as active
  if (!ctx.profile.academy_id) {
    await admin
      .from("profiles")
      .update({ academy_id: academy.id })
      .eq("id", ctx.userId);
  }

  revalidatePath("/dashboard");
  return {};
}

export async function actualizarAcademia(
  params: { name: string; phone?: string | null }
): Promise<{ error?: string }> {
  const ctx = await getDirectorUser();
  if (!ctx || !ctx.profile.academy_id) return { error: "Sin permiso" };

  const update: { name: string; phone?: string | null } = { name: params.name };
  if ("phone" in params) update.phone = params.phone ?? null;

  const { error } = await ctx.supabase
    .from("academies")
    .update(update)
    .eq("id", ctx.profile.academy_id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/configuracion");
  return {};
}

export async function cambiarAcademia(
  academyId: string
): Promise<{ error?: string }> {
  const ctx = await getDirectorUser();
  if (!ctx) return { error: "Sin permiso" };

  // Verify the director owns this academy
  const { data: link } = await ctx.supabase
    .from("director_academies")
    .select("academy_id")
    .eq("director_id", ctx.userId)
    .eq("academy_id", academyId)
    .single();

  if (!link) return { error: "Sin acceso a esta academia" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ academy_id: academyId })
    .eq("id", ctx.userId);

  if (error) return { error: error.message };

  // Revalidate pages that depend on active academy
  revalidatePath("/dashboard");
  revalidatePath("/grupos");
  return {};
}

export async function eliminarAcademia(): Promise<{ error?: string }> {
  const ctx = await getDirectorUser();
  if (!ctx || !ctx.profile.academy_id) return { error: "Sin permiso" };

  const academyId = ctx.profile.academy_id;

  const [{ count: groupCount }, { count: studentCount }, { count: profCount }] =
    await Promise.all([
      ctx.supabase
        .from("groups")
        .select("id", { count: "exact", head: true })
        .eq("academy_id", academyId),
      ctx.supabase
        .from("students")
        .select("id", { count: "exact", head: true })
        .eq("academy_id", academyId),
      ctx.supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("academy_id", academyId)
        .eq("role", "profesor"),
    ]);

  if (groupCount && groupCount > 0)
    return { error: "Elimina todos los grupos antes de borrar la academia." };
  if (studentCount && studentCount > 0)
    return { error: "Elimina todos los alumnos antes de borrar la academia." };
  if (profCount && profCount > 0)
    return { error: "Elimina todos los profesores antes de borrar la academia." };

  const admin = createAdminClient();

  // Find another academy to switch to after deletion
  const { data: nextLinks } = await admin
    .from("director_academies")
    .select("academy_id")
    .eq("director_id", ctx.userId)
    .neq("academy_id", academyId)
    .limit(1);

  const nextAcademyId = nextLinks?.[0]?.academy_id ?? null;

  const { error: profileError } = await admin
    .from("profiles")
    .update({ academy_id: nextAcademyId })
    .eq("id", ctx.userId);

  if (profileError) return { error: profileError.message };

  // Deleting the academy cascades director_academies via FK
  const { error: deleteError } = await admin
    .from("academies")
    .delete()
    .eq("id", academyId);

  if (deleteError) {
    await admin
      .from("profiles")
      .update({ academy_id: academyId })
      .eq("id", ctx.userId);
    return { error: deleteError.message };
  }

  revalidatePath("/dashboard");
  return {};
}
