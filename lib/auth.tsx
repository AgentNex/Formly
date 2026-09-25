"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { insforge } from "./insforge";

export interface FormlyUser {
  _id: string;
  email?: string;
  name?: string;
  image?: string;
  avatar?: string;
  role?: string;
}

export interface FormlyOrg {
  _id: string;
  name: string;
  slug: string;
  plan: string;
  quotas?: {
    maxForms: number;
    maxSubmissionsPerMonth: number;
    maxMembers: number;
  };
  userRole?: string;
}

export interface InsForgeSessionUser {
  id: string;
  email?: string;
  name?: string;
  role?: string;
}

export interface AuthContextType {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: FormlyUser | null;
  currentOrganization: FormlyOrg | null;
  currentRole: string | null;
  organizations: FormlyOrg[];
  insforgeUser: InsForgeSessionUser | null;
  signIn: (provider: string, params?: Record<string, any>) => Promise<any>;
  signInWithPassword: (
    email: string,
    password: string
  ) => Promise<{ data: any; error: any }>;
  signUp: (
    email: string,
    password: string,
    name?: string
  ) => Promise<{ data: any; error: any }>;
  signInWithOAuth: (
    provider?: string,
    options?: { redirectTo?: string }
  ) => Promise<any>;
  verifyEmail: (
    email: string,
    otp: string
  ) => Promise<{ data: any; error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isLoading: true,
  isAuthenticated: false,
  user: null,
  currentOrganization: null,
  currentRole: null,
  organizations: [],
  insforgeUser: null,
  signIn: async () => ({}),
  signInWithPassword: async () => ({ data: null, error: null }),
  signUp: async () => ({ data: null, error: null }),
  signInWithOAuth: async () => ({}),
  verifyEmail: async () => ({ data: null, error: null }),
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [insforgeUser, setInsforgeUser] = useState<InsForgeSessionUser | null>(
    null
  );
  const [isInitializing, setIsInitializing] = useState(true);

  // Sync mutation to create/ensure user and organization in Convex
  const syncViewerMutation = useMutation(api.users.syncViewer);

  // Query Convex viewer profile and organization
  const viewerData = useQuery(
    api.users.viewer,
    insforgeUser?.email ? { email: insforgeUser.email } : {}
  );

  // Initialize InsForge session on mount
  useEffect(() => {
    let mounted = true;

    async function initSession() {
      try {
        const { data } = await insforge.auth.getCurrentUser();
        if (mounted) {
          if (data?.user) {
            setInsforgeUser({
              id: data.user.id,
              email: data.user.email,
              name:
                data.user.profile?.name ||
                data.user.email?.split("@")[0] ||
                "Formly User",
              role: (data.user as any).role,
            });
          } else {
            setInsforgeUser(null);
          }
        }
      } catch (err) {
        console.error("InsForge session initialization error:", err);
      } finally {
        if (mounted) {
          setIsInitializing(false);
        }
      }
    }

    initSession();

    // Subscribe to InsForge auth state changes
    const unsubscribe = insforge.auth.onAuthStateChange(async () => {
      try {
        const { data } = await insforge.auth.getCurrentUser();
        if (mounted) {
          if (data?.user) {
            setInsforgeUser({
              id: data.user.id,
              email: data.user.email,
              name:
                data.user.profile?.name ||
                data.user.email?.split("@")[0] ||
                "Formly User",
              role: (data.user as any).role,
            });
          } else {
            setInsforgeUser(null);
          }
        }
      } catch (err) {
        console.error("InsForge auth state change error:", err);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  // Synchronize InsForge identity into Convex
  useEffect(() => {
    if (insforgeUser?.email) {
      syncViewerMutation({
        email: insforgeUser.email,
        name: insforgeUser.name,
        externalId: insforgeUser.id,
      }).catch((err) => {
        console.warn("Convex user sync error:", err);
      });
    }
  }, [insforgeUser?.email, insforgeUser?.name, insforgeUser?.id, syncViewerMutation]);

  const signInWithPassword = useCallback(
    async (email: string, password: string) => {
      const res = await insforge.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (res.data?.user) {
        const u = res.data.user;
        setInsforgeUser({
          id: u.id,
          email: u.email,
          name: (u as any).profile?.name || (u as any).name || u.email?.split("@")[0],
        });
        await syncViewerMutation({
          email: u.email,
          name: (u as any).profile?.name || (u as any).name || u.email?.split("@")[0],
          externalId: u.id,
        }).catch((e) => console.warn("Sync on signin:", e));
      }
      return res;
    },
    [syncViewerMutation]
  );

  const signUp = useCallback(
    async (email: string, password: string, name?: string) => {
      const res = await insforge.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        name: name?.trim(),
      });
      if (res.data?.user && !res.data.requireEmailVerification) {
        const u = res.data.user;
        setInsforgeUser({
          id: u.id,
          email: u.email,
          name: (u as any).profile?.name || name?.trim() || u.email?.split("@")[0],
        });
        await syncViewerMutation({
          email: u.email,
          name: (u as any).profile?.name || name?.trim() || u.email?.split("@")[0],
          externalId: u.id,
        }).catch((e) => console.warn("Sync on signup:", e));
      }
      return res;
    },
    [syncViewerMutation]
  );

  const signInWithOAuth = useCallback(
    async (
      provider: string = "google",
      options?: { redirectTo?: string }
    ) => {
      const redirectUrl =
        options?.redirectTo ||
        (typeof window !== "undefined" ? `${window.location.origin}/` : "/");
      return await insforge.auth.signInWithOAuth(provider, {
        redirectTo: redirectUrl,
      });
    },
    []
  );

  const verifyEmail = useCallback(
    async (email: string, otp: string) => {
      const res = await insforge.auth.verifyEmail({
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
      });
      if (res.data?.user) {
        const u = res.data.user;
        setInsforgeUser({
          id: u.id,
          email: u.email,
          name: (u as any).profile?.name || (u as any).name || u.email?.split("@")[0],
        });
        await syncViewerMutation({
          email: u.email,
          name: (u as any).profile?.name || (u as any).name || u.email?.split("@")[0],
          externalId: u.id,
        }).catch((e) => console.warn("Sync on verify:", e));
      }
      return res;
    },
    [syncViewerMutation]
  );

  const signOut = useCallback(async () => {
    try {
      await insforge.auth.signOut();
    } catch (e) {
      console.error("Sign out error:", e);
    } finally {
      setInsforgeUser(null);
    }
  }, []);

  // Backward-compatible generic signIn for any components calling signIn(provider, params)
  const signIn = useCallback(
    async (provider: string, params?: Record<string, any>) => {
      if (provider === "google") {
        return await signInWithOAuth("google", {
          redirectTo: params?.redirectTo,
        });
      }
      if (provider === "password") {
        if (params?.flow === "signUp") {
          return await signUp(params.email, params.password, params.name);
        }
        return await signInWithPassword(params?.email, params?.password);
      }
      return await insforge.auth.signInWithOAuth(provider, {
        redirectTo:
          params?.redirectTo ||
          (typeof window !== "undefined" ? window.location.origin : "/"),
      });
    },
    [signInWithOAuth, signUp, signInWithPassword]
  );

  const value = useMemo<AuthContextType>(() => {
    const isAuthenticated = Boolean(
      insforgeUser && (viewerData?.user || insforgeUser.email)
    );
    const isLoading =
      isInitializing || (Boolean(insforgeUser) && viewerData === undefined);

    const resolvedUser: FormlyUser | null = viewerData?.user
      ? (viewerData.user as FormlyUser)
      : insforgeUser
      ? {
          _id: insforgeUser.id,
          email: insforgeUser.email,
          name:
            insforgeUser.name ||
            insforgeUser.email?.split("@")[0] ||
            "Formly User",
          role: "owner",
        }
      : null;

    return {
      isLoading,
      isAuthenticated,
      user: resolvedUser,
      currentOrganization:
        (viewerData?.currentOrganization as FormlyOrg) || null,
      currentRole:
        viewerData?.currentRole || (isAuthenticated ? "owner" : null),
      organizations: (viewerData?.organizations as FormlyOrg[]) || [],
      insforgeUser,
      signIn,
      signInWithPassword,
      signUp,
      signInWithOAuth,
      verifyEmail,
      signOut,
    };
  }, [
    isInitializing,
    insforgeUser,
    viewerData,
    signIn,
    signInWithPassword,
    signUp,
    signInWithOAuth,
    verifyEmail,
    signOut,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
