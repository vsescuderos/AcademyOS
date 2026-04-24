"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

type GroupSchedule = {
  id: string;
  name: string;
  days: string[];
  time_start: string | null;
  time_end: string | null;
};

function groupsConflict(a: GroupSchedule, b: GroupSchedule): boolean {
  const shareDay = a.days.some((d) => b.days.includes(d));
  if (!shareDay) return false;
  if (!a.time_start || !a.time_end || !b.time_start || !b.time_end) return false;
  return a.time_start < b.time_end && b.time_start < a.time_end;
}

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
  return { supabase, profile, userId: user.id };
}

export async function crearGrupo(data: {
  name: string;
  profesor_id: string;
  days: string[];
  time_start: string | null;
  time_end: string | null;
  max_students: number;
}): Promise<{ error?: string; conflictGroupIds?: string[] }> {
  const ctx = await getDirectorCtx();
  if (!ctx) return { error: "Sin permiso" };

  if (data.profesor_id) {
    const [{ data: profGroups }, { data: profProfile }] = await Promise.all([
      ctx.supabase
        .from("groups")
        .select("id, name, days, time_start, time_end")
        .eq("academy_id", ctx.profile.academy_id)
        .eq("profesor_id", data.profesor_id),
      ctx.supabase
        .from("profiles")
        .select("full_name")
        .eq("id", data.profesor_id)
        .single(),
    ]);
    const profName = profProfile?.full_name ?? "El profesor";

    const newGroup: GroupSchedule = { id: "", name: data.name, days: data.days, time_start: data.time_start, time_end: data.time_end };
    for (const g of profGroups ?? []) {
      if (groupsConflict(newGroup, g as unknown as GroupSchedule)) {
        return { error: `${profName} ya tiene "${g.name}" que entra en conflicto de horario.`, conflictGroupIds: [g.id] };
      }
    }
  }

  const { error } = await ctx.supabase.from("groups").insert({
    academy_id: ctx.profile.academy_id,
    name: data.name,
    profesor_id: data.profesor_id || null,
    days: data.days,
    time_start: data.time_start || null,
    time_end: data.time_end || null,
    max_students: data.max_students,
  });

  if (error) {
    if (error.message.includes("groups_academy_id_name_key")) {
      return { error: "Ya existe un grupo con ese nombre." };
    }
    return { error: error.message };
  }
  revalidatePath("/grupos");
  return {};
}

export async function actualizarGrupo(
  groupId: string,
  data: {
    name: string;
    days: string[];
    time_start: string | null;
    time_end: string | null;
    max_students: number;
    profesor_id: string | null;
  }
): Promise<{ error?: string }> {
  const ctx = await getDirectorCtx();
  if (!ctx) return { error: "Sin permiso" };

  if (data.profesor_id) {
    const newSched: GroupSchedule = {
      id: groupId,
      name: data.name,
      days: data.days,
      time_start: data.time_start,
      time_end: data.time_end,
    };
    const { data: profGroups } = await ctx.supabase
      .from("groups")
      .select("id, name, days, time_start, time_end")
      .eq("academy_id", ctx.profile.academy_id)
      .eq("profesor_id", data.profesor_id)
      .neq("id", groupId);

    for (const g of profGroups ?? []) {
      if (groupsConflict(newSched, g as unknown as GroupSchedule)) {
        return { error: `El horario entra en conflicto con "${g.name}".` };
      }
    }
  }

  const { error } = await ctx.supabase
    .from("groups")
    .update({
      name: data.name,
      days: data.days,
      time_start: data.time_start || null,
      time_end: data.time_end || null,
      max_students: data.max_students,
      profesor_id: data.profesor_id || null,
    })
    .eq("id", groupId);

  if (error) {
    if (error.message.includes("groups_academy_id_name_key")) {
      return { error: "Ya existe un grupo con ese nombre." };
    }
    return { error: error.message };
  }
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
): Promise<{ error?: string; conflictGroupIds?: string[] }> {
  const ctx = await getDirectorCtx();
  if (!ctx) return { error: "Sin permiso" };

  if (profesorId) {
    const [{ data: targetGroup }, { data: profProfile }] = await Promise.all([
      ctx.supabase
        .from("groups")
        .select("id, name, days, time_start, time_end")
        .eq("id", groupId)
        .single(),
      ctx.supabase
        .from("profiles")
        .select("full_name")
        .eq("id", profesorId)
        .single(),
    ]);
    const profName = profProfile?.full_name ?? "El profesor";

    if (targetGroup) {
      const { data: profGroups } = await ctx.supabase
        .from("groups")
        .select("id, name, days, time_start, time_end")
        .eq("academy_id", ctx.profile.academy_id)
        .eq("profesor_id", profesorId)
        .neq("id", groupId);

      for (const g of profGroups ?? []) {
        if (groupsConflict(targetGroup as unknown as GroupSchedule, g as unknown as GroupSchedule)) {
          return { error: `${profName} ya tiene "${g.name}" que entra en conflicto de horario.`, conflictGroupIds: [groupId, g.id] };
        }
      }
    }
  }

  const { error } = await ctx.supabase
    .from("groups")
    .update({ profesor_id: profesorId || null })
    .eq("id", groupId);

  if (error) return { error: error.message };
  revalidatePath("/grupos");
  return {};
}

export async function crearGruposBatch(
  grupos: Array<{
    name: string;
    days: string[];
    time_start: string | null;
    time_end: string | null;
  }>
): Promise<{ created: number; errors: string[] }> {
  const ctx = await getDirectorCtx();
  if (!ctx) return { created: 0, errors: ["Sin permiso"] };

  let created = 0;
  const errors: string[] = [];

  for (const g of grupos) {
    const { error } = await ctx.supabase.from("groups").insert({
      academy_id: ctx.profile.academy_id,
      name: g.name,
      profesor_id: null,
      days: g.days,
      time_start: g.time_start || null,
      time_end: g.time_end || null,
    });
    if (error) {
      errors.push(`"${g.name}": ${error.message}`);
    } else {
      created++;
    }
  }

  if (created > 0) revalidatePath("/grupos");
  return { created, errors };
}

export async function crearProfesor(data: {
  full_name: string;
  email: string;
  password: string;
  groupIds?: string[];
}): Promise<{ error?: string }> {
  const ctx = await getDirectorCtx();
  if (!ctx) return { error: "Sin permiso" };

  if (data.groupIds && data.groupIds.length > 0) {
    const { data: groupsToAssign } = await ctx.supabase
      .from("groups")
      .select("id, name, days, time_start, time_end, profesor_id")
      .in("id", data.groupIds)
      .eq("academy_id", ctx.profile.academy_id);

    const taken = (groupsToAssign ?? []).filter((g) => g.profesor_id !== null);
    if (taken.length > 0) {
      const profIds = [...new Set(taken.map((g) => g.profesor_id!))];
      const { data: profs } = await ctx.supabase
        .from("profiles").select("id, full_name").in("id", profIds);
      const profMap = new Map((profs ?? []).map((p) => [p.id, p.full_name]));
      const first = taken[0];
      return { error: `El grupo "${first.name}" ya está asignado al profesor ${profMap.get(first.profesor_id!) ?? "otro profesor"}.` };
    }

    const gs = (groupsToAssign ?? []) as unknown as GroupSchedule[];
    for (let i = 0; i < gs.length; i++) {
      for (let j = i + 1; j < gs.length; j++) {
        if (groupsConflict(gs[i], gs[j])) {
          return { error: `"${gs[i].name}" y "${gs[j].name}" tienen conflicto de horario.` };
        }
      }
    }
  }

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

  if (data.groupIds && data.groupIds.length > 0) {
    await ctx.supabase
      .from("groups")
      .update({ profesor_id: authUser.user.id })
      .in("id", data.groupIds)
      .eq("academy_id", ctx.profile.academy_id);
  }

  revalidatePath("/grupos");
  revalidatePath("/profesores");
  return {};
}

export async function crearProfesoresBatch(
  profesores: Array<{ full_name: string; email: string; password: string; group_name?: string }>
): Promise<{ created: number; errors: string[] }> {
  const ctx = await getDirectorCtx();
  if (!ctx) return { created: 0, errors: ["Sin permiso"] };

  const admin = createAdminClient();
  let created = 0;
  const errors: string[] = [];

  const { data: grupos } = await ctx.supabase
    .from("groups")
    .select("id, name, profesor_id")
    .eq("academy_id", ctx.profile.academy_id);
  const groupByName = new Map(
    (grupos ?? []).map((g) => [g.name.toLowerCase().trim(), g])
  );

  for (const p of profesores) {
    const { data: authUser, error: authError } = await admin.auth.admin.createUser({
      email: p.email,
      password: p.password,
      email_confirm: true,
    });
    if (authError) {
      errors.push(`"${p.full_name}": ${authError.message}`);
      continue;
    }
    const { error: profileError } = await admin.from("profiles").insert({
      id: authUser.user.id,
      academy_id: ctx.profile.academy_id,
      role: "profesor",
      full_name: p.full_name,
      email: p.email,
    });
    if (profileError) {
      await admin.auth.admin.deleteUser(authUser.user.id);
      errors.push(`"${p.full_name}": ${profileError.message}`);
      continue;
    }

    if (p.group_name?.trim()) {
      const group = groupByName.get(p.group_name.toLowerCase().trim());
      if (!group) {
        errors.push(`"${p.full_name}": grupo "${p.group_name}" no encontrado. Profesor creado sin grupo.`);
      } else if (group.profesor_id) {
        errors.push(`"${p.full_name}": el grupo "${group.name}" ya tiene un profesor asignado. Profesor creado sin grupo.`);
      } else {
        const { error: gErr } = await ctx.supabase
          .from("groups")
          .update({ profesor_id: authUser.user.id })
          .eq("id", group.id)
          .eq("academy_id", ctx.profile.academy_id);
        if (gErr) {
          errors.push(`"${p.full_name}": error al asignar grupo. Profesor creado sin grupo.`);
        } else {
          group.profesor_id = authUser.user.id;
        }
      }
    }

    created++;
  }

  if (created > 0) {
    revalidatePath("/profesores");
    revalidatePath("/grupos");
  }
  return { created, errors };
}

export async function asignarGruposAProfesor(
  profesorId: string,
  groupIds: string[]
): Promise<{ error?: string }> {
  const ctx = await getDirectorCtx();
  if (!ctx) return { error: "Sin permiso" };

  const { data: currentGroups } = await ctx.supabase
    .from("groups")
    .select("id, name, days, time_start, time_end")
    .eq("academy_id", ctx.profile.academy_id)
    .eq("profesor_id", profesorId);

  const currentIds = new Set((currentGroups ?? []).map((g) => g.id));
  const newIds = new Set(groupIds);
  const toRemove = [...currentIds].filter((id) => !newIds.has(id));
  const toAdd = [...newIds].filter((id) => !currentIds.has(id));

  if (toAdd.length > 0) {
    const { data: groupsToAdd } = await ctx.supabase
      .from("groups")
      .select("id, name, days, time_start, time_end, profesor_id")
      .in("id", toAdd)
      .eq("academy_id", ctx.profile.academy_id);

    const taken = (groupsToAdd ?? []).filter(
      (g) => g.profesor_id && g.profesor_id !== profesorId
    );
    if (taken.length > 0) {
      const profIds = [...new Set(taken.map((g) => g.profesor_id!))];
      const { data: profs } = await ctx.supabase
        .from("profiles").select("id, full_name").in("id", profIds);
      const profMap = new Map((profs ?? []).map((p) => [p.id, p.full_name]));
      const first = taken[0];
      return { error: `El grupo "${first.name}" ya está asignado al profesor ${profMap.get(first.profesor_id!) ?? "otro profesor"}.` };
    }

    const keptIds = [...currentIds].filter((id) => newIds.has(id));
    const kept = (currentGroups ?? []).filter((g) => keptIds.includes(g.id));
    const allResult = [
      ...(kept as unknown as GroupSchedule[]),
      ...((groupsToAdd ?? []) as unknown as GroupSchedule[]),
    ];
    for (let i = 0; i < allResult.length; i++) {
      for (let j = i + 1; j < allResult.length; j++) {
        if (groupsConflict(allResult[i], allResult[j])) {
          return { error: `"${allResult[i].name}" y "${allResult[j].name}" tienen conflicto de horario.` };
        }
      }
    }
  }

  if (toRemove.length > 0) {
    const { error } = await ctx.supabase
      .from("groups")
      .update({ profesor_id: null })
      .in("id", toRemove)
      .eq("academy_id", ctx.profile.academy_id);
    if (error) return { error: error.message };
  }

  if (toAdd.length > 0) {
    const { error } = await ctx.supabase
      .from("groups")
      .update({ profesor_id: profesorId })
      .in("id", toAdd)
      .eq("academy_id", ctx.profile.academy_id);
    if (error) return { error: error.message };
  }

  revalidatePath("/profesores");
  revalidatePath("/grupos");
  return {};
}

export async function actualizarProfesor(
  profesorId: string,
  data: { full_name: string }
): Promise<{ error?: string }> {
  const ctx = await getDirectorCtx();
  if (!ctx) return { error: "Sin permiso" };

  const { error } = await ctx.supabase
    .from("profiles")
    .update({ full_name: data.full_name.trim() })
    .eq("id", profesorId)
    .eq("academy_id", ctx.profile.academy_id)
    .eq("role", "profesor");

  if (error) return { error: error.message };
  revalidatePath("/profesores");
  revalidatePath("/grupos");
  return {};
}

export async function eliminarProfesor(
  profesorId: string
): Promise<{ error?: string }> {
  const ctx = await getDirectorCtx();
  if (!ctx) return { error: "Sin permiso" };

  const { count } = await ctx.supabase
    .from("groups")
    .select("id", { count: "exact", head: true })
    .eq("academy_id", ctx.profile.academy_id)
    .eq("profesor_id", profesorId);

  if (count && count > 0) {
    return { error: "No se puede eliminar un profesor con grupos asignados." };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(profesorId);
  if (error) return { error: error.message };

  revalidatePath("/profesores");
  revalidatePath("/grupos");
  return {};
}

export async function crearAlumno(data: {
  full_name: string;
  email: string;
  phone: string;
  groupIds?: string[];
}): Promise<{ error?: string }> {
  const ctx = await getDirectorCtx();
  if (!ctx) return { error: "Sin permiso" };

  if (data.groupIds && data.groupIds.length > 1) {
    const { data: selectedGroups } = await ctx.supabase
      .from("groups")
      .select("id, name, days, time_start, time_end")
      .in("id", data.groupIds);

    const gs = (selectedGroups ?? []) as unknown as GroupSchedule[];
    for (let i = 0; i < gs.length; i++) {
      for (let j = i + 1; j < gs.length; j++) {
        if (groupsConflict(gs[i], gs[j])) {
          return {
            error: `"${gs[i].name}" y "${gs[j].name}" tienen conflicto de horario.`,
          };
        }
      }
    }
  }

  const { data: student, error } = await ctx.supabase
    .from("students")
    .insert({
      academy_id: ctx.profile.academy_id,
      full_name: data.full_name,
      email: data.email || null,
      phone: data.phone || null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  if (data.groupIds && data.groupIds.length > 0) {
    const { error: gsError } = await ctx.supabase.from("group_students").insert(
      data.groupIds.map((groupId) => ({
        group_id: groupId,
        student_id: student.id,
        academy_id: ctx.profile.academy_id,
      }))
    );
    if (gsError) return { error: gsError.message };
  }

  revalidatePath("/alumnos");
  revalidatePath("/grupos");
  return {};
}

export async function actualizarAlumnosGrupo(
  groupId: string,
  studentIds: string[]
): Promise<{ error?: string }> {
  const ctx = await getDirectorCtx();
  if (!ctx) return { error: "Sin permiso" };

  const [{ data: current }, { data: groupData }] = await Promise.all([
    ctx.supabase.from("group_students").select("student_id").eq("group_id", groupId),
    ctx.supabase.from("groups").select("max_students").eq("id", groupId).single(),
  ]);

  if (groupData && studentIds.length > groupData.max_students) {
    return {
      error: `El grupo tiene un máximo de ${groupData.max_students} alumnos. Has seleccionado ${studentIds.length}.`,
    };
  }

  const currentIds = new Set((current ?? []).map((r) => r.student_id));
  const newIds = new Set(studentIds);
  const toRemove = [...currentIds].filter((id) => !newIds.has(id));
  const toAdd = [...newIds].filter((id) => !currentIds.has(id));

  if (toAdd.length > 0) {
    const { data: targetGroupData } = await ctx.supabase
      .from("groups")
      .select("id, name, days, time_start, time_end")
      .eq("id", groupId)
      .single();

    if (targetGroupData) {
      const targetGroup = targetGroupData as unknown as GroupSchedule;

      const { data: memberships } = await ctx.supabase
        .from("group_students")
        .select("student_id, group_id")
        .in("student_id", toAdd)
        .neq("group_id", groupId);

      if (memberships && memberships.length > 0) {
        const existingGroupIds = [...new Set(memberships.map((m) => m.group_id))];
        const { data: existingGroupsData } = await ctx.supabase
          .from("groups")
          .select("id, name, days, time_start, time_end")
          .in("id", existingGroupIds);

        const groupMap = new Map(
          (existingGroupsData ?? []).map((g) => [g.id, g as unknown as GroupSchedule])
        );

        const { data: studentNames } = await ctx.supabase
          .from("students")
          .select("id, full_name")
          .in("id", toAdd);
        const nameMap = new Map((studentNames ?? []).map((s) => [s.id, s.full_name]));

        for (const m of memberships) {
          const eg = groupMap.get(m.group_id);
          if (eg && groupsConflict(targetGroup, eg)) {
            const name = nameMap.get(m.student_id) ?? "Un alumno";
            return {
              error: `"${name}" ya está en "${eg.name}" que tiene conflicto de horario con este grupo.`,
            };
          }
        }
      }
    }
  }

  if (toRemove.length > 0) {
    const { data: groupSessions } = await ctx.supabase
      .from("attendance_sessions")
      .select("id")
      .eq("group_id", groupId);

    const sessionIds = (groupSessions ?? []).map((s) => s.id);

    const { data: students } = await ctx.supabase
      .from("students")
      .select("id, full_name")
      .in("id", toRemove);

    const nameMap: Record<string, string> = {};
    for (const s of students ?? []) nameMap[s.id] = s.full_name;

    if (sessionIds.length > 0) {
      const admin = createAdminClient();
      for (const studentId of toRemove) {
        const { count } = await ctx.supabase
          .from("attendance_records")
          .select("id", { count: "exact", head: true })
          .eq("student_id", studentId)
          .in("session_id", sessionIds);

        if (count && count > 0) {
          await admin.from("group_student_audit").insert({
            academy_id: ctx.profile.academy_id,
            group_id: groupId,
            student_id: studentId,
            student_name: nameMap[studentId] ?? "",
            sessions_count: count,
            removed_by: ctx.userId,
          });
        }
      }
    }

    const { error: delError } = await ctx.supabase
      .from("group_students")
      .delete()
      .eq("group_id", groupId)
      .in("student_id", toRemove);

    if (delError) return { error: delError.message };
  }

  if (toAdd.length > 0) {
    const { error: addError } = await ctx.supabase.from("group_students").insert(
      toAdd.map((studentId) => ({
        group_id: groupId,
        student_id: studentId,
        academy_id: ctx.profile.academy_id,
      }))
    );
    if (addError) return { error: addError.message };
  }

  revalidatePath("/grupos");
  return {};
}

export async function editarAlumno(
  studentId: string,
  data: { full_name: string; email: string; phone: string; groupIds: string[] }
): Promise<{ error?: string }> {
  const ctx = await getDirectorCtx();
  if (!ctx) return { error: "Sin permiso" };

  if (data.groupIds.length > 1) {
    const { data: selectedGroups } = await ctx.supabase
      .from("groups")
      .select("id, name, days, time_start, time_end")
      .in("id", data.groupIds);
    const gs = (selectedGroups ?? []) as unknown as GroupSchedule[];
    for (let i = 0; i < gs.length; i++) {
      for (let j = i + 1; j < gs.length; j++) {
        if (groupsConflict(gs[i], gs[j])) {
          return { error: `"${gs[i].name}" y "${gs[j].name}" tienen conflicto de horario.` };
        }
      }
    }
  }

  const { error } = await ctx.supabase
    .from("students")
    .update({ full_name: data.full_name, email: data.email || null, phone: data.phone || null })
    .eq("id", studentId)
    .eq("academy_id", ctx.profile.academy_id);
  if (error) return { error: error.message };

  const { data: current } = await ctx.supabase
    .from("group_students")
    .select("group_id")
    .eq("student_id", studentId);
  const currentGroupIds = new Set((current ?? []).map((r) => r.group_id));
  const newGroupIds = new Set(data.groupIds);
  const toRemove = [...currentGroupIds].filter((id) => !newGroupIds.has(id));
  const toAdd = [...newGroupIds].filter((id) => !currentGroupIds.has(id));

  if (toRemove.length > 0) {
    const admin = createAdminClient();
    for (const groupId of toRemove) {
      const { data: sessions } = await ctx.supabase
        .from("attendance_sessions")
        .select("id")
        .eq("group_id", groupId);
      const sessionIds = (sessions ?? []).map((s) => s.id);
      if (sessionIds.length > 0) {
        const { count } = await ctx.supabase
          .from("attendance_records")
          .select("id", { count: "exact", head: true })
          .eq("student_id", studentId)
          .in("session_id", sessionIds);
        if (count && count > 0) {
          await admin.from("group_student_audit").insert({
            academy_id: ctx.profile.academy_id,
            group_id: groupId,
            student_id: studentId,
            student_name: data.full_name,
            sessions_count: count,
            removed_by: ctx.userId,
          });
        }
      }
    }
    const { error: delError } = await ctx.supabase
      .from("group_students")
      .delete()
      .eq("student_id", studentId)
      .in("group_id", toRemove);
    if (delError) return { error: delError.message };
  }

  if (toAdd.length > 0) {
    const { error: addError } = await ctx.supabase.from("group_students").insert(
      toAdd.map((groupId) => ({
        group_id: groupId,
        student_id: studentId,
        academy_id: ctx.profile.academy_id,
      }))
    );
    if (addError) return { error: addError.message };
  }

  revalidatePath("/alumnos");
  revalidatePath("/grupos");
  return {};
}

export async function eliminarAlumno(studentId: string): Promise<{ error?: string }> {
  const ctx = await getDirectorCtx();
  if (!ctx) return { error: "Sin permiso" };

  const { count: recordsCount } = await ctx.supabase
    .from("attendance_records")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId);
  if (recordsCount && recordsCount > 0) {
    return { error: "No se puede eliminar un alumno con registros de asistencia." };
  }

  const { error } = await ctx.supabase
    .from("students")
    .delete()
    .eq("id", studentId)
    .eq("academy_id", ctx.profile.academy_id);
  if (error) return { error: error.message };
  revalidatePath("/alumnos");
  return {};
}

export async function crearAlumnosBatch(
  alumnos: Array<{ full_name: string; email: string; phone: string; group_name: string }>
): Promise<{ created: number; errors: string[] }> {
  const ctx = await getDirectorCtx();
  if (!ctx) return { created: 0, errors: ["Sin permiso"] };

  const { data: groups } = await ctx.supabase
    .from("groups")
    .select("id, name")
    .eq("academy_id", ctx.profile.academy_id);

  const groupByName = new Map(
    (groups ?? []).map((g) => [g.name.toLowerCase().trim(), g.id])
  );

  let created = 0;
  const errors: string[] = [];

  for (const a of alumnos) {
    const { data: student, error } = await ctx.supabase
      .from("students")
      .insert({
        academy_id: ctx.profile.academy_id,
        full_name: a.full_name,
        email: a.email || null,
        phone: a.phone || null,
      })
      .select("id")
      .single();

    if (error) {
      errors.push(`"${a.full_name}": ${error.message}`);
      continue;
    }

    if (a.group_name) {
      const groupId = groupByName.get(a.group_name.toLowerCase().trim());
      if (groupId) {
        await ctx.supabase.from("group_students").insert({
          group_id: groupId,
          student_id: student.id,
          academy_id: ctx.profile.academy_id,
        });
      } else {
        errors.push(`"${a.full_name}": grupo "${a.group_name}" no encontrado (alumno creado sin grupo).`);
      }
    }

    created++;
  }

  if (created > 0) {
    revalidatePath("/alumnos");
    revalidatePath("/grupos");
  }
  return { created, errors };
}
