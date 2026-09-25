"use client";

import { useAuth } from "./auth";

/**
 * Returns current authenticated user ID and readiness status.
 * Backed by genuine Convex Auth.
 * Random browser identities (usr_*) and mock IDs have been purged.
 */
export function useUserId(): { userId: string; isReady: boolean } {
  const { user, isLoading } = useAuth();
  return {
    userId: user?._id || "",
    isReady: !isLoading,
  };
}
