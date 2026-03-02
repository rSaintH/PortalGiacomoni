import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useProfiles, useManagementConfig } from "@/hooks/useSupabaseQuery";
import { saveManagementReviewer } from "@/services/admin.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ShieldCheck } from "lucide-react";

export default function ManagementAdmin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: profiles } = useProfiles();
  const { data: config, isLoading } = useManagementConfig();
  const [saving, setSaving] = useState(false);

  const reviewer1 = config?.find((c: any) => c.key === "reviewer_1")?.user_id || "";
  const reviewer2 = config?.find((c: any) => c.key === "reviewer_2")?.user_id || "";

  const handleSave = async (key: string, userId: string) => {
    if (!userId) return;
    setSaving(true);
    try {
      const existing = config?.find((c: any) => c.key === key);
      await saveManagementReviewer({
        key,
        userId,
        actorUserId: user?.id,
        hasExisting: Boolean(existing),
      });
      queryClient.invalidateQueries({ queryKey: ["management_config"] });
      toast({ title: "Conferente atualizado!" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      toast({ title: "Erro", description: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <div className="text-sm text-muted-foreground py-4">Carregando...</div>;

  const userOptions = profiles?.filter((p: any) => p.user_id) || [];

  return (
    <div className="space-y-4 max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Conferentes da Gerência
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Defina os dois conferentes que poderão marcar as checkboxes na aba Gerência.
            Cada conferente só poderá marcar a checkbox que lhe foi atribuída.
          </p>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Conferente 1</Label>
              <Select
                value={reviewer1}
                onValueChange={(v) => handleSave("reviewer_1", v)}
                disabled={saving}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar usuário..." />
                </SelectTrigger>
                <SelectContent>
                  {userOptions.map((p: any) => (
                    <SelectItem key={p.user_id} value={p.user_id}>
                      {p.full_name || p.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Conferente 2</Label>
              <Select
                value={reviewer2}
                onValueChange={(v) => handleSave("reviewer_2", v)}
                disabled={saving}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar usuário..." />
                </SelectTrigger>
                <SelectContent>
                  {userOptions.map((p: any) => (
                    <SelectItem key={p.user_id} value={p.user_id}>
                      {p.full_name || p.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
