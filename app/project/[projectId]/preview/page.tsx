"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUserId } from "@/lib/user";
import { useFormProject } from "@/lib/dataStore";
import { InteractiveFormRunner } from "@/components/form-runtime/InteractiveFormRunner";
import { Loader2, ArrowLeft, RefreshCw, Smartphone, Monitor } from "lucide-react";

export default function ProjectPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const { userId, isReady } = useUserId();
  const { project, form, loading } = useFormProject(projectId, userId);
  const [deviceMode, setDeviceMode] = useState<"desktop" | "mobile">("desktop");
  const [resetKey, setResetKey] = useState(0);

  if (!isReady || loading) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center bg-black text-zinc-400 gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-white" />
        <span className="text-xs font-mono">Loading form preview...</span>
      </div>
    );
  }

  if (!project || !form) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center bg-black text-zinc-400 gap-3 p-6 text-center">
        <p className="text-sm">Project or form not found.</p>
        <button
          onClick={() => router.push("/")}
          className="text-xs font-medium px-4 py-2 rounded-lg bg-zinc-800 text-white"
        >
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-zinc-950 flex flex-col overflow-hidden">
      {/* Subheader Toolbar */}
      <div className="h-12 border-b border-zinc-800 px-6 flex items-center justify-between bg-black/60 backdrop-blur shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push(`/project/${projectId}`)}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Canvas Editor</span>
          </button>
          <span className="text-zinc-700">/</span>
          <span className="text-xs font-medium text-white">Interactive Preview</span>
        </div>

        {/* Device Switcher & Reset */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
            <button
              onClick={() => setDeviceMode("desktop")}
              className={`p-1.5 rounded-md text-xs transition-colors ${
                deviceMode === "desktop"
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
              title="Desktop View"
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setDeviceMode("mobile")}
              className={`p-1.5 rounded-md text-xs transition-colors ${
                deviceMode === "mobile"
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
              title="Mobile Device Simulation"
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => setResetKey((k) => k + 1)}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Restart</span>
          </button>
        </div>
      </div>

      {/* Preview Container */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex items-center justify-center bg-black/80">
        <div
          className={`transition-all duration-300 w-full ${
            deviceMode === "mobile"
              ? "max-w-sm border border-zinc-800 rounded-3xl p-4 bg-black shadow-2xl min-h-[640px]"
              : "max-w-2xl bg-black border border-zinc-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl"
          }`}
        >
          <InteractiveFormRunner
            key={resetKey}
            schema={form.compiledSchema}
            isPreview={true}
            onRestartPreview={() => setResetKey((k) => k + 1)}
          />
        </div>
      </div>
    </div>
  );
}
