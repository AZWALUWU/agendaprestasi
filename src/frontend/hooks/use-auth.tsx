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

  useEffect(() => {
    let cancelled = false;
    let subscription: any = null;

    const initAuth = async () => {
      try {
        // STEP 1: Get session (fast, from localStorage/cookie)
        const { data: { session }, error } = await supabase.auth.getSession();

        if (cancelled) return;

        if (error) {
          console.error("Supabase getSession error:", error);
        }

        setSession(session);

        // STEP 2: Fetch role if user exists
        if (session?.user?.id) {
          try {
            const userRole = await getUserRole(session.user.id);
            if (!cancelled) setRole(userRole);
          } catch (roleErr) {
            console.error("Error fetching user role:", roleErr);
            if (!cancelled) setRole(null);
          }
        }

      } catch (err) {
        console.error("Critical Auth Initialization Error:", err);
      } finally {
        // IMPORTANT: always release loading
        if (!cancelled) {
          setLoading(false);
          initializedRef.current = true;
        }
      }

      // STEP 3: Listen to auth changes
      const { data } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
        // Skip duplicate initial fire
        if (!initializedRef.current) return;

        setSession(newSession);

        if (newSession?.user?.id) {
          try {
            const userRole = await getUserRole(newSession.user.id);
            setRole(userRole);
          } catch (roleErr) {
            console.error("Error fetching role on state change:", roleErr);
            setRole(null);
          }
        } else {
          setRole(null);
        }
      });

      subscription = data.subscription;
    };

    initAuth();

    // SAFETY: fallback jika sesuatu hang
    const timeout = setTimeout(() => {
      if (!initializedRef.current) {
        console.warn("Auth timeout — forcing loading false");
        setLoading(false);
        initializedRef.current = true;
      }
    }, 5000);

    return () => {
      cancelled = true;
      if (subscription) subscription.unsubscribe();
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