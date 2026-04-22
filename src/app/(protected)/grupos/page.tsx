import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import GruposView from "./grupos-view";

export default async function GruposPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, academy_id")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "director") redirect("/dashboard");

  const [{ data: rawGroups }, { data: profesores }, { data: students }] = await Promise.all([
    supabase
      .from("groups")
      .select("id, name, days, time_start, time_end, profesor_id, max_students, group_students(student_id)")
      .eq("academy_id", profile.academy_id)
      .order("name"),
    supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("academy_id", profile.academy_id)
      .eq("role", "profesor")
      .order("full_name"),
    supabase
      .from("students")
      .select("id, full_name")
      .eq("academy_id", profile.academy_id)
      .order("full_name"),
  ]);

  const groups = ((rawGroups ?? []) as unknown as Array<{
    id: string; name: string; days: string[]; time_start: string | null;
    time_end: string | null; profesor_id: string | null; max_students: number;
    group_students: { student_id: string }[];
  }>).map(g => ({
    id: g.id, name: g.name, days: g.days, time_start: g.time_start,
    time_end: g.time_end, profesor_id: g.profesor_id,
    max_students: g.max_students ?? 20,
    student_ids: g.group_students.map(gs => gs.student_id),
  }));

  return <GruposView groups={groups} profesores={profesores ?? []} students={students ?? []} />;
}
