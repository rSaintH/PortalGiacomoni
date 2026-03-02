import { createContext, useContext, useEffect, useState, useMemo, ReactNode } from "react";
import type { User, Session } from "@supabase/supabase-js";
import {
  getAuthSession,
  onAuthStateChange,
  fetchUserRole,
  fetchUserProfile,
  signIn as authSignIn,
  signUp as authSignUp,
  signOut as authSignOut,
} from "@/services/auth.service";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  userRole: string;
  userSectorId: string | null;
  mustChangePassword: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  setMustChangePassword: (v: boolean) => void;
}

const DEFAULT_ROLE = "colaborador";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState<string>(DEFAULT_ROLE);
  const [userSectorId, setUserSectorId] = useState<string | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let initialized = false;

    const loadUserData = async (userId: string) => {
      try {
        const roleInfo = await fetchUserRole(userId);
        if (isMounted) {
          setUserRole(roleInfo.role);
          setIsAdmin(roleInfo.isAdmin);
        }
      } catch {
        if (isMounted) {
          setUserRole(DEFAULT_ROLE);
          setIsAdmin(false);
        }
      }

      try {
        const profileInfo = await fetchUserProfile(userId);
        if (isMounted) {
          setUserSectorId(profileInfo.sectorId);
          setMustChangePassword(profileInfo.mustChangePassword);
        }
      } catch {
        if (isMounted) {
          setUserSectorId(null);
          setMustChangePassword(false);
        }
      }
    };

    const clearState = () => {
      setIsAdmin(false);
      setUserRole(DEFAULT_ROLE);
      setUserSectorId(null);
      setMustChangePassword(false);
    };

    const subscription = onAuthStateChange((_event, session) => {
      if (!isMounted || !initialized) return;
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        setTimeout(() => {
          if (isMounted) loadUserData(session.user.id);
        }, 0);
      } else {
        clearState();
      }
    });

    const initializeAuth = async () => {
      try {
        const { session } = await getAuthSession();
        if (!isMounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await loadUserData(session.user.id);
        }
      } catch (e) {
        console.error("Auth init failed:", e);
        if (isMounted) {
          setSession(null);
          setUser(null);
          clearState();
        }
      } finally {
        if (isMounted) {
          initialized = true;
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    return authSignIn(email, password);
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    return authSignUp(email, password, fullName);
  };

  const signOut = async () => {
    await authSignOut();
    setUser(null);
    setSession(null);
    setIsAdmin(false);
    setUserRole(DEFAULT_ROLE);
    setUserSectorId(null);
    setMustChangePassword(false);
  };

  const contextValue = useMemo(
    () => ({ user, session, isAdmin, userRole, userSectorId, mustChangePassword, loading, signIn, signUp, signOut, setMustChangePassword }),
    [user, session, isAdmin, userRole, userSectorId, mustChangePassword, loading]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
