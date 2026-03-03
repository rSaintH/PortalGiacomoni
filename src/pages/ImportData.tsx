import { useMemo, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { CheckCircle2, Copy, Download, FileJson } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/lib/auth";
import {
  generateImportSqlLegacy,
  generateImportSqlWithExistingUsers,
  parseUsersRowsJson,
  type ExportDataMap,
  type MappingReport,
  type UsersRow,
} from "@/services/import.logic";

export default function ImportData() {
  const { isAdmin } = useAuth();

  const exportFileRef = useRef<HTMLInputElement>(null);
  const usersFileRef = useRef<HTMLInputElement>(null);

  const [exportData, setExportData] = useState<ExportDataMap | null>(null);
  const [usersRows, setUsersRows] = useState<UsersRow[] | null>(null);
  const [exportFileName, setExportFileName] = useState("");
  const [usersFileName, setUsersFileName] = useState("");
  const [generatedSql, setGeneratedSql] = useState("");
  const [copied, setCopied] = useState(false);
  const [useExistingUsers, setUseExistingUsers] = useState(true);
  const [fallbackEmail, setFallbackEmail] = useState("backup@giacomoni.com.br");
  const [mappingReport, setMappingReport] = useState<MappingReport | null>(null);

  if (!isAdmin) return <Navigate to="/" replace />;

  const canGenerate = useMemo(() => {
    if (!exportData) return false;
    if (!useExistingUsers) return true;
    return Boolean(usersRows && usersRows.length > 0 && fallbackEmail.trim());
  }, [exportData, useExistingUsers, usersRows, fallbackEmail]);

  const handleExportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExportFileName(file.name);
    setGeneratedSql("");
    setMappingReport(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(String(event.target?.result || "{}")) as ExportDataMap;
        setExportData(parsed);
      } catch {
        alert("Arquivo de exportacao JSON invalido.");
      }
    };
    reader.readAsText(file);
  };

  const handleUsersFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUsersFileName(file.name);
    setGeneratedSql("");
    setMappingReport(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(String(event.target?.result || "[]"));
        const rows = parseUsersRowsJson(parsed);
        if (!rows.length) {
          alert("users_rows.json invalido ou vazio.");
          return;
        }
        setUsersRows(rows);
      } catch {
        alert("Arquivo users_rows.json invalido.");
      }
    };
    reader.readAsText(file);
  };

  const generateSql = () => {
    if (!exportData) return;

    try {
      if (useExistingUsers) {
        const rows = usersRows || [];
        const { sql, report } = generateImportSqlWithExistingUsers(exportData, rows, fallbackEmail);
        setGeneratedSql(sql);
        setMappingReport(report);
      } else {
        setGeneratedSql(generateImportSqlLegacy(exportData));
        setMappingReport(null);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao gerar SQL.");
    }
  };

  const downloadSQL = () => {
    if (!generatedSql) return;
    const blob = new Blob([generatedSql], { type: "text/sql" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `import_data_${new Date().toISOString().slice(0, 10)}.sql`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copySQL = async () => {
    if (!generatedSql) return;
    await navigator.clipboard.writeText(generatedSql);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const tableCount = exportData
    ? Object.keys(exportData).filter((table) => (exportData[table]?.length || 0) > 0).length
    : 0;
  const totalRows = exportData
    ? Object.values(exportData).reduce((sum, rows) => sum + (rows?.length || 0), 0)
    : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">Importar Dados no Banco Novo</h1>

      <div className="space-y-4 rounded-lg border p-4">
        <h2 className="text-lg font-semibold">1. Arquivo exportado</h2>
        <p className="text-sm text-muted-foreground">
          Selecione o arquivo <code>supabase_export_*.json</code>.
        </p>
        <Button variant="outline" onClick={() => exportFileRef.current?.click()}>
          <FileJson className="mr-2 h-4 w-4" />
          {exportFileName || "Selecionar supabase_export_*.json"}
        </Button>
        <input ref={exportFileRef} type="file" accept=".json" onChange={handleExportFile} className="hidden" />
        {exportData && (
          <p className="text-sm text-green-600">
            {tableCount} tabelas com dados, {totalRows} registros no total.
          </p>
        )}
      </div>

      <div className="space-y-4 rounded-lg border p-4">
        <h2 className="text-lg font-semibold">2. Modo de geracao</h2>
        <div className="flex items-center space-x-2">
          <Switch id="existing-users-mode" checked={useExistingUsers} onCheckedChange={setUseExistingUsers} />
          <Label htmlFor="existing-users-mode">Usar usuarios ja existentes (mapeamento por email)</Label>
        </div>

        {useExistingUsers ? (
          <div className="space-y-3 rounded-md bg-muted/40 p-3">
            <div>
              <Button variant="outline" onClick={() => usersFileRef.current?.click()}>
                <FileJson className="mr-2 h-4 w-4" />
                {usersFileName || "Selecionar users_rows.json"}
              </Button>
              <input ref={usersFileRef} type="file" accept=".json" onChange={handleUsersFile} className="hidden" />
              {usersRows && (
                <p className="mt-2 text-sm text-muted-foreground">
                  {usersRows.length} usuarios carregados.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="fallback-email">Email fallback (quando nao achar match)</Label>
              <Input
                id="fallback-email"
                value={fallbackEmail}
                onChange={(e) => setFallbackEmail(e.target.value)}
                placeholder="backup@giacomoni.com.br"
              />
            </div>
          </div>
        ) : (
          <p className="text-sm text-amber-600">
            Modo legado: recria usuarios em auth.users. Use apenas em banco limpo.
          </p>
        )}

        <Button onClick={generateSql} disabled={!canGenerate}>
          Gerar SQL
        </Button>
      </div>

      {generatedSql && (
        <div className="space-y-4 rounded-lg border p-4">
          <h2 className="text-lg font-semibold">3. Rodar no SQL Editor</h2>

          <div className="flex gap-2">
            <Button onClick={downloadSQL} variant="outline">
              <Download className="mr-2 h-4 w-4" /> Baixar .sql
            </Button>
            <Button onClick={copySQL} variant="outline">
              {copied ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copiar SQL
                </>
              )}
            </Button>
          </div>

          {mappingReport && (
            <div className="rounded-md bg-muted/40 p-3 text-sm">
              <p>
                Mapeados por email: <b>{mappingReport.mappedCount}</b>
              </p>
              <p>
                Sem match (fallback): <b>{mappingReport.fallbackCount}</b>
              </p>
              {mappingReport.fallbackDetails.length > 0 && (
                <div className="mt-2 space-y-1 text-muted-foreground">
                  {mappingReport.fallbackDetails.map((item) => (
                    <p key={item.oldId}>
                      {item.email || "(sem email)"} - old id {item.oldId}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            Esse SQL ja inclui bloco para garantir FKs de auth.users no final.
          </p>
        </div>
      )}
    </div>
  );
}

