"use client";

export const dynamic = "force-dynamic";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUserId } from "@/lib/user";
import { useProjects, ProjectRecord } from "@/lib/dataStore";
import {
  Plus,
  Workflow,
  BarChart3,
  Copy,
  Check,
  Trash2,
  ExternalLink,
  Layers,
  ArrowRight,
  TrendingUp,
  Users,
  CheckCircle2,
  Sparkles,
  Search,
  Share2,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import { UserNav } from "@/components/UserNav";
import { AuthGuard } from "@/components/AuthGuard";

export default function DashboardPage() {
  const router = useRouter();
  const { userId, isReady } = useUserId();
  const { projects, loading, createProject, deleteProject } = useProjects(userId);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<"blank" | "feedback" | "lead_gen">("feedback");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filtered projects
  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const q = searchQuery.toLowerCase().trim();
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        p.slug.toLowerCase().includes(q)
    );
  }, [projects, searchQuery]);

  // Aggregate stats
  const totalProjects = projects.length;
  const totalViews = projects.reduce((acc, p) => acc + (p.viewCount || 0), 0);
  const totalSubs = projects.reduce((acc, p) => acc + (p.submissionCount || 0), 0);
  const avgConversion =
    totalViews > 0 ? Math.round((totalSubs / totalViews) * 100) : 0;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const proj = await createProject(newTitle, newDesc);
    setIsCreateOpen(false);
    setNewTitle("");
    setNewDesc("");
    router.push(`/project/${proj.id}`);
  };

  const handleCopyLink = async (p: ProjectRecord) => {
    const url = `${window.location.origin}/f/${p.slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(p.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Ignore
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-black text-zinc-100 flex flex-col">
        {/* Top Main Navigation */}
        <header className="h-16 border-b border-zinc-800 bg-zinc-950 px-6 sm:px-12 flex items-center justify-between sticky top-0 z-20 backdrop-blur">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white text-black flex items-center justify-center font-black">
                <Workflow className="w-4 h-4" />
              </div>
              <div>
                <span className="text-sm font-bold tracking-tight text-white block">
                  Formly
                </span>
                <span className="text-[10px] font-mono text-zinc-500 block">
                  Enterprise Workflow Builder
                </span>
              </div>
            </div>
          </div>

          {/* User Identity & New Project Action */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-white text-black hover:bg-zinc-200 transition-all shadow-sm active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>New Form Project</span>
            </button>

            <UserNav />
          </div>
        </header>

      {/* Hero & Aggregate Stats */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 sm:p-12 space-y-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Workflow Workspace
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-xl leading-relaxed">
              Design intelligent branching forms with DAG compilation, real-time telemetry,
              and scannable QR deployment.
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-zinc-500" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors"
            />
          </div>
        </div>

        {/* Aggregate KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-5 space-y-1">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
              <span>Active Workflows</span>
              <Layers className="w-4 h-4 text-zinc-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
              {totalProjects}
            </div>
            <p className="text-[11px] text-zinc-500">Dedicated DAG graphs</p>
          </div>

          <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-5 space-y-1">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
              <span>Total Visitors</span>
              <Users className="w-4 h-4 text-zinc-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
              {totalViews}
            </div>
            <p className="text-[11px] text-zinc-500">Across all published forms</p>
          </div>

          <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-5 space-y-1">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
              <span>Submissions</span>
              <CheckCircle2 className="w-4 h-4 text-zinc-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
              {totalSubs}
            </div>
            <p className="text-[11px] text-zinc-500">Validated durable responses</p>
          </div>

          <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-5 space-y-1">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
              <span>Avg Conversion</span>
              <TrendingUp className="w-4 h-4 text-zinc-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
              {avgConversion}%
            </div>
            <p className="text-[11px] text-zinc-500">Global completion rate</p>
          </div>
        </div>

        {/* Projects List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 font-mono">
              Forms & Workflows ({filteredProjects.length})
            </h2>
          </div>

          {loading ? (
            <div className="p-12 text-center text-zinc-500 font-mono text-xs">
              Loading projects...
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-12 text-center space-y-4">
              <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-400">
                <Workflow className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">No Projects Match</h3>
                <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                  {searchQuery ? "No form projects match your search query." : "Get started by launching your first workflow."}
                </p>
              </div>
              <button
                onClick={() => setIsCreateOpen(true)}
                className="text-xs font-semibold px-4 py-2 rounded-xl bg-white text-black hover:bg-zinc-200 transition-colors"
              >
                Create First Form
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((proj) => (
                <div
                  key={proj.id}
                  className="bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-6 flex flex-col justify-between transition-all duration-200 shadow-lg hover:shadow-xl group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <Link
                          href={`/project/${proj.id}`}
                          className="text-base font-semibold text-white hover:underline block tracking-tight"
                        >
                          {proj.name}
                        </Link>
                        {proj.description && (
                          <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                            {proj.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 shrink-0">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            proj.isPublished ? "bg-white" : "bg-zinc-600"
                          }`}
                        />
                        <span>{proj.isPublished ? "Active" : "Draft"}</span>
                      </div>
                    </div>

                    {/* Stats pills */}
                    <div className="grid grid-cols-3 gap-2 py-2 border-y border-zinc-900 text-center font-mono">
                      <div>
                        <span className="text-[10px] text-zinc-500 uppercase block">Views</span>
                        <span className="text-xs font-bold text-white">{proj.viewCount}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 uppercase block">Subs</span>
                        <span className="text-xs font-bold text-white">{proj.submissionCount}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 uppercase block">Rate</span>
                        <span className="text-xs font-bold text-white">{proj.conversionRate}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="pt-4 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/project/${proj.id}`}
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-700/80 transition-colors"
                      >
                        <Workflow className="w-3.5 h-3.5" />
                        <span>Editor</span>
                      </Link>

                      <Link
                        href={`/project/${proj.id}/analytics`}
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-colors"
                        title="View Real-time Analytics"
                      >
                        <BarChart3 className="w-3.5 h-3.5" />
                      </Link>

                      <Link
                        href={`/project/${proj.id}/share`}
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-colors"
                        title="Share & QR Code Hub"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                      </Link>

                      <button
                        onClick={() => handleCopyLink(proj)}
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-colors"
                        title="Copy Public Link"
                      >
                        {copiedId === proj.id ? (
                          <Check className="w-3.5 h-3.5 text-white" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    <button
                      onClick={() => deleteProject(proj.id)}
                      className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-zinc-900 transition-colors"
                      title="Delete Project"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* New Project Modal with Enterprise Templates */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Create New Form Project</h3>
              <p className="text-xs text-zinc-400">
                Deploy an interactive workflow canvas with pre-built DAG logic and validation.
              </p>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Workflow Name
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  placeholder="e.g. Executive Feedback or Partner Onboarding"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief description of the workflow purpose..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-zinc-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Starter Template
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTemplate("feedback")}
                    className={`text-left p-3 rounded-xl border text-xs transition-colors ${
                      selectedTemplate === "feedback"
                        ? "bg-white text-black border-white font-medium"
                        : "bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    <div className="font-semibold">NPS & Satisfaction</div>
                    <div className={`text-[10px] mt-0.5 ${selectedTemplate === "feedback" ? "text-zinc-600" : "text-zinc-500"}`}>
                      Conditional branch + NPS scale
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedTemplate("blank")}
                    className={`text-left p-3 rounded-xl border text-xs transition-colors ${
                      selectedTemplate === "blank"
                        ? "bg-white text-black border-white font-medium"
                        : "bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    <div className="font-semibold">Blank Canvas</div>
                    <div className={`text-[10px] mt-0.5 ${selectedTemplate === "blank" ? "text-zinc-600" : "text-zinc-500"}`}>
                      Start with empty entry & completion
                    </div>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="text-xs font-medium px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="text-xs font-semibold px-5 py-2 rounded-lg bg-white text-black hover:bg-zinc-200 transition-colors shadow-sm"
                >
                  Create & Launch Editor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </AuthGuard>
  );
}
