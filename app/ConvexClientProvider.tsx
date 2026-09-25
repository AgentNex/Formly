"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import React, { ReactNode, useMemo } from "react";
import { AuthProvider } from "@/lib/auth";

const rawConvexUrl = process.env.NEXT_PUBLIC_CONVEX_URL?.trim() || "";
const safeConvexUrl =
  rawConvexUrl && !rawConvexUrl.endsWith("formly-enterprise.convex.cloud")
    ? rawConvexUrl
    : "https://formly-enterprise-101.convex.cloud";

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const client = useMemo(() => {
    return new ConvexReactClient(safeConvexUrl);
  }, []);

  return (
    <ConvexProvider client={client}>
      <AuthProvider>{children}</AuthProvider>
    </ConvexProvider>
  );
}
