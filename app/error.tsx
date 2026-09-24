"use client";

import React, { useEffect } from "react";
import { AlertCircle, RotateCcw, Home } from "lucide-react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Formly runtime application error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-red-950/40 border border-red-900/60 flex items-center justify-center text-red-400 mb-4 shadow-2xl">
        <AlertCircle className="w-7 h-7" />
      </div>
      <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
        Unexpected Application Error
      </h1>
      <p className="text-xs sm:text-sm text-zinc-400 max-w-md mt-2 leading-relaxed font-mono">
        {error.message || "An unexpected error occurred in the Formly runtime."}
      </p>

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={() => reset()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-white text-black hover:bg-zinc-200 transition-colors shadow-lg"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Try Again</span>
        </button>

        <Link
          href="/"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white transition-colors"
        >
          <Home className="w-3.5 h-3.5" />
          <span>Return to Dashboard</span>
        </Link>
      </div>
    </div>
  );
}
