import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  country: string | null;
  balance: number;
  total_invested: number;
  total_profit: number;
  custom_roi_bonus: number;
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserData = async (uid: string) => {
    const [{ data: prof }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
    ]);
    setProfile(prof as Profile | null);
    setIsAdmin(!!roles?.some((r) => r.role === "admin"));
  };

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const { data: { session: sess } } = await supabase.auth.getSession();
        if (!mounted) return;

        if (sess) {
          setSession(sess);
          setUser(sess.user);
          // Load in background
          loadUserData(sess.user.id);
        }
      } catch (err) {
        console.error("Auth init error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    init();

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, sess) => {
      if (!mounted) return;
      
      setSession(sess);
      setUser(sess?.user ?? null);
      
      if (sess?.user) {
        // Fetch data but DO NOT set global loading=true again
        loadUserData(sess.user.id);
      } else {
        setProfile(null);
        setIsAdmin(false);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    if (user) await loadUserData(user.id);
  };
  const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.clear(); // Clear everything to be safe
    window.location.href = "/"; // Hard reload to clear all states
  };

  return (
    <AuthContext.Provider
      value={{ session, user, profile, isAdmin, loading, refreshProfile, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
