import { useParams, Link, Navigate } from "react-router-dom";
import { useClient, useClientSectorStyles, useSectors, useClientTags, usePermissionSettings } from "@/hooks/useSupabaseQuery";
import { useAuth } from "@/lib/auth";
import { getRestrictedSectorId } from "@/services/permissions.logic";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, ChevronRight } from "lucide-react";
import { useState } from "react";
import ClientFormDialog from "@/components/ClientFormDialog";

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const { isAdmin, userRole, userSectorId } = useAuth();
  const { data: client, isLoading } = useClient(id!);
  const { data: sectors } = useSectors();
  const { data: clientStyles } = useClientSectorStyles(id!);
  const { data: clientTags } = useClientTags(id!);
  const { data: permissionSettings } = usePermissionSettings();
  const [showEditClient, setShowEditClient] = useState(false);

  const restrictedSectorId = getRestrictedSectorId(permissionSettings as any, userRole, userSectorId);
  if (restrictedSectorId) {
    return <Navigate to={`/clients/${id}/sector/${restrictedSectorId}`} replace />;
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Cliente não encontrado.
        <Link to="/clients" className="block mt-2 text-primary hover:underline">
          Voltar à lista
        </Link>
      </div>
    );
  }

  const getStyleForSector = (sectorId: string) => {
    return clientStyles?.find((cs: any) => cs.sector_id === sectorId);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-2">
        <Link to="/clients">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{client.trade_name || client.legal_name}</h1>
          {client.trade_name && (
            <p className="text-sm text-muted-foreground">{client.legal_name}</p>
          )}
        </div>
        {isAdmin && (
          <Button variant="outline" size="sm" onClick={() => setShowEditClient(true)}>
            <Edit className="h-4 w-4 mr-1" /> Editar
          </Button>
        )}
      </div>

      {clientTags && clientTags.filter((ct: any) => !ct.sector_id).length > 0 && (
        <Card className="border-accent/30 bg-accent/5">
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground mb-2">Tags da empresa</p>
            <div className="flex flex-wrap gap-2">
              {clientTags.filter((ct: any) => !ct.sector_id).map((ct: any) => (
                <Badge
                  key={ct.id}
                  style={{
                    backgroundColor: ct.tags?.color || "#3b82f6",
                    color: "white",
                  }}
                  className="text-xs"
                >
                  {ct.tags?.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Selecione o setor</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sectors?.map((sector: any) => {
            const style = getStyleForSector(sector.id);
            return (
              <Link key={sector.id} to={`/clients/${id}/sector/${sector.id}`}>
                <Card className="cursor-pointer hover:ring-1 hover:ring-primary/30 hover:shadow-md transition-all">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{sector.name}</p>
                      {style && (
                        <Badge variant="outline" className="text-xs mt-1">
                          Estilo {style.sector_styles?.name}
                        </Badge>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {showEditClient && <ClientFormDialog open={showEditClient} onClose={() => setShowEditClient(false)} client={client} />}
    </div>
  );
}
