import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getReceiptSignedUrl } from "@/lib/receipts/upload-receipt";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ receiptNumber: string }> }
) {
  const { receiptNumber } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, academy_id")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.academy_id) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const num = parseInt(receiptNumber, 10);
  if (isNaN(num)) return NextResponse.json({ error: "Número de recibo inválido" }, { status: 400 });

  const admin = createAdminClient();
  const { data: payment } = await admin
    .from("payments")
    .select("receipt_url, received_by, registered_at, academy_id")
    .eq("academy_id", profile.academy_id)
    .eq("receipt_number", num)
    .single();

  if (!payment || !payment.receipt_url) {
    return NextResponse.json({ error: "Recibo no encontrado" }, { status: 404 });
  }

  // Professors can only download their own payments (received_by = self)
  if (profile.role === "profesor" && payment.received_by !== user.id) {
    return NextResponse.json({ error: "Sin acceso a este recibo" }, { status: 403 });
  }

  const signedUrl = await getReceiptSignedUrl(payment.receipt_url);
  if (!signedUrl) {
    return NextResponse.json({ error: "Error generando URL de descarga" }, { status: 500 });
  }

  return NextResponse.redirect(signedUrl);
}
