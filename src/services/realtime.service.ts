import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export function subscribeToTasksRealtime(channelName: string, onChange: () => void): RealtimeChannel {
  return supabase
    .channel(channelName)
    .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, onChange)
    .subscribe();
}

export function unsubscribeChannel(channel: RealtimeChannel) {
  supabase.removeChannel(channel);
}
