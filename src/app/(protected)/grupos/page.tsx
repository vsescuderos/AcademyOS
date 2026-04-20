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

  const [{ data: groups }, { data: profesores }] = await Promise.all([
    supabase
      .from("groups")
      .select("id, name, days, time_start, time_end, profesor_id")
      .eq("academy_id", profile.academy_id)
      .order("name"),
    supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("academy_id", profile.academy_id)
      .eq("role", "profesor")
      .order("full_name"),
  ]);

  return (
    <GruposView
      groups={groups ?? []}
      profesores={profesores ?? []}
      directorEmail={user.email ?? ""}
    />
  );
}
