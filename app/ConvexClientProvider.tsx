"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import React, { ReactNode, useMemo } from "react";
import { AuthProvider } from "@/lib/auth";

const rawConvexUrl = process.env.NEXT_PUBLIC_CONVEX_URL?.trim() || "";

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const client = useMemo(() => {
    return new ConvexReactClient(
      rawConvexUrl || "https://formly-enterprise.convex.cloud"
    );
  }, []);

  return (
    <ConvexProvider client={client}>
      <AuthProvider>{children}</AuthProvider>
    </ConvexProvider>
  );
}
