import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AsistenciaView from "./asistencia-view";
import DirectorAsistenciaView from "./director-asistencia-view";
import { DAY_KEYS } from "@/lib/constants";

export default async function AsistenciaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  if (profile.role === "director") {
    const { data: groups } = await supabase
      .from("groups")
      .select("id, name")
      .order("name");
    return <DirectorAsistenciaView groups={groups ?? []} />;
  }

  if (profile.role !== "profesor") redirect("/dashboard");

  const todayKey = DAY_KEYS[new Date().getDay()];

  const { data: groups } = await supabase
    .from("groups")
    .select("id, name")
    .eq("profesor_id", user.id)
    .contains("days", [todayKey])
    .order("name");

  return <AsistenciaView groups={groups ?? []} />;
}
