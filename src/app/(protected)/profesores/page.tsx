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

  const { data: profesores } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("academy_id", profile.academy_id)
    .eq("role", "profesor")
    .order("full_name");

  return <ProfesoresView profesores={profesores ?? []} />;
}
