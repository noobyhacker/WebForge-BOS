import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type SystemHealthLog = Tables<"system_health_logs">;
export type JobQueueItem = Tables<"job_queue">;

export function useSystemHealth() {
  const healthLogs = useQuery({
    queryKey: ["system_health_logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_health_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as SystemHealthLog[];
    },
  });

  const jobQueue = useQuery({
    queryKey: ["job_queue"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_queue")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as JobQueueItem[];
    },
  });

  return {
    healthLogs: healthLogs.data ?? [],
    jobQueue: jobQueue.data ?? [],
    isLoading: healthLogs.isLoading || jobQueue.isLoading,
  };
}
