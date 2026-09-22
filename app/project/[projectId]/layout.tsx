"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import {
  ArrowLeft,
  Workflow,
  Eye,
  BarChart3,
  Share2,
} from "lucide-react";
import { useUserId } from "@/lib/user";
import { useFormProject } from "@/lib/dataStore";

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const params = useParams();
  const projectId = params.projectId as string;
  const { userId } = useUserId();
  const { project } = useFormProject(projectId, userId);

  const tabs = [
    {
      label: "Canvas Editor",
      href: `/project/${projectId}`,
      icon: <Workflow className="w-4 h-4" />,
      exact: true,
    },
    {
      label: "Live Preview",
      href: `/project/${projectId}/preview`,
      icon: <Eye className="w-4 h-4" />,
    },
    {
      label: "Real-time Analytics",
      href: `/project/${projectId}/analytics`,
      icon: <BarChart3 className="w-4 h-4" />,
    },
    {
      label: "Share & QR",
      href: `/project/${projectId}/share`,
      icon: <Share2 className="w-4 h-4" />,
    },
  ];

  return (
    <div className="flex flex-col h-screen w-screen bg-black text-zinc-100 overflow-hidden">
      {/* Top Project Subnav */}
      <header className="h-13 bg-zinc-950 border-b border-zinc-800/80 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors py-1 px-2 rounded-lg hover:bg-zinc-900 border border-transparent hover:border-zinc-800"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </Link>

          <div className="h-4 w-px bg-zinc-800" />

          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white tracking-tight">
              {project?.name || "Project Workflow"}
            </span>
            {project && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400">
                /f/{project.slug}
              </span>
            )}
          </div>
        </div>

        {/* Center Tabs */}
        <nav className="flex items-center gap-1">
          {tabs.map((tab) => {
            const isActive = tab.exact
              ? pathname === tab.href
              : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? "bg-zinc-800 text-white shadow-sm border border-zinc-700/60"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 border border-transparent"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User indicator */}
        <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="hidden sm:inline">Real-time Sync</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative">{children}</main>
    </div>
  );
}
