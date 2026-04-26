import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CobrosProfesorView from "./cobros-profesor-view";
import CobrosDirectorView from "./cobros-director-view";

export default async function CobrosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, academy_id, full_name")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.academy_id) redirect("/login");
  if (!["director", "profesor"].includes(profile.role)) redirect("/dashboard");

  if (profile.role === "director") {
    const { data: payments } = await supabase
      .from("payments")
      .select(`
        id, amount, concept, method, status, receipt_number, receipt_url,
        notes, registered_at, validated_at,
        students(full_name),
        received_by_profile:profiles!payments_received_by_fkey(full_name)
      `)
      .order("registered_at", { ascending: false });

    const cobros = ((payments ?? []) as unknown as Array<{
      id: string;
      amount: number;
      concept: string;
      method: string;
      status: string;
      receipt_number: number | null;
      receipt_url: string | null;
      notes: string | null;
      registered_at: string;
      validated_at: string | null;
      students: { full_name: string } | { full_name: string }[] | null;
      received_by_profile: { full_name: string } | { full_name: string }[] | null;
    }>).map(p => ({
      id: p.id,
      amount: p.amount,
      concept: p.concept,
      method: p.method,
      status: p.status,
      receipt_number: p.receipt_number,
      notes: p.notes,
      registered_at: p.registered_at,
      validated_at: p.validated_at,
      student_name: (Array.isArray(p.students) ? p.students[0]?.full_name : p.students?.full_name) ?? "",
      profesor_name: (Array.isArray(p.received_by_profile) ? p.received_by_profile[0]?.full_name : p.received_by_profile?.full_name) ?? "",
    }));

    return <CobrosDirectorView cobros={cobros} />;
  }

  // Profesor view: load all academy students
  const { data: students } = await supabase
    .from("students")
    .select("id, full_name")
    .order("full_name");

  // Today's own cobros
  const todayStr = new Date().toISOString().slice(0, 10);
  const { data: todayCobros } = await supabase
    .from("payments")
    .select("id, amount, concept, method, status, receipt_number, registered_at, students(full_name)")
    .eq("received_by", user.id)
    .gte("registered_at", todayStr + "T00:00:00")
    .order("registered_at", { ascending: false });

  const myTodayCobros = ((todayCobros ?? []) as unknown as Array<{
    id: string;
    amount: number;
    concept: string;
    method: string;
    status: string;
    receipt_number: number | null;
    registered_at: string;
    students: { full_name: string } | { full_name: string }[] | null;
  }>).map(p => ({
    id: p.id,
    amount: p.amount,
    concept: p.concept,
    method: p.method,
    status: p.status,
    receipt_number: p.receipt_number,
    registered_at: p.registered_at,
    student_name: (Array.isArray(p.students) ? p.students[0]?.full_name : p.students?.full_name) ?? "",
  }));

  return (
    <CobrosProfesorView
      students={students ?? []}
      todayCobros={myTodayCobros}
    />
  );
}
