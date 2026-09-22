"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUserId } from "@/lib/user";
import { useFormProject, useProjects } from "@/lib/dataStore";
import { QRCodeDisplay } from "@/components/common/QRCodeDisplay";
import {
  ExternalLink,
  Copy,
  Check,
  Trash2,
  AlertTriangle,
  Radio,
  Eye,
} from "lucide-react";

export default function ProjectSharePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const { userId } = useUserId();
  const { project, form, togglePublish } = useFormProject(projectId, userId);
  const { deleteProject } = useProjects(userId);

  const [copied, setCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const publicUrl = project ? `${origin}/f/${project.slug}` : "";

  const handleCopy = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleDelete = () => {
    deleteProject(projectId);
    router.push("/");
  };

  return (
    <div className="h-full w-full bg-black text-zinc-100 overflow-y-auto p-6 sm:p-10 space-y-8">
      {/* Top Header */}
      <div className="border-b border-zinc-800 pb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Share & Distribution
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1">
          Distribute your custom workflow form via public hosted link or scannable vector QR code.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left Column: Link & QR Code */}
        <div className="space-y-6">
          {/* Public Hosted Link Box */}
          <div className="bg-zinc-950 border border-zinc-800/90 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-zinc-400 font-semibold tracking-wider">
                Hosted Public URL
              </span>
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                <span>Active & Hosted</span>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl p-2 font-mono text-xs">
              <input
                type="text"
                readOnly
                value={publicUrl}
                className="bg-transparent border-none text-zinc-300 focus:outline-none flex-1 px-2 select-all truncate"
              />
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-black hover:bg-zinc-200 transition-colors font-sans text-xs font-semibold shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-300 hover:text-white transition-colors"
              >
                <span>Open in New Tab</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <span className="text-zinc-700">·</span>
              <button
                onClick={() => router.push(`/project/${projectId}/preview`)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Test in Preview Mode</span>
              </button>
            </div>
          </div>

          {/* Publishing Controls */}
          <div className="bg-zinc-950 border border-zinc-800/90 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Form Visibility</h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  When paused, respondents opening the link see a polite "Under Maintenance" screen.
                </p>
              </div>
              <button
                onClick={() => togglePublish(!form?.isPublished)}
                className={`text-xs font-semibold px-4 py-2 rounded-lg transition-colors border ${
                  form?.isPublished
                    ? "bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-800"
                    : "bg-white border-white text-black hover:bg-zinc-200"
                }`}
              >
                {form?.isPublished ? "Pause Accepting Responses" : "Resume Form"}
              </button>
            </div>
          </div>

          {/* Danger Zone: Permanent Deletion */}
          <div className="bg-red-950/20 border border-red-900/30 rounded-2xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-red-200">
                  Delete Form & Hosted Link
                </h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Permanently deletes this project, the workflow graph, and all associated
                  submissions. Once deleted, the hosted link and QR code will immediately become
                  invalid (404 Not Found).
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg bg-red-900/40 hover:bg-red-900/60 border border-red-800 text-red-300 hover:text-red-200 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Project Permanently</span>
            </button>
          </div>
        </div>

        {/* Right Column: High-Res Monochromatic QR Code */}
        <div className="flex flex-col items-center">
          <QRCodeDisplay
            url={publicUrl}
            title={project?.name || "Form"}
            size={240}
          />
        </div>
      </div>

      {/* Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2.5 text-red-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-sm font-bold text-white">Delete This Form Project?</h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              This action cannot be undone. All responses, analytics, the public URL{" "}
              <span className="font-mono text-zinc-200">/f/{project?.slug}</span> and its QR code
              will be permanently erased.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="text-xs font-medium px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="text-xs font-semibold px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors"
              >
                Yes, Delete Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
