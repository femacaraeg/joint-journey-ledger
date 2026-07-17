import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "./useSession";

export function useProfile() {
  const session = useSession();
  const userId = session?.user.id;
  return useQuery({
    enabled: !!userId,
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, email, household_id")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useHousehold() {
  const { data: profile } = useProfile();
  const hid = profile?.household_id;
  return useQuery({
    enabled: !!hid,
    queryKey: ["household", hid],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("households")
        .select("id, name, invite_code, currency, created_by")
        .eq("id", hid!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useHouseholdMembers() {
  const { data: profile } = useProfile();
  const hid = profile?.household_id;
  return useQuery({
    enabled: !!hid,
    queryKey: ["members", hid],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, email")
        .eq("household_id", hid!)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });
}