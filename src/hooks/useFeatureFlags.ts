import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type FeatureFlag = Tables<"feature_flags">;

export function useFeatureFlags() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["feature_flags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feature_flags")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as FeatureFlag[];
    },
  });

  const create = useMutation({
    mutationFn: async (flag: TablesInsert<"feature_flags">) => {
      const { data, error } = await supabase
        .from("feature_flags")
        .insert(flag)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["feature_flags"] }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"feature_flags"> & { id: string }) => {
      const { data, error } = await supabase
        .from("feature_flags")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["feature_flags"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("feature_flags").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["feature_flags"] }),
  });

  return { flags: query.data ?? [], isLoading: query.isLoading, create, update, remove };
}

/** Check if a specific flag is enabled (by key). Uses the cached query. */
export function useFeatureFlag(key: string): boolean {
  const { flags } = useFeatureFlags();
  const flag = flags.find((f) => f.key === key);
  return flag?.is_enabled ?? false;
}
