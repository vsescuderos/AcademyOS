import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import ConfiguracionView from "./configuracion-view";

export default async function ConfiguracionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, academy_id")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "director") redirect("/dashboard");

  // Fetch all academy IDs this director owns
  const { data: links } = await supabase
    .from("director_academies")
    .select("academy_id")
    .eq("director_id", user.id);

  const academyIds = links?.map((l) => l.academy_id) ?? [];

  const admin = createAdminClient();
  let allAcademies: { id: string; name: string; phone: string | null; created_at: string }[] = [];
  if (academyIds.length > 0) {
    const { data } = await admin
      .from("academies")
      .select("id, name, phone, created_at")
      .in("id", academyIds)
      .order("created_at");
    allAcademies = (data ?? []).map(a => ({ ...a, phone: a.phone ?? null }));
  }

  const activeAcademyId = profile.academy_id as string | null;
  const activeAcademy = allAcademies.find(a => a.id === activeAcademyId) ?? null;

  return (
    <ConfiguracionView
      activeAcademy={activeAcademy}
      allAcademies={allAcademies}
    />
  );
}
