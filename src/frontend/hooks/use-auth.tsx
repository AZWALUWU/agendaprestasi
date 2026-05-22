import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "@backend/supabase/client";
import { getUserRole, type UserRole } from "@backend/auth/auth";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  role: UserRole;
  loading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isAdmin: false,
  isSuperAdmin: false,
  role: null,
  loading: true,
  isAuthenticated: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const initializedRef = useRef(false);
  const roleLoadingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const fetchAndSetRole = async (userId: string) => {
      if (roleLoadingRef.current) return;
      roleLoadingRef.current = true;
      try {
        const userRole = await getUserRole(userId);
        if (!cancelled) setRole(userRole);
      } catch (err) {
        console.error("Error fetching role:", err);
        if (!cancelled) setRole(null);
      } finally {
        roleLoadingRef.current = false;
      }
    };

    // STEP 1: Pasang listener pertama
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (!initializedRef.current) return;
        if (cancelled) return;

        setSession(newSession);

        if (newSession?.user?.id) {
          await fetchAndSetRole(newSession.user.id);
        } else {
          setRole(null);
        }
      }
    );

    // STEP 2: Init session
    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (cancelled) return;
        if (error) console.error("getSession error:", error);

        setSession(session);

        if (session?.user?.id) {
          await fetchAndSetRole(session.user.id);
        }
      } catch (err) {
        console.error("Auth init error:", err);
      } finally {
        if (!cancelled) {
          setLoading(false);
          initializedRef.current = true;
        }
      }
    };

    initAuth();

    // STEP 3: Re-sync session ketika tab kembali aktif
    const handleVisibilityChange = async () => {
      if (document.visibilityState !== "visible") return;
      if (!initializedRef.current) return;
      if (cancelled) return;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!cancelled) {
          setSession(session);
          if (session?.user?.id) {
            await fetchAndSetRole(session.user.id);
          } else {
            setRole(null);
          }
        }
      } catch (err) {
        console.error("Visibility re-sync error:", err);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Safety timeout
    const timeout = setTimeout(() => {
      if (!initializedRef.current) {
        console.warn("Auth timeout — forcing loading false");
        setLoading(false);
        initializedRef.current = true;
      }
    }, 5000);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearTimeout(timeout);
    };
  }, []);

  const user = session?.user ?? null;
  const isAdmin = role === "admin" || role === "super_admin";
  const isSuperAdmin = role === "super_admin";
  const isAuthenticated = !loading && session !== null;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        isAdmin,
        isSuperAdmin,
        loading,
        isAuthenticated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}