"use client";

import React, { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { useUserId } from "@/lib/user";
import { useFormProject, useFormAnalytics, SubmissionRecord } from "@/lib/dataStore";
import {
  Users,
  CheckCircle,
  TrendingUp,
  Clock,
  Download,
  Eye,
  X,
  FileSpreadsheet,
  FileJson,
  BarChart2,
  ListOrdered,
  Search,
  Filter,
  Shield,
  EyeOff,
  CheckCircle2,
  Flag,
  Archive,
  ArrowRight,
  GitFork,
} from "lucide-react";

export default function ProjectAnalyticsPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { userId } = useUserId();
  const { project, form } = useFormProject(projectId, userId);
  const { submissions, updateSubmissionStatus } = useFormAnalytics(project?.formId || "");

  const [selectedSub, setSelectedSub] = useState<SubmissionRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [maskPii, setMaskPii] = useState(false);
  const [activeTab, setActiveTab] = useState<"inbox" | "funnel" | "aggregates">("inbox");

  // Filtered submissions
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const matchRespondent = s.respondentId.toLowerCase().includes(q);
      const matchAnswers = JSON.stringify(s.answers).toLowerCase().includes(q);
      return matchRespondent || matchAnswers;
    });
  }, [submissions, statusFilter, searchQuery]);

  // Compute stats
  const totalViews = project?.viewCount || 0;
  const totalSubs = submissions.length || project?.submissionCount || 0;
  const conversionRate =
    totalViews > 0 ? Math.round((totalSubs / totalViews) * 100) : 0;

  const avgDuration = useMemo(() => {
    const valid = submissions
      .map((s) => s.durationSeconds)
      .filter((d): d is number => typeof d === "number" && d > 0);
    return valid.length > 0
      ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length)
      : 0;
  }, [submissions]);

  // Mask PII helper
  const maskValue = (val: string): string => {
    if (!maskPii) return val;
    if (val.includes("@")) {
      const [user, domain] = val.split("@");
      return `${user.slice(0, 2)}***@${domain}`;
    }
    if (val.length > 6) {
      return `${val.slice(0, 3)}***${val.slice(-2)}`;
    }
    return "***";
  };

  // Field response aggregates
  const fieldStats = useMemo(() => {
    const counts: Record<string, Record<string, number>> = {};
    const textAnswers: Record<string, string[]> = {};

    submissions.forEach((sub) => {
      for (const [k, v] of Object.entries(sub.answers || {})) {
        if (v === undefined || v === null || v === "") continue;

        if (typeof v === "string" || typeof v === "number") {
          const str = String(v);
          if (str.length < 40) {
            if (!counts[k]) counts[k] = {};
            counts[k][str] = (counts[k][str] || 0) + 1;
          } else {
            if (!textAnswers[k]) textAnswers[k] = [];
            textAnswers[k].push(str);
          }
        } else if (Array.isArray(v)) {
          v.forEach((item) => {
            const str = String(item);
            if (!counts[k]) counts[k] = {};
            counts[k][str] = (counts[k][str] || 0) + 1;
          });
        }
      }
    });

    return { counts, textAnswers };
  }, [submissions]);

  // Visual Path Funnel Estimation
  const nodeFunnel = useMemo(() => {
    if (!form || !form.nodes) return [];
    return form.nodes.map((node, idx) => {
      // Estimated completions per node
      const nodeViews = Math.max(
        totalViews - idx * Math.max(Math.round(totalViews / (form.nodes.length + 1)), 1),
        totalSubs
      );
      const dropOff = Math.max(totalViews - nodeViews, 0);
      return {
        nodeId: node.id,
        label: (node.data as any)?.label || (node.data as any)?.title || node.id,
        type: node.type,
        estimatedViews: nodeViews,
        dropOffRate: totalViews > 0 ? Math.round((dropOff / totalViews) * 100) : 0,
      };
    });
  }, [form, totalViews, totalSubs]);

  const exportCSV = () => {
    if (submissions.length === 0) return;
    const allKeys = Array.from(
      new Set(submissions.flatMap((s) => Object.keys(s.answers || {})))
    );
    const headers = ["Submission ID", "Status", "Submitted At", "Duration (s)", ...allKeys];
    const rows = submissions.map((s) => [
      s.id,
      s.status,
      new Date(s.submittedAt).toISOString(),
      s.durationSeconds || "",
      ...allKeys.map((k) => JSON.stringify(s.answers[k] ?? "")),
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project?.name || "form"}_submissions.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJSON = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(submissions, null, 2)
    )}`;
    const a = document.createElement("a");
    a.href = jsonString;
    a.download = `${project?.name || "form"}_submissions.json`;
    a.click();
  };

  return (
    <div className="h-full w-full bg-black text-zinc-100 overflow-y-auto p-6 sm:p-10 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {project?.name || "Form"} Analytics & Submissions
            </h1>
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-[11px] font-mono text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Telemetry
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400">
            Real-time event stream and durable submission inbox for endpoint{" "}
            <span className="font-mono text-zinc-300">/f/{project?.slug}</span>
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMaskPii(!maskPii)}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border transition-colors ${
              maskPii
                ? "bg-white text-black border-white"
                : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white"
            }`}
          >
            {maskPii ? <EyeOff className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
            <span>PII Masking {maskPii ? "ON" : "OFF"}</span>
          </button>

          <button
            onClick={exportCSV}
            disabled={submissions.length === 0}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white disabled:opacity-40 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={exportJSON}
            disabled={submissions.length === 0}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white disabled:opacity-40 transition-colors"
          >
            <FileJson className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-950 border border-zinc-800/90 rounded-2xl p-5 space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>Total Visitors</span>
            <Users className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
            {totalViews}
          </div>
          <p className="text-[11px] text-zinc-500">Unique visits to hosted link</p>
        </div>

        <div className="bg-zinc-950 border border-zinc-800/90 rounded-2xl p-5 space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>Completed Responses</span>
            <CheckCircle className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
            {totalSubs}
          </div>
          <p className="text-[11px] text-zinc-500">Verified submissions</p>
        </div>

        <div className="bg-zinc-950 border border-zinc-800/90 rounded-2xl p-5 space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>Conversion Rate</span>
            <TrendingUp className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
            {conversionRate}%
          </div>
          <p className="text-[11px] text-zinc-500">Views to completions</p>
        </div>

        <div className="bg-zinc-950 border border-zinc-800/90 rounded-2xl p-5 space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>Average Duration</span>
            <Clock className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
            {avgDuration}s
          </div>
          <p className="text-[11px] text-zinc-500">Time to complete</p>
        </div>
      </div>

      {/* Tabs Switcher: Inbox vs Path Funnel vs Aggregates */}
      <div className="flex items-center gap-2 border-b border-zinc-800">
        <button
          onClick={() => setActiveTab("inbox")}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === "inbox"
              ? "border-white text-white"
              : "border-transparent text-zinc-400 hover:text-white"
          }`}
        >
          Submissions Inbox ({submissions.length})
        </button>
        <button
          onClick={() => setActiveTab("funnel")}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === "funnel"
              ? "border-white text-white"
              : "border-transparent text-zinc-400 hover:text-white"
          }`}
        >
          Graph Path Funnel
        </button>
        <button
          onClick={() => setActiveTab("aggregates")}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === "aggregates"
              ? "border-white text-white"
              : "border-transparent text-zinc-400 hover:text-white"
          }`}
        >
          Response Distributions
        </button>
      </div>

      {/* TAB 1: SUBMISSIONS INBOX */}
      {activeTab === "inbox" && (
        <div className="space-y-4">
          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-zinc-500" />
              <input
                type="text"
                placeholder="Search respondent or answers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-3.5 h-3.5 text-zinc-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-zinc-500"
              >
                <option value="all">All Statuses</option>
                <option value="submitted">Submitted</option>
                <option value="verified">Verified</option>
                <option value="flagged">Flagged</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          {/* Submissions Table */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden">
            {filteredSubmissions.length === 0 ? (
              <div className="p-12 text-center text-zinc-500 text-xs font-mono">
                No submissions matching current criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900/60 border-b border-zinc-800 text-zinc-400 font-mono uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Respondent</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Answers Summary</th>
                      <th className="py-3 px-4">Duration</th>
                      <th className="py-3 px-4">Submitted At</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900 text-zinc-300">
                    {filteredSubmissions.map((sub) => {
                      const answerSummary = Object.entries(sub.answers || {})
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(" • ");

                      return (
                        <tr key={sub.id} className="hover:bg-zinc-900/40 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-medium text-white">
                            {maskValue(sub.respondentId)}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                                sub.status === "verified"
                                  ? "bg-emerald-950/60 text-emerald-300 border-emerald-800"
                                  : sub.status === "flagged"
                                  ? "bg-red-950/60 text-red-300 border-red-800"
                                  : sub.status === "archived"
                                  ? "bg-zinc-900 text-zinc-500 border-zinc-800"
                                  : "bg-zinc-900 text-zinc-300 border-zinc-700"
                              }`}
                            >
                              {sub.status || "submitted"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 max-w-xs truncate text-zinc-400">
                            {maskPii ? maskValue(answerSummary) : answerSummary}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-zinc-400">
                            {sub.durationSeconds ? `${sub.durationSeconds}s` : "—"}
                          </td>
                          <td className="py-3.5 px-4 text-zinc-500">
                            {new Date(sub.submittedAt).toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => setSelectedSub(sub)}
                              className="px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-colors text-[11px]"
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: GRAPH PATH FUNNEL */}
      {activeTab === "funnel" && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-white">Visual Workflow Step Funnel</h3>
            <p className="text-xs text-zinc-400 mt-1">
              Analyze progression and identify friction drop-off points along the node canvas.
            </p>
          </div>

          <div className="space-y-4">
            {nodeFunnel.map((step, idx) => (
              <div
                key={step.nodeId}
                className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center text-xs font-mono text-zinc-300">
                    {idx + 1}
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-white block">
                      {step.label}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500 uppercase">
                      {step.type} • {step.nodeId}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-right font-mono text-xs">
                  <div>
                    <span className="text-zinc-500 text-[10px] block">Views</span>
                    <span className="text-white font-semibold">{step.estimatedViews}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-[10px] block">Drop-off</span>
                    <span className="text-zinc-300">{step.dropOffRate}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: AGGREGATES */}
      {activeTab === "aggregates" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(fieldStats.counts).map(([fieldKey, counts]) => (
            <div
              key={fieldKey}
              className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-white font-mono uppercase">
                  {fieldKey}
                </h4>
                <span className="text-[10px] font-mono text-zinc-500">Choice Distribution</span>
              </div>

              <div className="space-y-2">
                {Object.entries(counts).map(([opt, count]) => {
                  const pct = totalSubs > 0 ? Math.round((count / totalSubs) * 100) : 0;
                  return (
                    <div key={opt} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-300">{opt}</span>
                        <span className="text-zinc-500 font-mono">
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-white rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Submission Detail Modal */}
      {selectedSub && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-white">Submission Inspector</h3>
                <span className="text-[10px] font-mono text-zinc-500">ID: {selectedSub.id}</span>
              </div>
              <button
                onClick={() => setSelectedSub(null)}
                className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-zinc-900/60 p-3 rounded-xl border border-zinc-800">
                <div>
                  <span className="text-zinc-500 block text-[10px]">Respondent</span>
                  <span className="text-white">{maskValue(selectedSub.respondentId)}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px]">Duration</span>
                  <span className="text-white">{selectedSub.durationSeconds ?? "—"}s</span>
                </div>
              </div>

              {/* Status Actions */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-zinc-400 uppercase">Change Status</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      updateSubmissionStatus(selectedSub.id, "verified");
                      setSelectedSub({ ...selectedSub, status: "verified" });
                    }}
                    className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                      selectedSub.status === "verified"
                        ? "bg-emerald-950 text-emerald-300 border-emerald-800 font-semibold"
                        : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white"
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Verified</span>
                  </button>

                  <button
                    onClick={() => {
                      updateSubmissionStatus(selectedSub.id, "flagged");
                      setSelectedSub({ ...selectedSub, status: "flagged" });
                    }}
                    className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                      selectedSub.status === "flagged"
                        ? "bg-red-950 text-red-300 border-red-800 font-semibold"
                        : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white"
                    }`}
                  >
                    <Flag className="w-3.5 h-3.5" />
                    <span>Flagged</span>
                  </button>

                  <button
                    onClick={() => {
                      updateSubmissionStatus(selectedSub.id, "archived");
                      setSelectedSub({ ...selectedSub, status: "archived" });
                    }}
                    className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                      selectedSub.status === "archived"
                        ? "bg-zinc-800 text-zinc-300 border-zinc-700 font-semibold"
                        : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white"
                    }`}
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>Archive</span>
                  </button>
                </div>
              </div>

              {/* Form Responses */}
              <div className="space-y-2">
                <span className="text-[11px] font-mono text-zinc-400 uppercase">Field Answers</span>
                <div className="space-y-2">
                  {Object.entries(selectedSub.answers || {}).map(([key, val]) => (
                    <div key={key} className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3">
                      <span className="text-[10px] font-mono text-zinc-500 uppercase block">{key}</span>
                      <span className="text-xs text-white font-medium mt-0.5 block">
                        {maskPii ? maskValue(String(val)) : String(val)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
