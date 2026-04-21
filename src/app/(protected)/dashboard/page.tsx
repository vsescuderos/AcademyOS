import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import HomeView from "./home-view";

export default async function DashboardPage() {
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

  if (profile?.role === "profesor") redirect("/asistencia");
  if (!profile || profile.role !== "director") redirect("/login");

  // Fetch all academy IDs this director has access to
  const { data: links } = await supabase
    .from("director_academies")
    .select("academy_id")
    .eq("director_id", user.id);

  const academyIds = links?.map((l) => l.academy_id) ?? [];

  // Use admin client: RLS on academies only shows the active one,
  // but here we need all of the director's academies
  const admin = createAdminClient();
  let allAcademies: { id: string; name: string; created_at: string }[] = [];
  if (academyIds.length > 0) {
    const { data } = await admin
      .from("academies")
      .select("id, name, created_at")
      .in("id", academyIds)
      .order("created_at");
    allAcademies = data ?? [];
  }

  const activeAcademyId = profile.academy_id as string | null;
  const activeAcademy =
    allAcademies.find((a) => a.id === activeAcademyId) ?? null;

  let groupCount = 0;
  let professorCount = 0;
  let studentCount = 0;

  if (activeAcademyId) {
    const [groupRes, profRes, studentRes] = await Promise.all([
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
    ]);
    groupCount = groupRes.count ?? 0;
    professorCount = profRes.count ?? 0;
    studentCount = studentRes.count ?? 0;
  }

  return (
    <HomeView
      activeAcademy={activeAcademy}
      allAcademies={allAcademies}
      groupCount={groupCount}
      professorCount={professorCount}
      studentCount={studentCount}
    />
  );
}
