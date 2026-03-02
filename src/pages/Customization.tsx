import { useEffect, useMemo, useState } from "react";
import { useTheme, DEFAULT_PALETTE, type ColorPalette } from "@/contexts/ThemeContext";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RotateCcw, Save, Sparkles, Trash2 } from "lucide-react";
import {
  createUserPalette,
  deleteUserPalette,
  fetchUserPalettes,
  updateUserPalette,
} from "@/services/customization.service";

const PALETTE_LABELS: Record<keyof ColorPalette, string> = {
  background: "Fundo",
  foreground: "Texto",
  primary: "Cor Primária",
  card: "Cards",
  accent: "Destaque",
  sidebarBackground: "Fundo da Sidebar",
  sidebarForeground: "Texto da Sidebar",
  sidebarPrimary: "Primária da Sidebar",
  sidebarAccent: "Destaque da Sidebar",
  border: "Bordas",
};

const PRESET_PALETTES: { name: string; palette: ColorPalette }[] = [
  {
    name: "Oceano",
    palette: {
      background: "#f0f7ff",
      foreground: "#0c1b33",
      primary: "#0077b6",
      card: "#ffffff",
      accent: "#caf0f8",
      sidebarBackground: "#023e8a",
      sidebarForeground: "#caf0f8",
      sidebarPrimary: "#48cae4",
      sidebarAccent: "#0353a4",
      border: "#90caf9",
    },
  },
  {
    name: "Floresta",
    palette: {
      background: "#f1f8e9",
      foreground: "#1b2e1b",
      primary: "#2e7d32",
      card: "#ffffff",
      accent: "#c8e6c9",
      sidebarBackground: "#1b5e20",
      sidebarForeground: "#c8e6c9",
      sidebarPrimary: "#66bb6a",
      sidebarAccent: "#2e7d32",
      border: "#a5d6a7",
    },
  },
  {
    name: "Pôr do Sol",
    palette: {
      background: "#fff8f0",
      foreground: "#3e2723",
      primary: "#e65100",
      card: "#ffffff",
      accent: "#ffe0b2",
      sidebarBackground: "#bf360c",
      sidebarForeground: "#ffe0b2",
      sidebarPrimary: "#ff8a65",
      sidebarAccent: "#d84315",
      border: "#ffcc80",
    },
  },
  {
    name: "Ametista",
    palette: {
      background: "#f3e5f5",
      foreground: "#1a0a2e",
      primary: "#7b1fa2",
      card: "#ffffff",
      accent: "#e1bee7",
      sidebarBackground: "#4a148c",
      sidebarForeground: "#e1bee7",
      sidebarPrimary: "#ba68c8",
      sidebarAccent: "#6a1b9a",
      border: "#ce93d8",
    },
  },
  {
    name: "Noturno",
    palette: {
      background: "#121212",
      foreground: "#e0e0e0",
      primary: "#bb86fc",
      card: "#1e1e1e",
      accent: "#2d2d2d",
      sidebarBackground: "#0a0a0a",
      sidebarForeground: "#b0b0b0",
      sidebarPrimary: "#bb86fc",
      sidebarAccent: "#1a1a1a",
      border: "#333333",
    },
  },
  {
    name: "Rosa",
    palette: {
      background: "#fce4ec",
      foreground: "#311b23",
      primary: "#c2185b",
      card: "#ffffff",
      accent: "#f8bbd0",
      sidebarBackground: "#880e4f",
      sidebarForeground: "#f8bbd0",
      sidebarPrimary: "#f06292",
      sidebarAccent: "#ad1457",
      border: "#f48fb1",
    },
  },
  {
    name: "Gremio Doente",
    palette: {
      background: "#e6f6ff",
      foreground: "#05070a",
      primary: "#00a3e0",
      card: "#ffffff",
      accent: "#c9ebff",
      sidebarBackground: "#000000",
      sidebarForeground: "#eaf7ff",
      sidebarPrimary: "#00a3e0",
      sidebarAccent: "#101820",
      border: "#7fcdf3",
    },
  },
];

interface SavedPalette {
  id: string;
  name: string;
  palette: ColorPalette;
  created_at: string;
  updated_at: string;
}

function normalizePalette(value: unknown): ColorPalette {
  if (!value || typeof value !== "object" || Array.isArray(value)) return DEFAULT_PALETTE;
  return { ...DEFAULT_PALETTE, ...(value as Partial<ColorPalette>) };
}

export default function Customization() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { palette, setPalette, paletteActive, setPaletteActive, shadowsDisabled, setShadowsDisabled } = useTheme();
  const [savedPalettes, setSavedPalettes] = useState<SavedPalette[]>([]);
  const [savedPaletteName, setSavedPaletteName] = useState("");
  const [loadingSavedPalettes, setLoadingSavedPalettes] = useState(false);
  const [savingCurrentPalette, setSavingCurrentPalette] = useState(false);
  const [deletingPaletteId, setDeletingPaletteId] = useState<string | null>(null);

  const remainingSlots = useMemo(() => Math.max(0, 3 - savedPalettes.length), [savedPalettes.length]);

  const fetchSavedPalettes = async () => {
    if (!user?.id) {
      setSavedPalettes([]);
      return;
    }

    setLoadingSavedPalettes(true);
    try {
      const data = await fetchUserPalettes(user.id);
      const mapped: SavedPalette[] = (data || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        palette: normalizePalette(item.palette),
        created_at: item.created_at,
        updated_at: item.updated_at,
      }));

      setSavedPalettes(mapped);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingSavedPalettes(false);
    }
  };

  useEffect(() => {
    fetchSavedPalettes();
  }, [user?.id]);

  const handleColorChange = (key: keyof ColorPalette, value: string) => {
    setPalette({ ...palette, [key]: value });
  };

  const handleReset = () => {
    setPalette(DEFAULT_PALETTE);
  };

  const handlePreset = (preset: ColorPalette) => {
    setPalette(preset);
    if (!paletteActive) setPaletteActive(true);
  };

  const handleSaveCurrentPalette = async () => {
    if (!user?.id) {
      toast({
        title: "Erro",
        description: "Usuario nao autenticado.",
        variant: "destructive",
      });
      return;
    }

    const name = savedPaletteName.trim();
    if (!name) {
      toast({
        title: "Nome obrigatorio",
        description: "Informe um nome para salvar a paleta.",
        variant: "destructive",
      });
      return;
    }

    setSavingCurrentPalette(true);
    try {
      const existing = savedPalettes.find((p) => p.name.toLowerCase() === name.toLowerCase());

      if (existing) {
        await updateUserPalette({
          paletteId: existing.id,
          userId: user.id,
          palette,
        });
        toast({ title: "Paleta atualizada!" });
      } else {
        if (savedPalettes.length >= 3) {
          toast({
            title: "Limite atingido",
            description: "Cada usuario pode salvar no maximo 3 paletas.",
            variant: "destructive",
          });
          return;
        }

        await createUserPalette({ userId: user.id, name, palette });
        toast({ title: "Paleta salva!" });
      }

      setSavedPaletteName("");
      await fetchSavedPalettes();
    } catch (err: any) {
      toast({
        title: "Erro ao salvar",
        description: err.message || "Nao foi possivel salvar a paleta.",
        variant: "destructive",
      });
    } finally {
      setSavingCurrentPalette(false);
    }
  };

  const handleApplySavedPalette = (saved: SavedPalette) => {
    setPalette(saved.palette);
    if (!paletteActive) setPaletteActive(true);
  };

  const handleDeleteSavedPalette = async (id: string) => {
    if (!user?.id) return;
    setDeletingPaletteId(id);
    try {
      await deleteUserPalette({ paletteId: id, userId: user.id });

      setSavedPalettes((prev) => prev.filter((p) => p.id !== id));
      toast({ title: "Paleta removida." });
    } catch (err: any) {
      toast({
        title: "Erro ao remover",
        description: err.message || "Nao foi possivel remover a paleta.",
        variant: "destructive",
      });
    } finally {
      setDeletingPaletteId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Sparkles className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Customização</h1>
          <p className="text-sm text-muted-foreground">
           easter egg :D
          </p>
        </div>
      </div>

      {/* Toggle palette active */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Paleta Personalizada</CardTitle>
          <CardDescription>
            Ative para usar sua paleta de cores customizada. Quando ativa, o botão de modo escuro/claro não terá efeito.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Switch
              checked={paletteActive}
              onCheckedChange={setPaletteActive}
              id="palette-active"
            />
            <Label htmlFor="palette-active" className="font-medium">
              {paletteActive ? "Paleta ativa" : "Usando cores padrão"}
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Shadows toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sombras</CardTitle>
          <CardDescription>
            Desative as sombras (box-shadow) de todos os elementos do site.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Switch
              checked={shadowsDisabled}
              onCheckedChange={setShadowsDisabled}
              id="shadows-disabled"
            />
            <Label htmlFor="shadows-disabled" className="font-medium">
              {shadowsDisabled ? "Sombras desativadas" : "Sombras ativas"}
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Presets */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Paletas Prontas</CardTitle>
          <CardDescription>Escolha uma paleta pronta para começar.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {PRESET_PALETTES.map((preset) => (
              <button
                key={preset.name}
                onClick={() => handlePreset(preset.palette)}
                className="group relative rounded-lg border-2 border-border p-3 text-left transition-all hover:border-primary hover:shadow-md"
              >
                <div className="flex gap-1 mb-2">
                  {[preset.palette.primary, preset.palette.sidebarBackground, preset.palette.accent, preset.palette.background].map(
                    (color, i) => (
                      <div
                        key={i}
                        className="h-6 w-6 rounded-full border border-border"
                        style={{ backgroundColor: color }}
                      />
                    )
                  )}
                </div>
                <span className="text-sm font-medium">{preset.name}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Saved palettes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Paletas Salvas</CardTitle>
          <CardDescription>Salve ate 3 paletas na sua conta para acessar de qualquer lugar.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1 min-w-[220px] flex-1">
              <Label htmlFor="saved-palette-name">Nome da paleta</Label>
              <Input
                id="saved-palette-name"
                placeholder="Ex: Fiscal clean"
                value={savedPaletteName}
                onChange={(e) => setSavedPaletteName(e.target.value)}
                maxLength={60}
              />
            </div>
            <Button onClick={handleSaveCurrentPalette} disabled={savingCurrentPalette || !user}>
              <Save className="h-4 w-4 mr-2" />
              {savingCurrentPalette ? "Salvando..." : "Salvar paleta atual"}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Limite por usuario: 3 paletas. Vagas restantes: {remainingSlots}.
          </p>

          {loadingSavedPalettes ? (
            <p className="text-sm text-muted-foreground">Carregando paletas salvas...</p>
          ) : savedPalettes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma paleta salva.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {savedPalettes.map((saved) => (
                <div key={saved.id} className="rounded-lg border p-3 space-y-3">
                  <div>
                    <p className="text-sm font-medium">{saved.name}</p>
                  </div>
                  <div className="flex gap-1">
                    {[saved.palette.primary, saved.palette.sidebarBackground, saved.palette.accent, saved.palette.background].map(
                      (color, i) => (
                        <div
                          key={i}
                          className="h-5 w-5 rounded-full border border-border"
                          style={{ backgroundColor: color }}
                        />
                      )
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => handleApplySavedPalette(saved)}>
                      Aplicar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteSavedPalette(saved.id)}
                      disabled={deletingPaletteId === saved.id}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Excluir
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Custom colors */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Cores Individuais</CardTitle>
              <CardDescription>Ajuste cada cor individualmente.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Resetar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(Object.keys(PALETTE_LABELS) as Array<keyof ColorPalette>).map((key) => (
              <div key={key} className="flex items-center gap-3">
                <input
                  type="color"
                  value={palette[key]}
                  onChange={(e) => handleColorChange(key, e.target.value)}
                  className="h-10 w-10 rounded cursor-pointer border border-border bg-transparent p-0.5"
                />
                <Label className="text-sm">{PALETTE_LABELS[key]}</Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      {paletteActive && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pré-visualização</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden" style={{ backgroundColor: palette.background }}>
              <div className="flex">
                {/* Mini sidebar */}
                <div className="w-40 p-3 space-y-2" style={{ backgroundColor: palette.sidebarBackground }}>
                  <div className="h-3 w-20 rounded" style={{ backgroundColor: palette.sidebarPrimary }} />
                  <div className="h-2 w-16 rounded opacity-60" style={{ backgroundColor: palette.sidebarForeground }} />
                  <div className="h-7 rounded px-2 flex items-center" style={{ backgroundColor: palette.sidebarAccent }}>
                    <div className="h-2 w-12 rounded" style={{ backgroundColor: palette.sidebarForeground }} />
                  </div>
                  <div className="h-2 w-14 rounded opacity-40" style={{ backgroundColor: palette.sidebarForeground }} />
                  <div className="h-2 w-18 rounded opacity-40" style={{ backgroundColor: palette.sidebarForeground }} />
                </div>
                {/* Mini content */}
                <div className="flex-1 p-4 space-y-3">
                  <div className="h-4 w-32 rounded" style={{ backgroundColor: palette.foreground, opacity: 0.8 }} />
                  <div className="rounded-lg p-3 space-y-2" style={{ backgroundColor: palette.card }}>
                    <div className="h-3 w-24 rounded" style={{ backgroundColor: palette.primary }} />
                    <div className="h-2 w-full rounded" style={{ backgroundColor: palette.foreground, opacity: 0.15 }} />
                    <div className="h-2 w-3/4 rounded" style={{ backgroundColor: palette.foreground, opacity: 0.15 }} />
                  </div>
                  <div className="flex gap-2">
                    <div className="h-8 px-4 rounded flex items-center" style={{ backgroundColor: palette.primary }}>
                      <div className="h-2 w-10 rounded" style={{ backgroundColor: palette.background }} />
                    </div>
                    <div className="h-8 px-4 rounded flex items-center" style={{ backgroundColor: palette.accent }}>
                      <div className="h-2 w-10 rounded" style={{ backgroundColor: palette.foreground, opacity: 0.5 }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
