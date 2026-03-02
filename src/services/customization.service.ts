import { supabase } from "@/integrations/supabase/client";
import type { ColorPalette } from "@/contexts/ThemeContext";

export interface SavedPaletteRecord {
  id: string;
  name: string;
  palette: ColorPalette;
  created_at: string;
  updated_at: string;
}

export async function fetchUserPalettes(userId: string) {
  const { data, error } = await supabase
    .from("user_palettes" as any)
    .select("id, name, palette, created_at, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function updateUserPalette(payload: {
  paletteId: string;
  userId: string;
  palette: ColorPalette;
}) {
  const { error } = await supabase
    .from("user_palettes" as any)
    .update({ palette: payload.palette, updated_at: new Date().toISOString() })
    .eq("id", payload.paletteId)
    .eq("user_id", payload.userId);
  if (error) throw error;
}

export async function createUserPalette(payload: {
  userId: string;
  name: string;
  palette: ColorPalette;
}) {
  const { error } = await supabase
    .from("user_palettes" as any)
    .insert({ user_id: payload.userId, name: payload.name, palette: payload.palette });
  if (error) throw error;
}

export async function deleteUserPalette(payload: { paletteId: string; userId: string }) {
  const { error } = await supabase
    .from("user_palettes" as any)
    .delete()
    .eq("id", payload.paletteId)
    .eq("user_id", payload.userId);
  if (error) throw error;
}
