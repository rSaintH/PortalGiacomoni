import { fetchDocumentReportData } from "@/services/documents.service";

// ── Constants ──

export const monthNames = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export const classificationLabels: Record<string, string> = {
  essencial: "Essencial",
  necessario: "Necessário",
  irrelevante: "Não necessário",
};

export const classificationColors: Record<string, string> = {
  essencial: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  necessario: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  irrelevante: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

// ── Helpers ──

export function formatYearMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function sanitizeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "_").substring(0, 100);
}

// ── PDF Generation (pure logic, no UI) ──

export async function generatePdfBlob(
  clientId: string,
  clientName: string,
  yearMonth: string,
  currentDate: Date,
): Promise<Blob | null> {
  const { docTypes, statuses } = await fetchDocumentReportData(clientId, yearMonth);

  const statusMap: Record<string, any> = {};
  statuses?.forEach((s: any) => { statusMap[s.document_type_id] = s; });

  const missingDocs = docTypes.filter((d: any) => {
    if (d.classification === "irrelevante") return false;
    const status = statusMap[d.id];
    return !status || !status.has_document;
  });

  if (missingDocs.length === 0) return null;

  const monthLabel = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  const now = new Date().toLocaleString("pt-BR");

  const jsPDFModule = await import("jspdf");
  const autoTableModule = await import("jspdf-autotable");
  const jsPDF = jsPDFModule.default;
  const autoTable = autoTableModule.default;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  doc.setFontSize(20);
  doc.setTextColor(30, 58, 95);
  doc.text("Solicitação de Documentos", 14, 22);

  doc.setFontSize(13);
  doc.setTextColor(75, 85, 99);
  doc.text(clientName, 14, 30);

  doc.setFontSize(10);
  doc.setTextColor(107, 114, 128);
  doc.text(`Referência: ${monthLabel}  |  Gerado em: ${now}`, 14, 37);

  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.8);
  doc.line(14, 40, 196, 40);

  doc.setFontSize(11);
  doc.setTextColor(55, 65, 81);
  doc.text("Os documentos abaixo estão pendentes de envio para o mês de referência.", 14, 48);

  const tableBody = missingDocs.map((d: any, i: number) => {
    const status = statusMap[d.id];
    const obs = status?.observation || "\u2014";
    return [String(i + 1), d.name, obs];
  });

  autoTable(doc, {
    startY: 53,
    head: [["#", "Documento", "Observação"]],
    body: tableBody,
    styles: { fontSize: 10, cellPadding: 3, lineColor: [209, 213, 219], lineWidth: 0.2 },
    headStyles: { fillColor: [240, 244, 255], textColor: [30, 58, 95], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    columnStyles: {
      0: { cellWidth: 12, halign: "center" },
      1: { cellWidth: 65, fontStyle: "bold" },
      2: { cellWidth: "auto" },
    },
    margin: { left: 14, right: 14 },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 200;
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.line(14, finalY + 6, 196, finalY + 6);
  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175);
  doc.text(`Total de documentos pendentes: ${missingDocs.length}  |  ContaOffice - Solicitação de Documentos`, 14, finalY + 12);

  return doc.output("blob");
}

export async function generateMassZip(
  blobs: { name: string; blob: Blob }[],
  yearMonth: string,
): Promise<{ blob: Blob; filename: string }> {
  if (blobs.length === 1) {
    return { blob: blobs[0].blob, filename: blobs[0].name };
  }

  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  for (const b of blobs) {
    zip.file(b.name, b.blob);
  }
  const zipBlob = await zip.generateAsync({ type: "blob" });
  return { blob: zipBlob, filename: `Documentos_${yearMonth}.zip` };
}

export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
