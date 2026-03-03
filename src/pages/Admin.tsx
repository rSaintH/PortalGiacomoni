import { useAuth } from "@/lib/auth";
import { Link, Navigate } from "react-router-dom";
import { isSupervisorRole, canAccessAdmin } from "@/services/permissions.logic";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Layers, Users, Palette, Tag, Upload, FileText, Settings2, Shield, ShieldCheck, Download } from "lucide-react";
import ParametersAdmin from "@/components/ParametersAdmin";
import ClientCsvImport from "@/components/ClientCsvImport";
import SectorsAdmin from "@/components/admin/SectorsAdmin";
import StylesAdmin from "@/components/admin/StylesAdmin";
import TagsAdmin from "@/components/admin/TagsAdmin";
import DocTagsAdmin from "@/components/admin/DocTagsAdmin";
import UsersAdmin from "@/components/admin/UsersAdmin";
import ManagementAdmin from "@/components/admin/ManagementAdmin";
import PermissionsAdmin from "@/components/admin/PermissionsAdmin";

export default function Admin() {
  const { isAdmin, userRole } = useAuth();
  const isSupervisor = isSupervisorRole(userRole);

  if (!canAccessAdmin(isAdmin, userRole)) return <Navigate to="/" replace />;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Administração</h1>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link to="/import-data">
                <Upload className="h-4 w-4" />
                Importar Dados
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link to="/export-data">
                <Download className="h-4 w-4" />
                Exportar Dados
              </Link>
            </Button>
          </div>
        )}
      </div>
      <Tabs defaultValue="sectors">
        <TabsList>
          <TabsTrigger value="sectors" className="gap-1"><Layers className="h-3 w-3" /> Setores & Seções</TabsTrigger>
          <TabsTrigger value="styles" className="gap-1"><Palette className="h-3 w-3" /> Estilos</TabsTrigger>
          <TabsTrigger value="tags" className="gap-1"><Tag className="h-3 w-3" /> Tags</TabsTrigger>
          <TabsTrigger value="doc-tags" className="gap-1"><FileText className="h-3 w-3" /> Tags de Documentos</TabsTrigger>
          <TabsTrigger value="parameters" className="gap-1"><Settings2 className="h-3 w-3" /> Parâmetros</TabsTrigger>
          <TabsTrigger value="import" className="gap-1"><Upload className="h-3 w-3" /> Importar CSV</TabsTrigger>
          <TabsTrigger value="users" className="gap-1"><Users className="h-3 w-3" /> Usuários</TabsTrigger>
          {!isSupervisor && (
            <TabsTrigger value="management" className="gap-1"><ShieldCheck className="h-3 w-3" /> Gerência</TabsTrigger>
          )}
          {!isSupervisor && (
            <TabsTrigger value="permissions" className="gap-1"><Shield className="h-3 w-3" /> Permissões</TabsTrigger>
          )}
        </TabsList>
        <TabsContent value="sectors" className="mt-4"><SectorsAdmin canManageSectors={isAdmin} /></TabsContent>
        <TabsContent value="styles" className="mt-4"><StylesAdmin /></TabsContent>
        <TabsContent value="tags" className="mt-4"><TagsAdmin /></TabsContent>
        <TabsContent value="doc-tags" className="mt-4"><DocTagsAdmin /></TabsContent>
        <TabsContent value="parameters" className="mt-4"><ParametersAdmin /></TabsContent>
        <TabsContent value="import" className="mt-4"><ClientCsvImport /></TabsContent>
        <TabsContent value="users" className="mt-4"><UsersAdmin readOnly={isSupervisor} /></TabsContent>
        {!isSupervisor && (
          <TabsContent value="management" className="mt-4"><ManagementAdmin /></TabsContent>
        )}
        {!isSupervisor && (
          <TabsContent value="permissions" className="mt-4"><PermissionsAdmin /></TabsContent>
        )}
      </Tabs>
    </div>
  );
}
