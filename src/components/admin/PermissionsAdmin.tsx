import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { usePermissionSettings, useSectors } from "@/hooks/useSupabaseQuery";
import {
  updatePermissionRoles,
  updatePermissionSectors,
  updatePermissionSwitch,
} from "@/services/admin.service";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";

const PERMISSION_CONFIG: Record<string, { label: string; description: string; type: "roles" | "switch" | "sectors" }> = {
  restrict_collaborator_sectors: {
    label: "Restringir colaboradores ao próprio setor",
    description: "Quando ativado, colaboradores são redirecionados diretamente ao seu setor ao acessar um cliente, sem poder acessar outros setores.",
    type: "switch",
  },
  reinf_fill_profits: {
    label: "Preencher lucros na EFD-REINF",
    description: "Selecione quais cargos podem preencher os lucros na EFD-REINF:",
    type: "roles",
  },
  view_accounting_ready: {
    label: "Acesso à aba Contabilidades Prontas",
    description: "Selecione quais setores podem visualizar a aba Contabilidades Prontas:",
    type: "sectors",
  },
  view_management: {
    label: "Acesso à aba Gerência",
    description: "Selecione quais cargos podem visualizar a aba Gerência:",
    type: "roles",
  },
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  supervisao: "Supervisão",
  colaborador: "Colaborador",
};

const ALL_ROLES = ["admin", "supervisao", "colaborador"];

export default function PermissionsAdmin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: permissions, isLoading } = usePermissionSettings();
  const { data: sectors } = useSectors();
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const toggleRole = async (permKey: string, role: string) => {
    const perm = permissions?.find((p: any) => p.key === permKey);
    if (!perm) return;
    const currentRoles: string[] = perm.allowed_roles || [];
    const newRoles = currentRoles.includes(role)
      ? currentRoles.filter((r: string) => r !== role)
      : [...currentRoles, role];

    setSaving((prev) => ({ ...prev, [permKey]: true }));
    try {
      await updatePermissionRoles({ permKey, roles: newRoles, userId: user?.id });
      queryClient.invalidateQueries({ queryKey: ["permission_settings"] });
      toast({ title: "Permissao atualizada!" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      toast({ title: "Erro", description: message, variant: "destructive" });
    } finally {
      setSaving((prev) => ({ ...prev, [permKey]: false }));
    }
  };

  const toggleSector = async (permKey: string, sectorId: string) => {
    const perm = permissions?.find((p: any) => p.key === permKey);
    if (!perm) return;
    const currentSectors: string[] = perm.allowed_sectors || [];
    const newSectors = currentSectors.includes(sectorId)
      ? currentSectors.filter((s: string) => s !== sectorId)
      : [...currentSectors, sectorId];

    setSaving((prev) => ({ ...prev, [permKey]: true }));
    try {
      await updatePermissionSectors({ permKey, sectors: newSectors, userId: user?.id });
      queryClient.invalidateQueries({ queryKey: ["permission_settings"] });
      toast({ title: "Permissao atualizada!" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      toast({ title: "Erro", description: message, variant: "destructive" });
    } finally {
      setSaving((prev) => ({ ...prev, [permKey]: false }));
    }
  };

  const toggleSwitch = async (permKey: string, currentEnabled: boolean) => {
    setSaving((prev) => ({ ...prev, [permKey]: true }));
    try {
      await updatePermissionSwitch({ permKey, enabled: !currentEnabled, userId: user?.id });
      queryClient.invalidateQueries({ queryKey: ["permission_settings"] });
      toast({ title: !currentEnabled ? "Ativado!" : "Desativado!" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      toast({ title: "Erro", description: message, variant: "destructive" });
    } finally {
      setSaving((prev) => ({ ...prev, [permKey]: false }));
    }
  };

  if (isLoading) return <div className="text-sm text-muted-foreground py-4">Carregando...</div>;

  const orderedKeys = Object.keys(PERMISSION_CONFIG);

  return (
    <div className="border rounded-lg divide-y">
      {orderedKeys.map((key) => {
        const config = PERMISSION_CONFIG[key];
        const perm: any = permissions?.find((p: any) => p.key === key);
        if (!perm) return null;

        return (
          <div key={perm.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 px-4 py-3">
            <div className="sm:w-[280px] shrink-0">
              <p className="text-sm font-medium">{config.label}</p>
              <p className="text-[11px] text-muted-foreground">{config.description}</p>
            </div>
            <div className="flex-1">
              {config.type === "switch" ? (
                <div className="flex items-center gap-2">
                  <Switch
                    checked={perm.enabled ?? false}
                    onCheckedChange={() => toggleSwitch(key, perm.enabled ?? false)}
                    disabled={saving[key]}
                  />
                  <span className="text-xs text-muted-foreground">{perm.enabled ? "Ativado" : "Desativado"}</span>
                </div>
              ) : config.type === "sectors" ? (
                <div className="flex flex-wrap items-center gap-3">
                  {(sectors || []).map((sector: any) => (
                    <label key={sector.id} className="flex items-center gap-1.5 cursor-pointer">
                      <Checkbox
                        checked={(perm.allowed_sectors || []).includes(sector.id)}
                        onCheckedChange={() => toggleSector(key, sector.id)}
                        disabled={saving[key]}
                        className="h-3.5 w-3.5"
                      />
                      <span className="text-xs">{sector.name}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  {ALL_ROLES.map((role) => (
                    <label key={role} className="flex items-center gap-1.5 cursor-pointer">
                      <Checkbox
                        checked={(perm.allowed_roles || []).includes(role)}
                        onCheckedChange={() => toggleRole(key, role)}
                        disabled={saving[key]}
                        className="h-3.5 w-3.5"
                      />
                      <span className="text-xs">{ROLE_LABELS[role] || role}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
      {!permissions?.length && (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhuma permissão configurável.</p>
      )}
    </div>
  );
}
