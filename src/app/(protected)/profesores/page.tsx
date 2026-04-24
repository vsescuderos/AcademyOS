import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfesoresView from "./profesores-view";

export default async function ProfesoresPage() {
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

  const [{ data: profesores }, { data: grupos }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("academy_id", profile.academy_id)
      .eq("role", "profesor")
      .order("full_name"),
    supabase
      .from("groups")
      .select("id, name, profesor_id")
      .eq("academy_id", profile.academy_id)
      .order("name"),
  ]);

  const gruposData = grupos ?? [];

  const profesoresConDatos = (profesores ?? []).map((p) => ({
    ...p,
    hasGroups: gruposData.some((g) => g.profesor_id === p.id),
    groups: gruposData
      .filter((g) => g.profesor_id === p.id)
      .map((g) => ({ id: g.id, name: g.name })),
  }));

  const allGroups = gruposData.map((g) => ({
    id: g.id,
    name: g.name,
    profesor_id: g.profesor_id as string | null,
  }));

  return <ProfesoresView profesores={profesoresConDatos} allGroups={allGroups} />;
}
