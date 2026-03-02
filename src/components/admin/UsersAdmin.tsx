import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useProfiles, useSectors } from "@/hooks/useSupabaseQuery";
import {
  replaceUserRole,
  updateUserFunction,
  createUserWithRole,
} from "@/services/admin.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { UserPlus, Eye, EyeOff, Pencil, Key, Check, X } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  supervisao: "Supervisão",
  colaborador: "Colaborador",
};

export default function UsersAdmin({ readOnly = false }: { readOnly?: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: profiles } = useProfiles();
  const { data: sectors } = useSectors();
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newRole, setNewRole] = useState<string>("colaborador");
  const [newSectorId, setNewSectorId] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);

  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState("");
  const [editingPasswordId, setEditingPasswordId] = useState<string | null>(null);
  const [editPasswordValue, setEditPasswordValue] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const changeRole = async (userId: string, newRoleValue: string) => {
    try {
      await replaceUserRole(userId, newRoleValue);
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      toast({ title: "Cargo atualizado!" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      toast({ title: "Erro", description: message, variant: "destructive" });
    }
  };

  const updateSector = async (userId: string, sectorId: string | null) => {
    try {
      await updateUserFunction({ userId, sectorId });
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      toast({ title: "Setor atualizado!" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      toast({ title: "Erro", description: message, variant: "destructive" });
    }
  };

  const saveEditName = async (userId: string) => {
    if (!editNameValue.trim()) return;
    setSavingEdit(true);
    try {
      await updateUserFunction({ userId, fullName: editNameValue.trim() });
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      setEditingNameId(null);
      toast({ title: "Nome atualizado!" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      toast({ title: "Erro", description: message, variant: "destructive" });
    } finally {
      setSavingEdit(false);
    }
  };

  const saveEditPassword = async (userId: string) => {
    if (!editPasswordValue.trim() || editPasswordValue.length < 6) {
      toast({ title: "Erro", description: "A senha deve ter pelo menos 6 caracteres", variant: "destructive" });
      return;
    }
    setSavingEdit(true);
    try {
      await updateUserFunction({ userId, password: editPasswordValue });
      setEditingPasswordId(null);
      setEditPasswordValue("");
      toast({ title: "Senha atualizada! O usuario precisara trocar no proximo login." });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      toast({ title: "Erro", description: message, variant: "destructive" });
    } finally {
      setSavingEdit(false);
    }
  };

  const createUser = async () => {
    if (!newEmail.trim() || !newPassword.trim() || !newFullName.trim()) {
      toast({ title: "Erro", description: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Erro", description: "A senha deve ter pelo menos 6 caracteres", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      await createUserWithRole({
        email: newEmail.trim(),
        password: newPassword,
        fullName: newFullName.trim(),
        sectorId: newSectorId || null,
        role: newRole,
      });
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      setNewEmail("");
      setNewPassword("");
      setNewFullName("");
      setNewRole("colaborador");
      setNewSectorId("");
      toast({ title: "Usuario criado com sucesso!" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      toast({ title: "Erro", description: message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {!readOnly && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UserPlus className="h-4 w-4" /> Criar Novo Usuário
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Nome completo</Label>
                <Input
                  placeholder="Nome completo"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Cargo</Label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="colaborador">Colaborador</SelectItem>
                    <SelectItem value="supervisao">Supervisão</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Setor</Label>
                <Select value={newSectorId} onValueChange={setNewSectorId}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {sectors?.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">E-mail</Label>
                <Input
                  type="email"
                  placeholder="email@exemplo.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Senha</Label>
                <div className="flex gap-1">
                  <div className="relative flex-1">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Mínimo 6 caracteres"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button onClick={createUser} size="sm" disabled={creating}>
                    {creating ? "Criando..." : "Criar"}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Usuários</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {profiles?.map((p: any) => {
              const currentRole = p.user_roles?.[0]?.role || "colaborador";
              const roleLabel = ROLE_LABELS[currentRole] || currentRole;
              const sectorLabel = sectors?.find((s) => s.id === p.sector_id)?.name || "Sem setor";

              if (readOnly) {
                return (
                  <div key={p.id} className="p-3 rounded bg-muted/50">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{p.full_name || "Sem nome"}</p>
                        <p className="text-xs text-muted-foreground">{p.email}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-xs">{sectorLabel}</Badge>
                        <Badge variant="secondary" className="text-xs">{roleLabel}</Badge>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div key={p.id} className="p-3 rounded bg-muted/50 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      {editingNameId === p.user_id ? (
                        <div className="flex items-center gap-1">
                          <Input
                            value={editNameValue}
                            onChange={(e) => setEditNameValue(e.target.value)}
                            className="h-7 text-sm"
                            onKeyDown={(e) => e.key === "Enter" && saveEditName(p.user_id)}
                            autoFocus
                          />
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => saveEditName(p.user_id)} disabled={savingEdit}>
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingNameId(null)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <p className="text-sm font-medium">{p.full_name || "Sem nome"}</p>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => { setEditingNameId(p.user_id); setEditNameValue(p.full_name || ""); }}
                            title="Editar nome"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">{p.email}</p>
                    </div>

                    <Select
                      value={p.sector_id || "none"}
                      onValueChange={(val) => updateSector(p.user_id, val === "none" ? null : val)}
                    >
                      <SelectTrigger className="w-32 h-8 text-xs">
                        <SelectValue placeholder="Setor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem setor</SelectItem>
                        {sectors?.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={currentRole}
                      onValueChange={(val) => changeRole(p.user_id, val)}
                    >
                      <SelectTrigger className="w-36 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="colaborador">Colaborador</SelectItem>
                        <SelectItem value="supervisao">Supervisão</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => {
                        setEditingPasswordId(editingPasswordId === p.user_id ? null : p.user_id);
                        setEditPasswordValue("");
                      }}
                      title="Alterar senha"
                    >
                      <Key className="h-3.5 w-3.5" />
                      Senha
                    </Button>
                  </div>

                  {editingPasswordId === p.user_id && (
                    <div className="flex items-center gap-2 pl-1">
                      <Label className="text-xs text-muted-foreground whitespace-nowrap">Nova senha:</Label>
                      <Input
                        type="password"
                        value={editPasswordValue}
                        onChange={(e) => setEditPasswordValue(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        className="h-7 text-sm max-w-xs"
                        onKeyDown={(e) => e.key === "Enter" && saveEditPassword(p.user_id)}
                        autoFocus
                      />
                      <Button size="sm" className="h-7" onClick={() => saveEditPassword(p.user_id)} disabled={savingEdit}>
                        Salvar
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7" onClick={() => { setEditingPasswordId(null); setEditPasswordValue(""); }}>
                        Cancelar
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
            {!profiles?.length && (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum usuário.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
