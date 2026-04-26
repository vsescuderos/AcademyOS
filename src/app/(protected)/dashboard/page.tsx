import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import HomeView from "./home-view";
import { DAY_KEYS } from "@/lib/constants";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, academy_id, full_name")
    .eq("id", user.id)
    .single();

  if (profile?.role === "profesor") redirect("/asistencia");
  if (!profile || profile.role !== "director") redirect("/login");

  const activeAcademyId = profile.academy_id as string | null;

  let groupCount = 0;
  let professorCount = 0;
  let studentCount = 0;
  let todayGroups: { id: string; name: string; time_start: string | null; time_end: string | null; profiles: { full_name: string } | null }[] = [];
  let absentLate: { student_id: string; status: "absent" | "late"; full_name: string }[] = [];
  let allGroups: { id: string; name: string }[] = [];

  if (activeAcademyId) {
    const todayKey = DAY_KEYS[new Date().getDay()];
    const todayStr = new Date().toISOString().slice(0, 10);

    const [groupRes, profRes, studentRes, todayGroupsRes, todaySessionsRes, allGroupsRes] = await Promise.all([
      supabase
        .from("groups")
        .select("id", { count: "exact", head: true })
        .eq("academy_id", activeAcademyId),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("academy_id", activeAcademyId)
        .eq("role", "profesor"),
      supabase
        .from("students")
        .select("id", { count: "exact", head: true })
        .eq("academy_id", activeAcademyId),
      supabase
        .from("groups")
        .select("id, name, time_start, time_end, profiles(full_name)")
        .eq("academy_id", activeAcademyId)
        .contains("days", [todayKey])
        .order("time_start"),
      supabase
        .from("attendance_sessions")
        .select("id")
        .eq("academy_id", activeAcademyId)
        .eq("date", todayStr),
      supabase
        .from("groups")
        .select("id, name")
        .eq("academy_id", activeAcademyId)
        .order("name"),
    ]);
    allGroups = allGroupsRes.data ?? [];
    groupCount = groupRes.count ?? 0;
    professorCount = profRes.count ?? 0;
    studentCount = studentRes.count ?? 0;
    todayGroups = ((todayGroupsRes.data ?? []) as unknown as Array<{
      id: string; name: string; time_start: string | null; time_end: string | null;
      profiles: { full_name: string }[] | { full_name: string } | null;
    }>).map(g => ({
      ...g,
      profiles: Array.isArray(g.profiles) ? (g.profiles[0] ?? null) : g.profiles,
    }));

    const sessionIds = (todaySessionsRes.data ?? []).map(s => s.id);
    if (sessionIds.length > 0) {
      const { data: records } = await supabase
        .from("attendance_records")
        .select("student_id, status, students(full_name)")
        .in("session_id", sessionIds)
        .in("status", ["absent", "late"]);

      absentLate = ((records ?? []) as unknown as Array<{
        student_id: string; status: string; students: { full_name: string }[] | { full_name: string } | null;
      }>)
        .map(r => ({
          student_id: r.student_id,
          status: r.status as "absent" | "late",
          full_name: (Array.isArray(r.students) ? r.students[0]?.full_name : r.students?.full_name) ?? "",
        }))
        .sort((a, b) => {
          if (a.status !== b.status) return a.status === "absent" ? -1 : 1;
          return a.full_name.localeCompare(b.full_name);
        });
    }
  }

  return (
    <HomeView
      hasAcademy={!!activeAcademyId}
      groupCount={groupCount}
      professorCount={professorCount}
      studentCount={studentCount}
      todayGroups={todayGroups}
      absentLate={absentLate}
      userName={profile.full_name ?? ""}
      allGroups={allGroups}
    />
  );
}
