import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "receipts";

export async function uploadReceiptPdf(
  academyId: string,
  receiptNumber: number,
  pdfBuffer: Buffer
): Promise<{ url: string; error?: never } | { url?: never; error: string }> {
  const admin = createAdminClient();
  const path = `${academyId}/${receiptNumber}.pdf`;

  const { error } = await admin.storage
    .from(BUCKET)
    .upload(path, pdfBuffer, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (error) return { error: error.message };

  // Return the storage path (not a signed URL — signing happens at serve time)
  return { url: path };
}

export async function getReceiptSignedUrl(storagePath: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 60 * 60); // 1 hour

  return data?.signedUrl ?? null;
}
