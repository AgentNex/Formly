import React from "react";
import Link from "next/link";
import { FileQuestion, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 mb-4 shadow-xl">
        <FileQuestion className="w-7 h-7 text-zinc-400" />
      </div>
      <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
        404 — Page Not Found
      </h1>
      <p className="text-xs sm:text-sm text-zinc-400 max-w-sm mt-2 leading-relaxed">
        The requested workflow, form route, or resource does not exist or has been moved.
      </p>

      <div className="mt-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-white text-black hover:bg-zinc-200 transition-colors shadow-lg"
        >
          <Home className="w-3.5 h-3.5" />
          <span>Return to Dashboard</span>
        </Link>
      </div>
    </div>
  );
}
