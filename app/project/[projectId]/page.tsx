"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { FlowCanvas } from "@/components/flow/FlowCanvas";
import { useUserId } from "@/lib/user";
import { useFormProject } from "@/lib/dataStore";
import { Loader2 } from "lucide-react";

export default function ProjectEditorPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const { userId, isReady } = useUserId();
  const { project, form, loading, saveForm, togglePublish } = useFormProject(
    projectId,
    userId
  );

  if (!isReady || loading) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center bg-black text-zinc-400 gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-white" />
        <span className="text-xs font-mono">Loading flow canvas...</span>
      </div>
    );
  }

  if (!project || !form) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center bg-black text-zinc-400 gap-3 p-6 text-center">
        <h2 className="text-base font-semibold text-white">Project Not Found</h2>
        <p className="text-xs text-zinc-500 max-w-sm">
          This project may have been deleted or the ID is incorrect.
        </p>
        <button
          onClick={() => router.push("/")}
          className="text-xs font-semibold px-4 py-2 rounded-lg bg-white text-black hover:bg-zinc-200 transition-colors"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <FlowCanvas
        initialNodes={form.nodes}
        initialEdges={form.edges}
        formTitle={form.title}
        formDescription={form.description}
        isPublished={form.isPublished}
        onSave={async (title, nodes, edges, compiledSchema) => {
          await saveForm(title, nodes, edges, compiledSchema);
        }}
        onTogglePublish={async (pub) => {
          await togglePublish(pub);
        }}
        onOpenPreview={() => {
          router.push(`/project/${projectId}/preview`);
        }}
        onOpenShare={() => {
          router.push(`/project/${projectId}/share`);
        }}
      />
    </div>
  );
}
