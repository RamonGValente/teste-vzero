import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { withOneSignal } from "@/integrations/onesignal/oneSignal";

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

  // Vincula o usuário logado ao External ID do OneSignal (uuid do Supabase)
  useEffect(() => {
    if (loading) return;

    withOneSignal(async (OneSignal) => {
      try {
        if (user?.id) {
          await OneSignal.login(user.id);
        } else {
          await OneSignal.logout();
        }
      } catch (e) {
        console.warn('[OneSignal] login/logout falhou', e);
      }
    });
  }, [loading, user?.id]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { user, session, loading, signOut };
}
