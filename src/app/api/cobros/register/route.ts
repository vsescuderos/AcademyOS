import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateReceiptPdf } from "@/lib/receipts/generate-receipt-pdf";
import { uploadReceiptPdf } from "@/lib/receipts/upload-receipt";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, academy_id, full_name")
    .eq("id", user.id)
    .single();

  if (!profile || !["director", "profesor"].includes(profile.role)) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }
  if (!profile.academy_id) {
    return NextResponse.json({ error: "Sin academia activa" }, { status: 400 });
  }

  const body = await req.json() as {
    student_id: string;
    amount: number;
    concept: string;
    method: "cash" | "card";
    notes?: string | null;
  };

  if (!body.student_id || !body.amount || !body.concept || !body.method) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }
  if (body.amount <= 0) {
    return NextResponse.json({ error: "El importe debe ser positivo" }, { status: 400 });
  }

  const admin = createAdminClient();
  const academyId = profile.academy_id as string;

  // Verify student belongs to this academy
  const { data: student } = await admin
    .from("students")
    .select("id, full_name")
    .eq("id", body.student_id)
    .eq("academy_id", academyId)
    .single();

  if (!student) return NextResponse.json({ error: "Alumno no encontrado" }, { status: 404 });

  // Get academy name (always exists)
  const { data: academy, error: academyError } = await admin
    .from("academies")
    .select("name")
    .eq("id", academyId)
    .single();

  if (academyError || !academy) {
    return NextResponse.json({ error: "Academia no encontrada: " + (academyError?.message ?? "") }, { status: 404 });
  }

  // Get phone separately — column added in migration 013, tolerate if missing
  const { data: phoneRow } = await admin
    .from("academies")
    .select("phone")
    .eq("id", academyId)
    .single();
  const academyPhone: string | null = (phoneRow as { phone?: string | null } | null)?.phone ?? null;

  // Atomic receipt number
  const { data: seqData, error: seqError } = await admin
    .rpc("get_next_receipt_number", { p_academy_id: academyId });

  if (seqError || seqData == null) {
    return NextResponse.json({ error: "Error generando número de recibo" }, { status: 500 });
  }
  const receiptNumber = seqData as number;

  // Generate PDF
  const today = new Date().toISOString().slice(0, 10);
  const pdfBuffer = await generateReceiptPdf({
    receiptNumber,
    academyName: academy.name,
    academyPhone,
    studentName: student.full_name,
    amount: body.amount,
    concept: body.concept,
    method: body.method,
    professorName: profile.full_name,
    date: today,
    notes: body.notes ?? null,
  });

  // Upload to Storage
  const uploadResult = await uploadReceiptPdf(academyId, receiptNumber, pdfBuffer);
  if (uploadResult.error) {
    return NextResponse.json({ error: "Error guardando recibo: " + uploadResult.error }, { status: 500 });
  }

  // Insert payment record (use admin to bypass RLS for director too)
  const { data: payment, error: payError } = await admin
    .from("payments")
    .insert({
      academy_id: academyId,
      student_id: body.student_id,
      amount: body.amount,
      concept: body.concept,
      method: body.method,
      status: profile.role === "director" ? "validated" : "reported",
      registered_by: user.id,
      received_by: user.id,
      receipt_number: receiptNumber,
      receipt_url: uploadResult.url,
      notes: body.notes ?? null,
      registered_at: new Date().toISOString(),
      ...(profile.role === "director" ? { validated_by: user.id, validated_at: new Date().toISOString() } : {}),
    })
    .select("id, receipt_number")
    .single();

  if (payError) {
    return NextResponse.json({ error: payError.message }, { status: 500 });
  }

  return NextResponse.json({
    paymentId: payment.id,
    receiptNumber: payment.receipt_number,
    pdfBase64: pdfBuffer.toString("base64"),
  });
}
