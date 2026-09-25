"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import React, { ReactNode, useMemo, useState, useEffect } from "react";
import { AuthProvider } from "@/lib/auth";

const rawConvexUrl = process.env.NEXT_PUBLIC_CONVEX_URL?.trim() || "";

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const client = useMemo(() => {
    return new ConvexReactClient(
      rawConvexUrl || "https://formly-enterprise.convex.cloud"
    );
  }, []);

  if (!mounted) {
    return <div className="bg-black min-h-screen text-zinc-100">{children}</div>;
  }

  return (
    <ConvexProvider client={client}>
      <AuthProvider>{children}</AuthProvider>
    </ConvexProvider>
  );
}
