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

export async function generateReceiptPdf(data: ReceiptData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A5", margin: 40 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const accentColor = "#2563eb";
    const grayColor = "#6b7280";
    const lineColor = "#e5e7eb";

    // Header bar
    doc.rect(0, 0, doc.page.width, 70).fill(accentColor);

    doc.fillColor("#ffffff").fontSize(18).font("Helvetica-Bold")
      .text(data.academyName, 40, 18, { width: doc.page.width - 80 });

    if (data.academyPhone) {
      doc.fontSize(10).font("Helvetica")
        .text(`Tel: ${data.academyPhone}`, 40, 42);
    }

    // Receipt number badge (top-right)
    const recNum = formatReceiptNumber(data.receiptNumber);
    doc.fillColor("#ffffff").fontSize(12).font("Helvetica-Bold")
      .text(recNum, doc.page.width - 130, 26, { width: 90, align: "right" });

    // Title
    doc.fillColor("#111827").fontSize(14).font("Helvetica-Bold")
      .text("RECIBO DE COBRO", 40, 88);

    doc.moveTo(40, 108).lineTo(doc.page.width - 40, 108)
      .strokeColor(lineColor).lineWidth(1).stroke();

    // Details grid
    let y = 120;
    const rowH = 26;

    function row(lbl: string, val: string) {
      doc.fontSize(9).font("Helvetica-Bold").fillColor(grayColor)
        .text(lbl.toUpperCase(), 40, y, { width: 100 });
      doc.fontSize(11).font("Helvetica").fillColor("#111827")
        .text(val, 150, y, { width: doc.page.width - 190 });
      y += rowH;
    }

    row("Alumno", data.studentName);
    row("Concepto", data.concept);
    row("Importe", `${data.amount.toFixed(2)} €`);
    row("Método", data.method === "cash" ? "Efectivo" : "Tarjeta");
    row("Fecha", formatDate(data.date));
    row("Registrado por", data.professorName);
    if (data.notes) row("Notas", data.notes);

    // Total box
    y += 10;
    doc.rect(40, y, doc.page.width - 80, 44)
      .fillAndStroke("#f0f9ff", accentColor);

    doc.fillColor(accentColor).fontSize(11).font("Helvetica-Bold")
      .text("TOTAL", 56, y + 8);
    doc.fontSize(18).font("Helvetica-Bold")
      .text(`${data.amount.toFixed(2)} €`, 56, y + 22, { width: doc.page.width - 112, align: "right" });

    // Footer
    const footerY = doc.page.height - 50;
    doc.moveTo(40, footerY).lineTo(doc.page.width - 40, footerY)
      .strokeColor(lineColor).lineWidth(0.5).stroke();

    doc.fillColor(grayColor).fontSize(8).font("Helvetica")
      .text(
        `Documento generado el ${formatDate(data.date)} · ${recNum}`,
        40, footerY + 8, { width: doc.page.width - 80, align: "center" }
      );

    doc.end();
  });
}
