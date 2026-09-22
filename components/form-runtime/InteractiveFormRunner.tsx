"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  CompiledFormSchema,
  CompiledStep,
  FieldOption,
} from "@/lib/types/flow";
import { getNextStep } from "@/lib/flowCompiler";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Star,
  RotateCcw,
  Check,
  AlertCircle,
} from "lucide-react";

interface InteractiveFormRunnerProps {
  schema: CompiledFormSchema;
  isPreview?: boolean;
  onSubmitResponse?: (
    answers: Record<string, unknown>,
    durationSeconds: number
  ) => Promise<void>;
  onRestartPreview?: () => void;
}

export function InteractiveFormRunner({
  schema,
  isPreview = false,
  onSubmitResponse,
  onRestartPreview,
}: InteractiveFormRunnerProps) {
  const startTimeRef = useRef<number>(Date.now());
  const [currentStepId, setCurrentStepId] = useState<string>(
    schema.startNodeId || Object.keys(schema.steps)[0] || ""
  );
  const [history, setHistory] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // Active step object
  const currentStep: CompiledStep | null = useMemo(() => {
    return schema.steps[currentStepId] || null;
  }, [schema.steps, currentStepId]);

  // Current field answer
  const currentFieldVal = currentStep?.fieldId
    ? answers[currentStep.fieldId]
    : undefined;

  // Track start time
  useEffect(() => {
    startTimeRef.current = Date.now();
  }, []);

  const handleAnswerChange = (val: any) => {
    if (!currentStep?.fieldId) return;
    setErrorMsg(null);
    setAnswers((prev) => ({
      ...prev,
      [currentStep.fieldId!]: val,
    }));
  };

  const handleNext = async () => {
    if (!currentStep) return;

    // Validation for field node
    if (currentStep.type === "field") {
      const val = answers[currentStep.fieldId || ""];
      if (
        currentStep.required &&
        (val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0))
      ) {
        setErrorMsg("This question is required.");
        return;
      }

      if (currentStep.fieldType === "email" && val) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(String(val))) {
          setErrorMsg("Please enter a valid email address.");
          return;
        }
      }
    }

    setErrorMsg(null);

    // Resolve next step
    const nextStep = getNextStep(currentStepId, answers, schema);

    if (!nextStep) {
      // Reached the end or dead end
      await handleComplete();
      return;
    }

    if (nextStep.type === "end") {
      setHistory((prev) => [...prev, currentStepId]);
      setCurrentStepId(nextStep.id);
      await handleComplete();
      return;
    }

    setHistory((prev) => [...prev, currentStepId]);
    setCurrentStepId(nextStep.id);
  };

  const handleBack = () => {
    if (history.length === 0) return;
    const prevId = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setCurrentStepId(prevId);
    setErrorMsg(null);
  };

  const handleComplete = async () => {
    setIsCompleted(true);
    const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
    if (onSubmitResponse) {
      setIsSubmitting(true);
      try {
        await onSubmitResponse(answers, duration);
      } catch (err) {
        console.error("Submission failed:", err);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleRestart = () => {
    setAnswers({});
    setHistory([]);
    setIsCompleted(false);
    setErrorMsg(null);
    setCurrentStepId(schema.startNodeId || Object.keys(schema.steps)[0] || "");
    startTimeRef.current = Date.now();
    if (onRestartPreview) onRestartPreview();
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey && currentStep?.type !== "end" && !isCompleted) {
        if (currentStep?.fieldType !== "textarea") {
          e.preventDefault();
          handleNext();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentStep, answers, isCompleted]);

  // Calculate progress estimate
  const totalQuestions = Object.values(schema.steps).filter(
    (s) => s.type === "field"
  ).length;
  const answeredCount = Object.keys(answers).length;
  const progressPercent =
    totalQuestions > 0
      ? Math.min(100, Math.round((answeredCount / totalQuestions) * 100))
      : 0;

  if (!currentStep) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-zinc-400 p-8 text-center">
        <p className="text-sm">No workflow steps found in this form.</p>
        <p className="text-xs text-zinc-600 mt-1">
          Open the canvas editor and ensure nodes are connected from Start to End.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col justify-between min-h-[500px] py-8 px-4 sm:px-6 select-text">
      {/* Top Header & Progress */}
      <div>
        <div className="flex items-center justify-between text-xs text-zinc-500 font-mono mb-3">
          <span>{schema.title || "Form"}</span>
          {isPreview && (
            <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
              Interactive Test Mode
            </span>
          )}
        </div>

        {/* Minimalist Progress Line */}
        <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden mb-8">
          <div
            className="h-full bg-white transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Main Card Content */}
      <div className="flex-1 flex flex-col justify-center py-6">
        {/* START SCREEN */}
        {currentStep.type === "start" && (
          <div className="space-y-6 text-center">
            <div className="space-y-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {currentStep.title || "Welcome"}
              </h1>
              {currentStep.description && (
                <p className="text-sm sm:text-base text-zinc-400 max-w-md mx-auto leading-relaxed">
                  {currentStep.description}
                </p>
              )}
            </div>

            <div className="pt-4">
              <button
                onClick={handleNext}
                className="inline-flex items-center gap-2 text-sm font-semibold px-6 py-3 rounded-xl bg-white text-black hover:bg-zinc-200 transition-all shadow-lg active:scale-95"
              >
                <span>{currentStep.buttonText || "Start Form"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* FIELD QUESTION SCREEN */}
        {currentStep.type === "field" && (
          <div className="space-y-6">
            {/* Question Label */}
            <div className="space-y-1.5">
              <label className="text-lg sm:text-xl font-semibold text-white tracking-tight block">
                {currentStep.label}
                {currentStep.required && <span className="text-zinc-500 ml-1.5">*</span>}
              </label>
              {currentStep.description && (
                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                  {currentStep.description}
                </p>
              )}
            </div>

            {/* Input Renders by Type */}
            <div className="pt-2">
              {/* 1. TEXT INPUT */}
              {currentStep.fieldType === "text" && (
                <input
                  type="text"
                  autoFocus
                  placeholder={currentStep.placeholder || "Your answer..."}
                  value={currentFieldVal || ""}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                  className="w-full bg-zinc-950 border-b-2 border-zinc-800 focus:border-white text-lg sm:text-xl text-white px-1 py-3 outline-none transition-colors placeholder:text-zinc-600"
                />
              )}

              {/* 2. TEXTAREA */}
              {currentStep.fieldType === "textarea" && (
                <textarea
                  autoFocus
                  rows={4}
                  placeholder={currentStep.placeholder || "Type your response here..."}
                  value={currentFieldVal || ""}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                  className="w-full bg-zinc-900/60 border border-zinc-800 focus:border-zinc-500 rounded-xl p-4 text-base text-white outline-none transition-all placeholder:text-zinc-600 resize-none"
                />
              )}

              {/* 3. EMAIL */}
              {currentStep.fieldType === "email" && (
                <input
                  type="email"
                  autoFocus
                  placeholder={currentStep.placeholder || "name@company.com"}
                  value={currentFieldVal || ""}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                  className="w-full bg-zinc-950 border-b-2 border-zinc-800 focus:border-white text-lg sm:text-xl text-white px-1 py-3 outline-none transition-colors placeholder:text-zinc-600"
                />
              )}

              {/* 4. NUMBER */}
              {currentStep.fieldType === "number" && (
                <input
                  type="number"
                  autoFocus
                  placeholder={currentStep.placeholder || "0"}
                  value={currentFieldVal || ""}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                  className="w-full bg-zinc-950 border-b-2 border-zinc-800 focus:border-white text-lg sm:text-xl text-white px-1 py-3 outline-none transition-colors placeholder:text-zinc-600"
                />
              )}

              {/* 5. DATE */}
              {currentStep.fieldType === "date" && (
                <input
                  type="date"
                  autoFocus
                  value={currentFieldVal || ""}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 text-base text-white outline-none focus:border-zinc-500 [color-scheme:dark]"
                />
              )}

              {/* 6. SELECT DROPDOWN */}
              {currentStep.fieldType === "select" && (
                <div className="space-y-2">
                  {(currentStep.options || []).map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => handleAnswerChange(opt.value)}
                      className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-sm font-medium transition-all ${
                        currentFieldVal === opt.value
                          ? "bg-white text-black border-white"
                          : "bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900"
                      }`}
                    >
                      <span>{opt.label}</span>
                      {currentFieldVal === opt.value && <Check className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              )}

              {/* 7. RADIO (SINGLE CHOICE) */}
              {currentStep.fieldType === "radio" && (
                <div className="space-y-2">
                  {(currentStep.options || []).map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => handleAnswerChange(opt.value)}
                      className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-sm font-medium transition-all text-left ${
                        currentFieldVal === opt.value
                          ? "bg-zinc-900 border-white text-white"
                          : "bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900/60"
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          currentFieldVal === opt.value
                            ? "border-white bg-white"
                            : "border-zinc-600"
                        }`}
                      >
                        {currentFieldVal === opt.value && (
                          <span className="w-1.5 h-1.5 rounded-full bg-black" />
                        )}
                      </span>
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* 8. CHECKBOX (MULTI CHOICE) */}
              {currentStep.fieldType === "checkbox" && (
                <div className="space-y-2">
                  {(currentStep.options || []).map((opt) => {
                    const currentArr = Array.isArray(currentFieldVal)
                      ? currentFieldVal
                      : [];
                    const isChecked = currentArr.includes(opt.value);
                    return (
                      <button
                        key={opt.id}
                        onClick={() => {
                          if (isChecked) {
                            handleAnswerChange(
                              currentArr.filter((x: string) => x !== opt.value)
                            );
                          } else {
                            handleAnswerChange([...currentArr, opt.value]);
                          }
                        }}
                        className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-sm font-medium transition-all text-left ${
                          isChecked
                            ? "bg-zinc-900 border-white text-white"
                            : "bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900/60"
                        }`}
                      >
                        <span
                          className={`w-4 h-4 rounded border flex items-center justify-center ${
                            isChecked
                              ? "border-white bg-white text-black"
                              : "border-zinc-600"
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 text-black stroke-[3]" />}
                        </span>
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* 9. RATING (1-5) */}
              {currentStep.fieldType === "rating" && (
                <div className="flex items-center justify-center gap-2 sm:gap-3 py-4">
                  {[1, 2, 3, 4, 5].map((score) => {
                    const isSelected = Number(currentFieldVal) >= score;
                    return (
                      <button
                        key={score}
                        onClick={() => handleAnswerChange(score)}
                        className={`w-12 h-12 rounded-xl flex items-center justify-center border text-sm font-bold transition-all ${
                          Number(currentFieldVal) === score
                            ? "bg-white text-black border-white scale-110"
                            : isSelected
                            ? "bg-zinc-800 border-zinc-700 text-white"
                            : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white"
                        }`}
                      >
                        <Star
                          className={`w-5 h-5 ${
                            isSelected ? "fill-white text-white" : "text-zinc-600"
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Error message */}
            {errorMsg && (
              <div className="flex items-center gap-1.5 text-xs text-red-400 pt-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>
        )}

        {/* COMPLETION SCREEN */}
        {(currentStep.type === "end" || isCompleted) && (
          <div className="space-y-6 text-center py-6">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 text-white flex items-center justify-center mx-auto mb-2 shadow-inner">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {currentStep.title || "Thank You!"}
              </h2>
              <p className="text-sm sm:text-base text-zinc-400 max-w-md mx-auto leading-relaxed">
                {currentStep.description || "Your submission has been recorded."}
              </p>
            </div>

            {isPreview && (
              <div className="pt-4">
                <button
                  onClick={handleRestart}
                  className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 hover:text-white transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restart Test Flow</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Footer Navigation */}
      {currentStep.type !== "start" && currentStep.type !== "end" && !isCompleted && (
        <div className="border-t border-zinc-800/80 pt-5 flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={history.length === 0}
            className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-400 transition-colors px-3 py-2 rounded-lg"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>

          <button
            onClick={handleNext}
            disabled={isSubmitting}
            className="flex items-center gap-2 text-xs font-semibold px-5 py-2.5 rounded-xl bg-white text-black hover:bg-zinc-200 transition-all active:scale-95 disabled:opacity-50"
          >
            <span>Continue</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
