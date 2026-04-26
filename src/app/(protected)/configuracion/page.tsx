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
  if (!profile.academy_id) redirect("/dashboard");

  const admin = createAdminClient();
  const { data: academy } = await admin
    .from("academies")
    .select("id, name, phone")
    .eq("id", profile.academy_id)
    .single();

  if (!academy) redirect("/dashboard");

  return <ConfiguracionView academy={academy} />;
}
