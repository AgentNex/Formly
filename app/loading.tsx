"use client";

import React from "react";
import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-screen bg-black text-zinc-400 flex flex-col items-center justify-center gap-3">
      <div className="w-10 h-10 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-white" />
      </div>
      <span className="text-xs font-mono uppercase tracking-wider text-zinc-500">
        Loading Formly Workspace...
      </span>
    </div>
  );
}
