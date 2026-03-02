import { useState, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, CheckCircle2, AlertCircle, Download, Loader2 } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { importClientsFromCsv } from "@/services/clients.service";

interface ParsedRow {
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  grupo: string;
  informarSocios: boolean;
  socios: string[];
  errors: string[];
}

function validateCNPJ(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, "");
  if (digits.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(digits)) return false;

  const calc = (size: number) => {
    let sum = 0;
    let pos = size - 7;
    for (let i = size; i >= 1; i--) {
      sum += Number(digits[size - i]) * pos--;
      if (pos < 2) pos = 9;
    }
    const result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    return result;
  };

  if (calc(12) !== Number(digits[12])) return false;
  if (calc(13) !== Number(digits[13])) return false;
  return true;
}

function formatCNPJ(cnpj: string): string {
  const digits = cnpj.replace(/\D/g, "");
  if (digits.length !== 14) return cnpj;
  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

function parseCsv(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());

  const razaoIdx = header.findIndex((h) => h === "razaosocial");
  const fantasiaIdx = header.findIndex((h) => h === "nomefantasia");
  const cnpjIdx = header.findIndex((h) => h === "cnpj");
  const grupoIdx = header.findIndex((h) => h === "grupo");
  const sociosFlag = header.findIndex((h) => h === "informarsocios");

  const socioIdxs: number[] = [];
  for (let i = 1; i <= 5; i++) {
    const idx = header.findIndex((h) => h === `socio${i}`);
    if (idx !== -1) socioIdxs.push(idx);
  }

  const seenCnpjs = new Set<string>();

  return lines.slice(1).map((line) => {
    const cols = parseCSVLine(line);
    const errors: string[] = [];

    const razaoSocial = cols[razaoIdx]?.trim() || "";
    const nomeFantasia = cols[fantasiaIdx]?.trim() || "";
    const rawCnpj = cols[cnpjIdx]?.trim() || "";
    const cnpj = rawCnpj ? formatCNPJ(rawCnpj) : "";
    const cnpjDigits = rawCnpj.replace(/\D/g, "");
    const grupo = grupoIdx !== -1 ? cols[grupoIdx]?.trim() || "" : "";
    const informarSocios =
      sociosFlag !== -1
        ? ["1", "true", "sim", "s"].includes(cols[sociosFlag]?.trim().toLowerCase() || "")
        : false;

    const socios = socioIdxs
      .map((idx) => cols[idx]?.trim() || "")
      .filter((s) => s.length > 0);

    if (!razaoSocial) errors.push("Razão Social obrigatória");
    if (!nomeFantasia) errors.push("Nome Fantasia obrigatório");
    if (!rawCnpj) {
      errors.push("CNPJ obrigatório");
    } else if (!validateCNPJ(rawCnpj)) {
      errors.push("CNPJ inválido");
    } else if (seenCnpjs.has(cnpjDigits)) {
      errors.push("CNPJ duplicado no arquivo");
    } else {
      seenCnpjs.add(cnpjDigits);
    }
    if (informarSocios && socios.length === 0) errors.push("Pelo menos 1 sócio obrigatório");

    return { razaoSocial, nomeFantasia, cnpj, grupo, informarSocios, socios, errors };
  });
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        result.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}

export default function ClientCsvImport() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImported(false);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setRows(parseCsv(text));
    };
    reader.readAsText(file, "UTF-8");
  };

  const validRows = rows.filter((r) => r.errors.length === 0);
  const invalidRows = rows.filter((r) => r.errors.length > 0);

  const handleImport = async () => {
    if (validRows.length === 0) return;
    setImporting(true);
    try {
      const result = await importClientsFromCsv(validRows, user?.id);

      if (result.duplicateCnpjs.length > 0) {
        toast({
          title: "CNPJs ja cadastrados",
          description: result.duplicateCnpjs.join(", "),
          variant: "destructive",
        });
        setImporting(false);
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({ title: `${result.importedCount} cliente(s) importado(s) com sucesso!` });
      setImported(true);
    } catch (err: any) {
      toast({ title: "Erro na importacao", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const header = "razaoSocial,nomeFantasia,cnpj,grupo,informarSocios,socio1,socio2,socio3,socio4,socio5";
    const example = '"Empresa Exemplo LTDA","Exemplo","12.345.678/0001-90","Grupo A",1,"João Silva","Maria Souza","","",""';
    const blob = new Blob([header + "\n" + example], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo_clientes.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Upload className="h-4 w-4" /> Importação de Clientes via CSV
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-1">
            <Download className="h-4 w-4" /> Baixar modelo CSV
          </Button>
          <div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              onChange={handleFile}
              className="hidden"
            />
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="gap-1">
              <FileText className="h-4 w-4" /> Selecionar arquivo
            </Button>
          </div>
        </div>

        {rows.length > 0 && (
          <>
            <div className="flex gap-3 items-center text-sm">
              <Badge variant="default" className="gap-1">
                <CheckCircle2 className="h-3 w-3" /> {validRows.length} válido(s)
              </Badge>
              {invalidRows.length > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="h-3 w-3" /> {invalidRows.length} com erro(s)
                </Badge>
              )}
            </div>

            <div className="border rounded-md overflow-auto max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Razão Social</TableHead>
                    <TableHead>Nome Fantasia</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Grupo</TableHead>
                    <TableHead>Sócios</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, i) => (
                    <TableRow key={i} className={r.errors.length > 0 ? "bg-destructive/10" : ""}>
                      <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="text-sm">{r.razaoSocial || "—"}</TableCell>
                      <TableCell className="text-sm">{r.nomeFantasia || "—"}</TableCell>
                      <TableCell className="text-sm font-mono">{r.cnpj || "—"}</TableCell>
                      <TableCell className="text-sm">{r.grupo || "—"}</TableCell>
                      <TableCell className="text-sm">
                        {r.socios.length > 0 ? r.socios.join(", ") : "—"}
                      </TableCell>
                      <TableCell>
                        {r.errors.length > 0 ? (
                          <span className="text-xs text-destructive">{r.errors.join("; ")}</span>
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {!imported && (
              <Button
                onClick={handleImport}
                disabled={importing || validRows.length === 0}
                className="gap-1"
              >
                {importing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Importando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" /> Importar {validRows.length} cliente(s)
                  </>
                )}
              </Button>
            )}

            {imported && (
              <p className="text-sm text-green-600 flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" /> Importação concluída!
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

