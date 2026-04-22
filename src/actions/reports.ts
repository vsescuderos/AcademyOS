"use server";

import { createClient } from "@/lib/supabase/server";

type RawRecord = {
  student_id: string;
  status: "present" | "absent" | "late";
  students: { full_name: string } | { full_name: string }[] | null;
};

type RawSession = {
  id: string;
  group_id: string;
  date: string;
  groups: { name: string } | { name: string }[] | null;
  attendance_records: RawRecord[];
};

export type ReportRecord = {
  student_id: string;
  student_name: string;
  status: "present" | "absent" | "late";
};

export type ReportSession = {
  session_id: string;
  group_id: string;
  group_name: string;
  date: string;
  records: ReportRecord[];
};

export type AttendanceReportData = {
  sessions: ReportSession[];
  generatedAt: string;
};

async function getDirectorCtx() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("academy_id, role")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role !== "director" || !profile.academy_id) return null;
  return { supabase, academyId: profile.academy_id as string };
}

export async function fetchAttendanceReportData(input: {
  startDate: string;
  endDate: string;
  groupIds: string[] | null;
}): Promise<{ error?: string; data?: AttendanceReportData }> {
  const ctx = await getDirectorCtx();
  if (!ctx) return { error: "Sin permiso" };

  let query = ctx.supabase
    .from("attendance_sessions")
    .select(`
      id,
      group_id,
      date,
      groups(name),
      attendance_records(student_id, status, students(full_name))
    `)
    .eq("academy_id", ctx.academyId)
    .gte("date", input.startDate)
    .lte("date", input.endDate)
    .order("date");

  if (input.groupIds && input.groupIds.length > 0) {
    query = query.in("group_id", input.groupIds);
  }

  const { data, error } = await query;
  if (error) return { error: error.message };

  const sessions: ReportSession[] = ((data ?? []) as unknown as RawSession[]).map(s => ({
    session_id: s.id,
    group_id: s.group_id,
    group_name: (Array.isArray(s.groups) ? s.groups[0]?.name : s.groups?.name) ?? "Grupo desconocido",
    date: s.date,
    records: s.attendance_records.map(r => ({
      student_id: r.student_id,
      student_name: (Array.isArray(r.students) ? r.students[0]?.full_name : r.students?.full_name) ?? "Alumno desconocido",
      status: r.status,
    })),
  }));

  return { data: { sessions, generatedAt: new Date().toISOString() } };
}
