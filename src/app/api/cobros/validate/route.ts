import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, academy_id")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "director") {
    return NextResponse.json({ error: "Solo el director puede validar cobros" }, { status: 403 });
  }

  const body = await req.json() as { payment_id: string };
  if (!body.payment_id) return NextResponse.json({ error: "payment_id requerido" }, { status: 400 });

  const { error } = await supabase
    .from("payments")
    .update({ status: "validated", validated_by: user.id, validated_at: new Date().toISOString() })
    .eq("id", body.payment_id)
    .eq("academy_id", profile.academy_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
