"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import React, { ReactNode, useMemo, useState, useEffect } from "react";

const convexUrl =
  process.env.NEXT_PUBLIC_CONVEX_URL || "https://omnisync-core.convex.cloud";

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const client = useMemo(() => {
    try {
      return new ConvexReactClient(convexUrl, {
        reportLoaderErrors: false,
      });
    } catch {
      return null;
    }
  }, []);

  if (!mounted) {
    return <div className="bg-black min-h-screen text-zinc-100">{children}</div>;
  }

  if (client) {
    return <ConvexProvider client={client}>{children}</ConvexProvider>;
  }

  return <>{children}</>;
}
