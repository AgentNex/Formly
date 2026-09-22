"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import { usePublicForm } from "@/lib/dataStore";
import { InteractiveFormRunner } from "@/components/form-runtime/InteractiveFormRunner";
import { Loader2, FileQuestion, ShieldCheck } from "lucide-react";

export default function PublicFormPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { form, loading, submitResponse } = usePublicForm(slug);
  const [submitted, setSubmitted] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-zinc-400 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-white" />
        <span className="text-xs font-mono">Loading form...</span>
      </div>
    );
  }

  // If form was deleted or not found or unpublished
  if (!form || !form.isPublished) {
    return (
      <div className="min-h-screen bg-black text-zinc-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 mb-4 shadow-xl">
          <FileQuestion className="w-7 h-7 text-zinc-500" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Form Not Found or Inactive
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-sm mt-2 leading-relaxed">
          This form link or QR code is either inactive, has been deleted by its creator,
          or the address is misspelled.
        </p>
        <div className="mt-6 flex items-center gap-1.5 text-[11px] font-mono text-zinc-600">
          <ShieldCheck className="w-3.5 h-3.5 text-zinc-500" />
          <span>NodeForm Secure Verification</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col justify-between">
      {/* Discreet Branding Header */}
      <header className="h-14 border-b border-zinc-900 px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-white" />
          <span className="text-xs font-semibold text-white tracking-tight">
            {form.title}
          </span>
        </div>
        <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
          Powered by NodeForm
        </span>
      </header>

      {/* Main Form Runner Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <InteractiveFormRunner
          schema={form.compiledSchema}
          isPreview={false}
          onSubmitResponse={async (answers, duration) => {
            await submitResponse(answers, duration);
            setSubmitted(true);
          }}
        />
      </main>

      {/* Footer */}
      <footer className="h-12 border-t border-zinc-900 px-6 flex items-center justify-center text-[11px] font-mono text-zinc-600">
        <span>Confidential & Secure Submission</span>
      </footer>
    </div>
  );
}
