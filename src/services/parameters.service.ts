import { supabase } from "@/integrations/supabase/client";

export async function createParameterOption(payload: {
  type: string;
  value: string;
  color: string;
  orderIndex: number;
}) {
  const { error } = await supabase.from("parameter_options" as any).insert({
    type: payload.type,
    value: payload.value,
    color: payload.color,
    order_index: payload.orderIndex,
  } as any);
  if (error) throw error;
}

export async function deleteParameterOption(optionId: string) {
  const { error } = await supabase.from("parameter_options" as any).delete().eq("id", optionId);
  if (error) throw error;
}
