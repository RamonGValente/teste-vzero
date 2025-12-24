import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    // OneSignal.logout pode falhar se o SDK ainda não estiver pronto.
    // É best-effort para não quebrar o fluxo de logout.
    try {
      const mod = await import("@/integrations/onesignal/oneSignal");
      await mod.withOneSignal(async (OneSignal) => {
        try {
          await OneSignal.logout();
        } catch {
          // ignore
        }
      });
    } catch {
      // ignore
    }

    await supabase.auth.signOut();
  };

  return { user, session, loading, signOut };
}
