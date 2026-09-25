"use client";

import React, { createContext, useContext, useEffect, useMemo } from "react";
import { useConvexAuth, useAuthActions } from "@convex-dev/auth/react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

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

export interface AuthContextType {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: FormlyUser | null;
  currentOrganization: FormlyOrg | null;
  currentRole: string | null;
  organizations: FormlyOrg[];
  signIn: ReturnType<typeof useAuthActions>["signIn"];
  signOut: ReturnType<typeof useAuthActions>["signOut"];
}

const AuthContext = createContext<AuthContextType>({
  isLoading: true,
  isAuthenticated: false,
  user: null,
  currentOrganization: null,
  currentRole: null,
  organizations: [],
  signIn: async () => ({ signingIn: false }),
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
  const { signIn, signOut } = useAuthActions();

  // Query authenticated viewer profile and organization
  const viewerData = useQuery(api.users.viewer);
  const syncViewerMutation = useMutation(api.users.syncViewer);

  // Sync workspace if authenticated but missing org
  useEffect(() => {
    if (isAuthenticated && viewerData && !viewerData.currentOrganization) {
      syncViewerMutation().catch((err) => {
        console.error("Failed to synchronize user organization:", err);
      });
    }
  }, [isAuthenticated, viewerData, syncViewerMutation]);

  const value = useMemo<AuthContextType>(() => {
    const isLoading = isAuthLoading || (isAuthenticated && viewerData === undefined);
    return {
      isLoading,
      isAuthenticated: Boolean(isAuthenticated && viewerData?.user),
      user: (viewerData?.user as FormlyUser) || null,
      currentOrganization: (viewerData?.currentOrganization as FormlyOrg) || null,
      currentRole: viewerData?.currentRole || null,
      organizations: (viewerData?.organizations as FormlyOrg[]) || [],
      signIn,
      signOut,
    };
  }, [isAuthLoading, isAuthenticated, viewerData, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
