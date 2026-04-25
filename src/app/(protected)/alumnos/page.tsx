import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AlumnosView from "./alumnos-view";

export default async function AlumnosPage() {
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

  const [{ data: alumnos }, { data: groups }, { data: groupStudents }] = await Promise.all([
    supabase
      .from("students")
      .select("id, full_name, email, phone")
      .eq("academy_id", profile.academy_id)
      .order("full_name"),
    supabase
      .from("groups")
      .select("id, name, days, time_start, time_end")
      .eq("academy_id", profile.academy_id)
      .order("name"),
    supabase
      .from("group_students")
      .select("student_id, group_id")
      .eq("academy_id", profile.academy_id),
  ]);

  const groupsData = groups ?? [];
  const groupMap = new Map(groupsData.map((g) => [g.id, g.name]));
  const studentGroupsMap = new Map<string, { id: string; name: string }[]>();
  for (const gs of groupStudents ?? []) {
    const name = groupMap.get(gs.group_id);
    if (name) {
      const arr = studentGroupsMap.get(gs.student_id) ?? [];
      arr.push({ id: gs.group_id, name });
      studentGroupsMap.set(gs.student_id, arr);
    }
  }

  const alumnosConGrupos = (alumnos ?? []).map((a) => ({
    ...a,
    groups: studentGroupsMap.get(a.id) ?? [],
  }));

  return <AlumnosView alumnos={alumnosConGrupos} groups={groupsData} />;
}
