import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useParameterOptions } from "@/hooks/useSupabaseQuery";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createParameterOption, deleteParameterOption } from "@/services/parameters.service";

const PARAM_TYPES = [
  { key: "task_status", label: "Status de Pendencias" },
  { key: "task_type", label: "Tipos de Pendencias" },
  { key: "task_priority", label: "Prioridades de Pendencias" },
  { key: "occurrence_category", label: "Categorias de Ocorrencias" },
];

export default function ParametersAdmin() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {PARAM_TYPES.map((paramType) => (
        <ParamSection key={paramType.key} type={paramType.key} label={paramType.label} />
      ))}
    </div>
  );
}

function ParamSection({ type, label }: { type: string; label: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: options } = useParameterOptions(type);
  const [newValue, setNewValue] = useState("");
  const [newColor, setNewColor] = useState("#3b82f6");

  const addOption = async () => {
    if (!newValue.trim()) return;
    const maxOrder = options?.reduce((max: number, option: any) => Math.max(max, option.order_index), -1) ?? -1;
    try {
      await createParameterOption({
        type,
        value: newValue.trim(),
        color: newColor,
        orderIndex: maxOrder + 1,
      });
      queryClient.invalidateQueries({ queryKey: ["parameter_options"] });
      setNewValue("");
      toast({ title: "Opcao adicionada!" });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const removeOption = async (id: string) => {
    try {
      await deleteParameterOption(id);
      queryClient.invalidateQueries({ queryKey: ["parameter_options"] });
      toast({ title: "Opcao removida!" });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="Novo valor"
            value={newValue}
            onChange={(event) => setNewValue(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && addOption()}
            className="flex-1"
          />
          <input
            type="color"
            value={newColor}
            onChange={(event) => setNewColor(event.target.value)}
            className="h-10 w-12 rounded border cursor-pointer"
          />
          <Button onClick={addOption} size="sm">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-1">
          {options?.map((option: any) => (
            <div key={option.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
              <div className="flex items-center gap-2">
                {option.color && <div className="h-4 w-4 rounded" style={{ backgroundColor: option.color }} />}
                <span className="text-sm font-medium">{option.value}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => removeOption(option.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          {!options?.length && (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma opcao cadastrada.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
