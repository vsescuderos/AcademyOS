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

  const { data: alumnos } = await supabase
    .from("students")
    .select("id, full_name, email, phone")
    .eq("academy_id", profile.academy_id)
    .order("full_name");

  return <AlumnosView alumnos={alumnos ?? []} />;
}
