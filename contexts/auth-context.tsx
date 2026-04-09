"use client";

import { createContext, useContext, useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export type UserRole = "manager" | "advisor" | "user" | "recruiter";

type UserProfile = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: UserRole;
  created_at?: string;
  updated_at?: string;
};

type AuthContextType = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  isAdmin: boolean;
  isAdvisor: boolean;
  isRecruiter: boolean;
  hasRole: (role: UserRole) => boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Throttle manual refresh on tab focus to avoid racing with other tabs (each tab would use the same refresh token → token_revoked). */
const SESSION_REFRESH_ON_VISIBLE_THROTTLE_MS = 5 * 60 * 1000; // 5 minutes
/** If we haven't received any auth event by this time, stop blocking the UI (middleware already protects routes). */
const AUTH_HYDRATION_MAX_MS = 3000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const lastVisibilityRefreshRef = useRef(0);
  const hasReceivedAuthEventRef = useRef(false);
  /** Prevents concurrent refreshSession() calls (same refresh token used twice → token_revoked). */
  const refreshInProgressRef = useRef(false);

  const supabase = createClient();

  const checkUserBanned = useCallback(async (userId: string): Promise<boolean> => {
    try {
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();

      if (userError) {
        const msg = userError.message?.toLowerCase() || "";
        if (msg.includes("banned") || msg.includes("user is banned")) {
          await supabase.auth.signOut();
          setUser(null);
          setProfile(null);
          router.push("/auth/login");
          return true;
        }
        // Don't sign out on other errors (e.g. network, expired token) - avoids random logouts
        return false;
      }

      // Don't sign out on missing/mismatched user - can be transient (refresh in progress, race).
      // Middleware will redirect to login if the session is actually invalid.
      if (!currentUser || currentUser.id !== userId) {
        return false;
      }

      if (currentUser.user_metadata?.banned_until || currentUser.app_metadata?.banned_until) {
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        router.push("/auth/login");
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }, [supabase, router]);

  const fetchUserProfile = useCallback(async (userId: string, userEmail?: string) => {
    try {
      const isBanned = await checkUserBanned(userId);
      if (isBanned) return null;

      const { data: profileData, error: profileError } = await supabase
        .from("users")
        .select("role, fullname, user_id, is_active")
        .eq("user_id", userId)
        .maybeSingle();

      if (profileError || !profileData) {
        console.error("[AuthProvider] Profile error or missing:", profileError || "No profile");
        return null;
      }

      if (profileData.is_active === false) {
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        router.push("/auth/login?error=account_deactivated&message=Your+account+has+been+deactivated.+Please+contact+your+administrator.");
        return null;
      }

      const userProfile: UserProfile = {
        id: userId,
        email: userEmail || "",
        first_name: typeof profileData.fullname === "string" ? profileData.fullname.split(" ")[0] || null : null,
        last_name: typeof profileData.fullname === "string" ? profileData.fullname.split(" ").slice(1).join(" ") || null : null,
        role: profileData.role as UserRole,
      };
      setProfile(userProfile);
      return userProfile;
    } catch (error) {
      console.error("[AuthProvider] fetchUserProfile error:", error);
      return null;
    }
  }, [supabase, checkUserBanned, router]);

  // Single source of truth: onAuthStateChange (fires INITIAL_SESSION immediately with current session)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      hasReceivedAuthEventRef.current = true;

      if (session?.user) {
        setUser(session.user);
        // Keep loading true until profile is loaded so we don't flash "Loading user profile..." on every page load
        checkUserBanned(session.user.id).then((banned) => {
          if (banned) {
            setLoading(false);
            return;
          }
          fetchUserProfile(session.user.id, session.user.email).finally(() => {
            setLoading(false);
          });
        });
      } else {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    const fallbackTimer = setTimeout(() => {
      if (!hasReceivedAuthEventRef.current) {
        hasReceivedAuthEventRef.current = true;
        setLoading(false);
      }
    }, AUTH_HYDRATION_MAX_MS);

    return () => {
      subscription.unsubscribe();
      clearTimeout(fallbackTimer);
    };
  }, [supabase.auth, checkUserBanned, fetchUserProfile]);

  const signOut = useCallback(async () => {
    setUser(null);
    setProfile(null);
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("SignOut error:", e);
    }
    window.location.replace("/auth/login");
  }, [supabase.auth]);

  const refreshSession = useCallback(async () => {
    if (refreshInProgressRef.current) {
      if (process.env.NODE_ENV === "development") {
        console.log("[Auth] refresh skipped (already in progress)");
      }
      return;
    }
    if (process.env.NODE_ENV === "development") {
      console.log("[Auth] refresh started");
    }
    refreshInProgressRef.current = true;
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      if (data.session?.user) {
        setUser(data.session.user);
        await fetchUserProfile(data.session.user.id, data.session.user.email);
      }
    } catch (error) {
      console.error("[AuthProvider] refreshSession error:", error);
      setUser(null);
      setProfile(null);
      throw error;
    } finally {
      refreshInProgressRef.current = false;
    }
  }, [supabase.auth, fetchUserProfile]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const handleVisibility = () => {
      if (document.visibilityState !== "visible") return;
      if (!user) return;
      const now = Date.now();
      if (now - lastVisibilityRefreshRef.current < SESSION_REFRESH_ON_VISIBLE_THROTTLE_MS) return;
      lastVisibilityRefreshRef.current = now;
      refreshSession().catch(() => {});
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [user, refreshSession]);

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      signOut,
      refreshSession,
      isAdmin: profile?.role === "manager",
      isAdvisor: profile?.role === "advisor",
      isRecruiter: profile?.role === "recruiter",
      hasRole: (role: UserRole) => profile?.role === role,
    }),
    [user, profile, loading, signOut, refreshSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export function useIsAdmin() {
  return useAuth().isAdmin;
}

export function useIsAdvisor() {
  return useAuth().isAdvisor;
}

export function useHasRole(role: UserRole) {
  return useAuth().hasRole(role);
}

export function useIsRecruiter() {
  return useAuth().isRecruiter;
}
