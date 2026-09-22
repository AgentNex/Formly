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
} from "lucide-react";

export default function ProjectAnalyticsPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { userId } = useUserId();
  const { project, form } = useFormProject(projectId, userId);
  const { submissions } = useFormAnalytics(project?.formId || "");
  const [selectedSub, setSelectedSub] = useState<SubmissionRecord | null>(null);

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

  const exportCSV = () => {
    if (submissions.length === 0) return;
    const allKeys = Array.from(
      new Set(submissions.flatMap((s) => Object.keys(s.answers || {})))
    );
    const headers = ["Submission ID", "Submitted At", "Duration (s)", ...allKeys];
    const rows = submissions.map((s) => [
      s.id,
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
              {project?.name || "Form"} Analytics
            </h1>
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-[11px] font-mono text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Sync
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400">
            Real-time telemetry and response stream for public link{" "}
            <span className="font-mono text-zinc-300">/f/{project?.slug}</span>
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
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
            <span>Submissions</span>
            <CheckCircle className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
            {totalSubs}
          </div>
          <p className="text-[11px] text-zinc-500">Completed forms submitted</p>
        </div>

        <div className="bg-zinc-950 border border-zinc-800/90 rounded-2xl p-5 space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>Conversion Rate</span>
            <TrendingUp className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
            {conversionRate}%
          </div>
          <p className="text-[11px] text-zinc-500">Completed / Total Visitors</p>
        </div>

        <div className="bg-zinc-950 border border-zinc-800/90 rounded-2xl p-5 space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>Avg. Time</span>
            <Clock className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
            {avgDuration}s
          </div>
          <p className="text-[11px] text-zinc-500">Average time to complete</p>
        </div>
      </div>

      {/* Field Aggregates Section */}
      {Object.keys(fieldStats.counts).length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-zinc-400" />
            <h2 className="text-sm font-semibold text-white tracking-wide uppercase font-mono">
              Field Distribution Breakdown
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(fieldStats.counts).map(([fieldId, valMap]) => {
              const totalAnswers = Object.values(valMap).reduce((a, b) => a + b, 0);
              return (
                <div
                  key={fieldId}
                  className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-zinc-300 font-semibold truncate">
                      {fieldId}
                    </span>
                    <span className="text-[11px] text-zinc-500 font-mono">
                      {totalAnswers} responses
                    </span>
                  </div>

                  <div className="space-y-2">
                    {Object.entries(valMap).map(([opt, count]) => {
                      const pct = Math.round((count / totalAnswers) * 100);
                      return (
                        <div key={opt} className="space-y-1 text-xs">
                          <div className="flex justify-between text-zinc-400">
                            <span className="truncate max-w-[200px]">{opt}</span>
                            <span className="font-mono text-zinc-300">
                              {count} ({pct}%)
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-white rounded-full transition-all duration-300"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Real-time Submissions Feed Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListOrdered className="w-4 h-4 text-zinc-400" />
            <h2 className="text-sm font-semibold text-white tracking-wide uppercase font-mono">
              Submission Stream ({submissions.length})
            </h2>
          </div>
        </div>

        {submissions.length === 0 ? (
          <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-12 text-center text-zinc-500 space-y-2">
            <p className="text-sm font-medium text-zinc-300">No Submissions Yet</p>
            <p className="text-xs max-w-sm mx-auto">
              Share your form link or scan the QR code to submit your first test response.
              Updates appear here in real time.
            </p>
          </div>
        ) : (
          <div className="bg-zinc-950 border border-zinc-800/90 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="bg-zinc-900/70 border-b border-zinc-800 text-[11px] font-mono uppercase text-zinc-400">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Respondent</th>
                    <th className="py-3 px-4 font-semibold">Submitted At</th>
                    <th className="py-3 px-4 font-semibold">Duration</th>
                    <th className="py-3 px-4 font-semibold">Answers Summary</th>
                    <th className="py-3 px-4 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850 divide-zinc-800/60 font-mono">
                  {submissions.map((sub) => {
                    const ansList = Object.entries(sub.answers || {});
                    const summary = ansList
                      .slice(0, 2)
                      .map(([k, v]) => `${k}: ${String(v)}`)
                      .join(" · ");

                    return (
                      <tr
                        key={sub.id}
                        className="hover:bg-zinc-900/50 transition-colors"
                      >
                        <td className="py-3.5 px-4 font-medium text-white">
                          {sub.respondentId}
                        </td>
                        <td className="py-3.5 px-4 text-zinc-400">
                          {new Date(sub.submittedAt).toLocaleTimeString()} ·{" "}
                          {new Date(sub.submittedAt).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4 text-zinc-400">
                          {sub.durationSeconds ? `${sub.durationSeconds}s` : "—"}
                        </td>
                        <td className="py-3.5 px-4 text-zinc-300 truncate max-w-xs">
                          {summary || "No answers recorded"}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setSelectedSub(sub)}
                            className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-colors"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Inspect</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Submission Detail Modal */}
      {selectedSub && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Submission Details
                </h3>
                <span className="text-[11px] text-zinc-500 font-mono">
                  {selectedSub.id} · {new Date(selectedSub.submittedAt).toLocaleString()}
                </span>
              </div>
              <button
                onClick={() => setSelectedSub(null)}
                className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {Object.entries(selectedSub.answers || {}).map(([key, val]) => (
                <div
                  key={key}
                  className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-1"
                >
                  <span className="text-[11px] font-mono uppercase text-zinc-400 block font-semibold">
                    {key}
                  </span>
                  <div className="text-sm text-white">
                    {typeof val === "object" ? JSON.stringify(val) : String(val)}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-zinc-800 pt-3 flex justify-end">
              <button
                onClick={() => setSelectedSub(null)}
                className="text-xs font-semibold px-4 py-2 rounded-lg bg-white text-black hover:bg-zinc-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
