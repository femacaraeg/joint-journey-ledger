import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// Dev-mode stub session used while auth is bypassed. Points at the seeded
// demo profile so RLS-bypassed reads/writes have a valid user_id + household.
const DEMO_USER_ID = "bbb1111b-7b08-4f5e-83dc-2a6284a2f077";
const DEMO_SESSION = {
  access_token: "demo",
  refresh_token: "demo",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: 9999999999,
  user: {
    id: DEMO_USER_ID,
    email: "femacaraeg@gmail.com",
    aud: "authenticated",
    role: "authenticated",
    app_metadata: {},
    user_metadata: {},
    created_at: new Date().toISOString(),
  },
} as unknown as Session;

export function useSession() {
  const [session, setSession] = useState<Session | null | undefined>(DEMO_SESSION);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted && data.session) setSession(data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s ?? DEMO_SESSION);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return session;
}