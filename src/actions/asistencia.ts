"use server";

import { createClient } from "@/lib/supabase/server";

export async function confirmarAsistencia(
  groupId: string,
  attendance: Record<string, "present" | "absent" | "late">
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("academy_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "profesor") return { error: "Sin permiso" };

  const today = new Date().toISOString().split("T")[0];

  // Get or create session for this group today
  const { data: existing } = await supabase
    .from("attendance_sessions")
    .select("id")
    .eq("group_id", groupId)
    .eq("date", today)
    .maybeSingle();

  let sessionId: string;

  if (existing) {
    sessionId = existing.id;
  } else {
    const { data: session, error } = await supabase
      .from("attendance_sessions")
      .insert({ group_id: groupId, date: today, academy_id: profile.academy_id, created_by: user.id })
      .select("id")
      .single();
    if (error) return { error: error.message };
    sessionId = session.id;
  }

  const records = Object.entries(attendance).map(([studentId, status]) => ({
    session_id: sessionId,
    student_id: studentId,
    academy_id: profile.academy_id,
    status,
  }));

  const { error } = await supabase
    .from("attendance_records")
    .upsert(records, { onConflict: "session_id,student_id" });

  if (error) return { error: error.message };
  return {};
}
