import path from "path";
import fs from "fs";
import PDFDocument from "pdfkit";

export interface ReceiptData {
  receiptNumber: number;
  academyName: string;
  academyPhone: string | null;
  studentName: string;
  amount: number;
  concept: string;
  method: "cash" | "card";
  professorName: string;
  date: string; // ISO yyyy-mm-dd
  notes: string | null;
}

function formatReceiptNumber(n: number): string {
  return "REC-" + String(n).padStart(4, "0");
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

// A5 portrait: 419 × 595 pt. margin=40 → bottom content limit ≈ 555 pt.
// All explicit text positions must end below their y + fontSize < 555.
export async function generateReceiptPdf(data: ReceiptData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A5", margin: 40, autoFirstPage: true });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const accent   = "#1a9e6e";  // var(--accent)
    const accentBg = "#e8f7f1";  // var(--accent-light)
    const gray     = "#6b7280";
    const lineCol  = "#e5e7eb";
    const dark     = "#111827";

    const W = doc.page.width;   // 419.53 pt
    const H = doc.page.height;  // 595.28 pt

    const recNum = formatReceiptNumber(data.receiptNumber);

    // ── Header bar ──────────────────────────────────────────────────────────
    doc.rect(0, 0, W, 65).fill(accent);

    // Logo in white box (left side of header)
    const logoPath = path.join(process.cwd(), "public", "logo.PNG");
    if (fs.existsSync(logoPath)) {
      doc.rect(12, 10, 96, 45).fill("#ffffff");
      doc.image(logoPath, 14, 14, { fit: [92, 37] });
    }

    // Academy name + phone (center-right of header)
    const textX = 120;
    doc.fillColor("#ffffff").fontSize(14).font("Helvetica-Bold")
      .text(data.academyName, textX, 15, { width: W - textX - 110, lineBreak: false });
    if (data.academyPhone) {
      doc.fontSize(9).font("Helvetica")
        .text(`Tel: ${data.academyPhone}`, textX, 36, { lineBreak: false });
    }

    // Receipt number (top-right)
    doc.fontSize(11).font("Helvetica-Bold")
      .text(recNum, W - 130, 24, { width: 90, align: "right", lineBreak: false });

    // ── Title ──────────────────────────────────────────────────────────────
    doc.fillColor(dark).fontSize(13).font("Helvetica-Bold")
      .text("RECIBO DE COBRO", 40, 78, { lineBreak: false });

    doc.moveTo(40, 96).lineTo(W - 40, 96)
      .strokeColor(lineCol).lineWidth(1).stroke();

    // ── Detail rows ────────────────────────────────────────────────────────
    let y = 106;
    const rowH = 23;

    function row(lbl: string, val: string) {
      doc.fontSize(8).font("Helvetica-Bold").fillColor(gray)
        .text(lbl.toUpperCase(), 40, y, { width: 100, lineBreak: false });
      doc.fontSize(10.5).font("Helvetica").fillColor(dark)
        .text(val, 148, y, { width: W - 188, lineBreak: false });
      y += rowH;
    }

    row("Alumno",         data.studentName);
    row("Concepto",       data.concept);
    row("Importe",        `${data.amount.toFixed(2)} €`);
    row("Método",         data.method === "cash" ? "Efectivo" : "Tarjeta");
    row("Fecha",          formatDate(data.date));
    row("Registrado por", data.professorName);
    if (data.notes) row("Notas", data.notes);

    // ── Total box ──────────────────────────────────────────────────────────
    y += 8;
    const boxH = 40;
    doc.rect(40, y, W - 80, boxH).fillAndStroke(accentBg, accent);

    doc.fillColor(accent).fontSize(10).font("Helvetica-Bold")
      .text("TOTAL", 54, y + 12, { lineBreak: false });
    doc.fontSize(17).font("Helvetica-Bold")
      .text(`${data.amount.toFixed(2)} €`, 54, y + 12, { width: W - 108, align: "right", lineBreak: false });

    // ── Footer ─────────────────────────────────────────────────────────────
    // Positioned at H-75=520. Text ends at ~530+8=538, well inside the 555 pt limit.
    const footerY = H - 75;
    doc.moveTo(40, footerY).lineTo(W - 40, footerY)
      .strokeColor(lineCol).lineWidth(0.5).stroke();

    doc.fillColor(gray).fontSize(8).font("Helvetica")
      .text(
        `Generado el ${formatDate(data.date)} · ${recNum}`,
        40, footerY + 8,
        { width: W - 80, align: "center", lineBreak: false }
      );

    doc.end();
  });
}
