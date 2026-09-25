"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Loader2 } from "lucide-react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const redirectUrl =
        pathname === "/"
          ? "/signin"
          : `/signin?redirect=${encodeURIComponent(pathname)}`;
      router.replace(redirectUrl);
    }
  }, [isLoading, isAuthenticated, router, pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-zinc-400 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
        <span className="text-xs font-mono uppercase tracking-wider text-zinc-500">
          Verifying authorization...
        </span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black text-zinc-400 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
        <span className="text-xs font-mono uppercase tracking-wider text-zinc-500">
          Redirecting to sign in...
        </span>
      </div>
    );
  }

  return <>{children}</>;
}
