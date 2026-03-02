import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getPopStatusBadgeClass } from "@/lib/constants";
import { useRef, useState } from "react";
import { fetchPopById } from "@/services/pops.service";

function usePop(id: string) {
  return useQuery({
    queryKey: ["pop", id],
    queryFn: () => fetchPopById(id),
    enabled: !!id,
  });
}

export default function PopView() {
  const { popId } = useParams<{ popId: string }>();
  const { data: pop, isLoading } = usePop(popId!);
  const contentRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const handlePrint = () => window.print();

  const sanitizeFilename = (name: string): string => {
    // Remove path separators and special chars to prevent path traversal
    const sanitized = name
      .replace(/[\/\\:*?"<>|]/g, "")      // Remove path/OS-reserved chars
      .replace(/\.\./g, "")                // Remove directory traversal
      .replace(/[^a-zA-Z0-9À-ú _-]/g, "") // Allowlist: alphanumeric, accented, space, hyphen, underscore
      .trim()
      .slice(0, 100);                      // Limit length
    return sanitized || "documento";
  };

  const handleDownloadPdf = async () => {
    if (!contentRef.current || !pop) return;
    setDownloading(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      await html2pdf()
        .set({
          margin: [15, 15, 15, 15],
          filename: `${sanitizeFilename(pop.title)}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ["avoid-all", "css", "legacy"] },
        })
        .from(contentRef.current)
        .save();
    } finally {
      setDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!pop) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p className="text-lg font-medium">POP não encontrado</p>
          <Link to="/" className="text-primary hover:underline mt-2 block">Voltar ao início</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top bar - hidden when printing */}
      <div className="print:hidden sticky top-0 z-10 bg-background border-b px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium truncate">{pop.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleDownloadPdf} disabled={downloading}>
            <Download className="h-4 w-4 mr-1" /> {downloading ? "Gerando..." : "Baixar PDF"}
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1" /> Imprimir
          </Button>
        </div>
      </div>

      {/* Document area - continuous scroll */}
      <div className="flex justify-center py-8 px-4 print:py-0 print:px-0">
        <div ref={contentRef} className="pop-a4-document rounded-lg shadow-lg w-full max-w-3xl p-12 print:shadow-none print:rounded-none print:p-[20mm]" style={{ backgroundColor: '#ffffff', color: '#000000' }}>
          {/* Header */}
          <div className="border-b pb-6 mb-6 print:pb-4 print:mb-4">
            <h1 className="text-2xl font-bold mb-3">{pop.title}</h1>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Badge className={getPopStatusBadgeClass(pop.status)}>{pop.status}</Badge>
              <Badge variant="outline">{pop.scope}</Badge>
              <Badge variant="outline">{pop.sectors?.name}</Badge>
              {pop.sections?.name && <Badge variant="outline">{pop.sections.name}</Badge>}
              {pop.clients && (
                <Badge variant="outline">{pop.clients.trade_name || pop.clients.legal_name}</Badge>
              )}
              <Badge variant="secondary">v{pop.version}</Badge>
            </div>
            <div className="text-xs space-x-4" style={{ color: '#666666' }}>
              <span>Criado em: {format(new Date(pop.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
              <span>Atualizado em: {format(new Date(pop.updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
            </div>
          </div>

          {/* Objective */}
          {pop.objective && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider mb-2" style={{ color: '#666666' }}>Objetivo</h2>
              <p className="text-sm leading-relaxed">{pop.objective}</p>
            </div>
          )}

          {/* Steps / Procedure */}
          {pop.steps && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: '#666666' }}>Procedimento</h2>
              <div
                className="ProseMirror prose prose-sm max-w-none text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: pop.steps }}
              />
            </div>
          )}

          {/* Links */}
          {pop.links && pop.links.length > 0 && pop.links.some((l: string) => l.trim()) && (
            <div className="mt-8 pt-4 border-t">
              <h2 className="text-sm font-semibold uppercase tracking-wider mb-2" style={{ color: '#666666' }}>Links</h2>
              <ul className="space-y-1">
                {pop.links.filter((l: string) => l.trim()).map((link: string, i: number) => (
                  <li key={i}>
                    <a href={link} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline break-all">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
