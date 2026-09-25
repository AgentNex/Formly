"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import {
  User,
  Building2,
  Shield,
  LogOut,
  ChevronDown,
  LayoutDashboard,
  Sparkles,
} from "lucide-react";

export function UserNav() {
  const router = useRouter();
  const { user, currentOrganization, currentRole, signOut, isAuthenticated, isLoading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (isLoading) {
    return (
      <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 animate-pulse" />
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/signin"
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors"
        >
          Sign In
        </Link>
        <Link
          href="/signup"
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-black hover:bg-zinc-200 transition-colors"
        >
          Get Started
        </Link>
      </div>
    );
  }

  const displayName = user.name || user.email?.split("@")[0] || "User";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleSignOut = async () => {
    setIsOpen(false);
    await signOut();
    router.replace("/signin");
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1.5 rounded-lg border border-zinc-800 bg-zinc-950 hover:bg-zinc-900/80 hover:border-zinc-700 transition-all text-left group"
        aria-expanded={isOpen}
      >
        <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-white tracking-wide shrink-0">
          {initials}
        </div>
        <div className="hidden sm:block text-left pr-1">
          <div className="text-xs font-semibold text-zinc-200 group-hover:text-white transition-colors leading-tight truncate max-w-[120px]">
            {displayName}
          </div>
          <div className="text-[10px] text-zinc-400 font-mono flex items-center gap-1">
            <span className="truncate max-w-[100px]">
              {currentOrganization?.name || "Workspace"}
            </span>
          </div>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-200 transition-colors" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl bg-zinc-950 border border-zinc-800 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
          {/* User & Org info header */}
          <div className="px-3 py-2.5 rounded-lg bg-zinc-900/50 border border-zinc-800/80 mb-2">
            <div className="font-semibold text-sm text-white truncate">
              {displayName}
            </div>
            <div className="text-xs text-zinc-400 truncate mt-0.5">
              {user.email}
            </div>
            <div className="mt-2.5 pt-2 border-t border-zinc-800/60 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-zinc-300 truncate">
                <Building2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span className="truncate">{currentOrganization?.name || "Personal Workspace"}</span>
              </div>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono uppercase font-bold tracking-wider bg-zinc-800 text-zinc-300 border border-zinc-700">
                {currentRole || "Owner"}
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="space-y-1">
            <Link
              href="/"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors"
            >
              <LayoutDashboard className="w-4 h-4 text-zinc-400" />
              <span>Workspace Dashboard</span>
            </Link>
          </div>

          <div className="my-1.5 border-t border-zinc-800/80"></div>

          {/* Sign Out Action */}
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded-lg transition-colors text-left"
          >
            <LogOut className="w-4 h-4 text-red-400" />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
}
