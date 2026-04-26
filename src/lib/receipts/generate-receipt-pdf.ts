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

// A5 portrait: W=419 pt, H=595 pt. Bottom content limit (margin 40) = 555 pt.
export async function generateReceiptPdf(data: ReceiptData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A5", margin: 40, autoFirstPage: true });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const accent   = "#1a9e6e";
    const accentBg = "#e8f7f1";
    const gray     = "#6b7280";
    const line     = "#e5e7eb";
    const dark     = "#111827";
    const W = doc.page.width;
    const H = doc.page.height;
    const PAD = 40;

    const recNum = formatReceiptNumber(data.receiptNumber);

    // ── Header (green band, 78 pt) ─────────────────────────────────────────
    doc.rect(0, 0, W, 78).fill(accent);

    // Logo in white box
    const logoPath = path.join(process.cwd(), "public", "logo.PNG");
    if (fs.existsSync(logoPath)) {
      doc.rect(PAD - 4, 12, 100, 54).fill("#ffffff");
      doc.image(logoPath, PAD - 2, 18, { fit: [96, 42] });
    }

    // Academy info
    const infoX = PAD + 108;
    doc.fillColor("#ffffff").fontSize(14).font("Helvetica-Bold")
      .text(data.academyName, infoX, 20, { width: W - infoX - 110, lineBreak: false });
    if (data.academyPhone) {
      doc.fontSize(9).font("Helvetica")
        .text(`Tel: ${data.academyPhone}`, infoX, 40, { lineBreak: false });
    }

    // Receipt number — top right
    doc.fontSize(10).font("Helvetica-Bold")
      .text(recNum, W - 130, 28, { width: 90, align: "right", lineBreak: false });

    // ── Document title ─────────────────────────────────────────────────────
    doc.fillColor(gray).fontSize(8).font("Helvetica-Bold")
      .text("RECIBO DE COBRO", PAD, 92, { characterSpacing: 1.5, lineBreak: false });

    doc.moveTo(PAD, 107).lineTo(W - PAD, 107)
      .strokeColor(line).lineWidth(0.75).stroke();

    // ── "Emitido a" — student name highlighted ─────────────────────────────
    doc.rect(PAD, 115, W - PAD * 2, 52).fill(accentBg);

    doc.fillColor(gray).fontSize(7.5).font("Helvetica-Bold")
      .text("EMITIDO A", PAD + 12, 121, { characterSpacing: 1, lineBreak: false });
    doc.fillColor(dark).fontSize(17).font("Helvetica-Bold")
      .text(data.studentName, PAD + 12, 133, { width: W - PAD * 2 - 24, lineBreak: false });

    doc.moveTo(PAD, 167).lineTo(W - PAD, 167)
      .strokeColor(line).lineWidth(0.75).stroke();

    // ── Detail rows ────────────────────────────────────────────────────────
    let y = 180;
    const rowH = 27;
    const labelW = 100;
    const valX = PAD + labelW + 8;
    const valW = W - valX - PAD;

    function row(lbl: string, val: string) {
      doc.fontSize(8).font("Helvetica-Bold").fillColor(gray)
        .text(lbl, PAD, y, { width: labelW, lineBreak: false });
      doc.fontSize(10.5).font("Helvetica").fillColor(dark)
        .text(val, valX, y, { width: valW, lineBreak: false });
      // subtle row separator
      doc.moveTo(PAD, y + 18).lineTo(W - PAD, y + 18)
        .strokeColor(line).lineWidth(0.4).stroke();
      y += rowH;
    }

    row("Concepto",       data.concept);
    row("Fecha",          formatDate(data.date));
    row("Método de pago", data.method === "cash" ? "Efectivo" : "Tarjeta");
    row("Registrado por", data.professorName);
    if (data.notes) row("Notas", data.notes);

    // ── Total ──────────────────────────────────────────────────────────────
    y += 10;
    const totalH = 56;
    doc.rect(PAD, y, W - PAD * 2, totalH).fill(accent);

    doc.fillColor("rgba(255,255,255,0.7)").fontSize(8).font("Helvetica-Bold")
      .text("IMPORTE TOTAL", PAD + 14, y + 14, { lineBreak: false });
    doc.fillColor("#ffffff").fontSize(26).font("Helvetica-Bold")
      .text(`${data.amount.toFixed(2)} €`, PAD + 14, y + 24,
        { width: W - PAD * 2 - 28, align: "right", lineBreak: false });

    // ── Footer ─────────────────────────────────────────────────────────────
    // Well inside the 555 pt bottom limit (line at ~520, text ends ~535)
    const footerY = H - 75;
    doc.moveTo(PAD, footerY).lineTo(W - PAD, footerY)
      .strokeColor(line).lineWidth(0.5).stroke();
    doc.fillColor(gray).fontSize(7.5).font("Helvetica")
      .text(
        `Generado el ${formatDate(data.date)} · ${recNum} · ${data.academyName}`,
        PAD, footerY + 9,
        { width: W - PAD * 2, align: "center", lineBreak: false }
      );

    doc.end();
  });
}
