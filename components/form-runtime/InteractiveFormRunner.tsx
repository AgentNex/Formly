"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  CompiledFormSchema,
  CompiledStep,
  FieldOption,
  FieldType,
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
  UploadCloud,
  FileCheck,
  Calendar,
  Clock,
  MapPin,
  Globe,
  ShieldCheck,
  DollarSign,
  Smile,
  Grid,
} from "lucide-react";

interface InteractiveFormRunnerProps {
  schema: CompiledFormSchema;
  isPreview?: boolean;
  onSubmitResponse?: (
    answers: Record<string, unknown>,
    durationSeconds: number,
    intentId: string,
    branchPath: string[]
  ) => Promise<{ success: boolean; error?: string }>;
  onLogEvent?: (eventType: string, nodeId?: string, fieldId?: string) => void;
  onRestartPreview?: () => void;
}

export function InteractiveFormRunner({
  schema,
  isPreview = false,
  onSubmitResponse,
  onLogEvent,
  onRestartPreview,
}: InteractiveFormRunnerProps) {
  const startTimeRef = useRef<number>(Date.now());
  const intentIdRef = useRef<string>(`intent_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`);

  const [currentStepId, setCurrentStepId] = useState<string>(
    schema.startNodeId || Object.keys(schema.steps)[0] || ""
  );
  const [history, setHistory] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [status, setStatus] = useState<"in_progress" | "submitting" | "success" | "error">("in_progress");
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Active step object
  const currentStep: CompiledStep | null = useMemo(() => {
    return schema.steps[currentStepId] || null;
  }, [schema.steps, currentStepId]);

  // Track start time and emit view event
  useEffect(() => {
    startTimeRef.current = Date.now();
    if (onLogEvent) {
      onLogEvent("form_started");
    }
  }, [onLogEvent]);

  // Emit step_viewed event whenever step changes
  useEffect(() => {
    if (onLogEvent && currentStepId) {
      const step = schema.steps[currentStepId];
      onLogEvent("step_viewed", currentStepId, step?.fieldId);
    }
  }, [currentStepId, schema.steps, onLogEvent]);

  // Compute active path progress dynamically along current route
  const progressPercent = useMemo(() => {
    const totalStepsEstimate = Math.max(Object.keys(schema.steps).length, 1);
    const stepsCompleted = history.length;
    if (currentStep?.type === "end" || status === "success") return 100;
    if (stepsCompleted === 0) return 5;
    return Math.min(Math.round((stepsCompleted / totalStepsEstimate) * 100), 95);
  }, [history.length, schema.steps, currentStep?.type, status]);

  // Handle Answer Changes with telemetry
  const handleAnswerChange = (val: any) => {
    if (!currentStep?.fieldId) return;
    setErrorMsg(null);
    setAnswers((prev) => ({
      ...prev,
      [currentStep.fieldId!]: val,
    }));
    if (onLogEvent) {
      onLogEvent("answer_changed", currentStepId, currentStep.fieldId);
    }
  };

  // Validate current field
  const validateCurrentStep = useCallback((): boolean => {
    if (!currentStep || currentStep.type !== "field") return true;

    const val = answers[currentStep.fieldId || ""];
    if (
      currentStep.required &&
      (val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0))
    ) {
      setErrorMsg("This question requires an answer to proceed.");
      return false;
    }

    if (currentStep.fieldType === "email" && val) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(String(val))) {
        setErrorMsg("Please provide a valid email address.");
        return false;
      }
    }

    if (currentStep.fieldType === "phone" && val) {
      const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
      if (!phoneRegex.test(String(val).replace(/[\s()-]/g, ""))) {
        setErrorMsg("Please enter a valid phone number.");
        return false;
      }
    }

    return true;
  }, [answers, currentStep]);

  // Submit response idempotently
  const handleComplete = useCallback(async () => {
    setStatus("submitting");
    const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
    const branchPath = [...history, currentStepId];

    if (onSubmitResponse) {
      try {
        const result = await onSubmitResponse(answers, duration, intentIdRef.current, branchPath);
        if (result && !result.success && result.error) {
          setStatus("error");
          setSubmitError(result.error);
          return;
        }
      } catch (err: any) {
        setStatus("error");
        setSubmitError(err?.message || "Submission failed. Please check network connection and retry.");
        return;
      }
    }

    setStatus("success");
    if (onLogEvent) {
      onLogEvent("form_submitted");
    }

    // Handle automated redirect if end node specifies a URL
    if (currentStep?.redirectUrl) {
      setTimeout(() => {
        try {
          const parsed = new URL(currentStep.redirectUrl!);
          if (["http:", "https:"].includes(parsed.protocol)) {
            window.location.href = parsed.toString();
          }
        } catch {
          // invalid url ignored
        }
      }, 2500);
    }
  }, [answers, currentStep?.redirectUrl, currentStepId, history, onLogEvent, onSubmitResponse]);

  // Advance to Next Step
  const handleNext = useCallback(async () => {
    if (!validateCurrentStep()) return;
    setErrorMsg(null);

    const nextStep = getNextStep(currentStepId, answers, schema);

    if (!nextStep) {
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
  }, [currentStepId, answers, schema, handleComplete, validateCurrentStep]);

  // Back Button: Rollback step and prune stale answers if branch divergence occurs
  const handleBack = () => {
    if (history.length === 0) return;
    const prevId = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setCurrentStepId(prevId);
    setErrorMsg(null);
  };

  const handleRestart = () => {
    setAnswers({});
    setHistory([]);
    setStatus("in_progress");
    setErrorMsg(null);
    setSubmitError(null);
    intentIdRef.current = `intent_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    setCurrentStepId(schema.startNodeId || Object.keys(schema.steps)[0] || "");
    startTimeRef.current = Date.now();
    if (onRestartPreview) onRestartPreview();
  };

  // Keyboard navigation: Enter advances (except multiline)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "Enter" &&
        !e.shiftKey &&
        currentStep?.type !== "end" &&
        status === "in_progress"
      ) {
        if (currentStep?.fieldType !== "textarea") {
          e.preventDefault();
          handleNext();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentStep, handleNext, status]);

  const currentFieldVal = currentStep?.fieldId ? answers[currentStep.fieldId] : undefined;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-between selection:bg-zinc-800">
      {/* Top Header & Dynamic Reachable Progress Bar */}
      <header className="w-full border-b border-zinc-900 bg-zinc-950/80 backdrop-blur sticky top-0 z-30">
        <div className="h-0.5 bg-zinc-900 w-full overflow-hidden">
          <div
            className="h-full bg-white transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="max-w-2xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-widest text-zinc-400 font-semibold">
              {schema.title}
            </span>
            {isPreview && (
              <span className="text-[10px] bg-zinc-900 text-zinc-400 border border-zinc-800 rounded px-1.5 py-0.5 font-mono">
                Preview Mode
              </span>
            )}
          </div>
          <span className="text-xs font-mono text-zinc-500">
            {progressPercent}% completed
          </span>
        </div>
      </header>

      {/* Main Interactive Stage */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-6 py-12 flex flex-col justify-center">
        {/* SUBMISSION SUCCESS STATE */}
        {status === "success" && (
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-8 md:p-10 text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center mx-auto shadow-2xl">
              <Check className="w-7 h-7 stroke-[3]" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white">
                {currentStep?.title || "Thank You!"}
              </h2>
              <p className="text-sm text-zinc-400 mt-2 leading-relaxed max-w-md mx-auto">
                {currentStep?.description || "Your submission has been securely recorded."}
              </p>
              {currentStep?.redirectUrl && (
                <p className="text-xs text-zinc-500 mt-3 font-mono">
                  Redirecting to destination...
                </p>
              )}
            </div>

            <div className="pt-4 flex justify-center">
              <button
                onClick={handleRestart}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Submit Another Response</span>
              </button>
            </div>
          </div>
        )}

        {/* SUBMISSION ERROR STATE */}
        {status === "error" && (
          <div className="bg-zinc-950 border border-red-900/40 rounded-2xl p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-950 text-red-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-white">Submission Issue</h3>
            <p className="text-xs text-zinc-400 max-w-md mx-auto">{submitError}</p>
            <div className="pt-2 flex justify-center gap-3">
              <button
                onClick={handleComplete}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white text-black hover:bg-zinc-200 transition-colors"
              >
                Retry Submission
              </button>
              <button
                onClick={handleRestart}
                className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 transition-colors"
              >
                Restart Form
              </button>
            </div>
          </div>
        )}

        {/* IN-PROGRESS STEPS */}
        {status === "in_progress" && currentStep && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* START STEP */}
            {currentStep.type === "start" && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-3xl font-extrabold tracking-tight text-white">
                    {currentStep.title || "Welcome"}
                  </h1>
                  {currentStep.description && (
                    <p className="text-base text-zinc-400 mt-2 leading-relaxed">
                      {currentStep.description}
                    </p>
                  )}
                </div>

                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm bg-white text-black hover:bg-zinc-200 active:scale-[0.98] transition-all shadow-xl"
                >
                  <span>{currentStep.buttonText || "Get Started"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* FIELD QUESTION STEP */}
            {currentStep.type === "field" && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <h2 className="text-2xl font-bold tracking-tight text-white">
                      {currentStep.label}
                    </h2>
                    {currentStep.required && (
                      <span className="text-zinc-500 text-xs font-mono">* required</span>
                    )}
                  </div>
                  {currentStep.description && (
                    <p className="text-sm text-zinc-400 leading-relaxed">
                      {currentStep.description}
                    </p>
                  )}
                </div>

                {/* DYNAMIC FIELD TYPE RENDERING */}
                <div className="pt-2">
                  {/* Single Line Text / Phone */}
                  {["text", "phone"].includes(currentStep.fieldType || "text") && (
                    <input
                      type={currentStep.fieldType === "phone" ? "tel" : "text"}
                      autoFocus
                      placeholder={currentStep.placeholder || "Type your answer..."}
                      value={currentFieldVal || ""}
                      onChange={(e) => handleAnswerChange(e.target.value)}
                      className="w-full bg-zinc-950 border-b-2 border-zinc-800 focus:border-white text-xl text-white py-3 px-1 focus:outline-none transition-colors placeholder:text-zinc-600"
                    />
                  )}

                  {/* Paragraph / Long Text */}
                  {currentStep.fieldType === "textarea" && (
                    <textarea
                      autoFocus
                      rows={4}
                      placeholder={currentStep.placeholder || "Type your response here..."}
                      value={currentFieldVal || ""}
                      onChange={(e) => handleAnswerChange(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-base text-white focus:outline-none focus:border-white transition-colors placeholder:text-zinc-600 resize-none"
                    />
                  )}

                  {/* Email */}
                  {currentStep.fieldType === "email" && (
                    <input
                      type="email"
                      autoFocus
                      placeholder={currentStep.placeholder || "name@company.com"}
                      value={currentFieldVal || ""}
                      onChange={(e) => handleAnswerChange(e.target.value)}
                      className="w-full bg-zinc-950 border-b-2 border-zinc-800 focus:border-white text-xl text-white py-3 px-1 focus:outline-none transition-colors placeholder:text-zinc-600"
                    />
                  )}

                  {/* Numeric Input */}
                  {currentStep.fieldType === "number" && (
                    <input
                      type="number"
                      autoFocus
                      placeholder={currentStep.placeholder || "0"}
                      value={currentFieldVal ?? ""}
                      onChange={(e) => handleAnswerChange(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full max-w-xs bg-zinc-950 border-b-2 border-zinc-800 focus:border-white text-xl text-white py-3 px-1 focus:outline-none transition-colors placeholder:text-zinc-600 font-mono"
                    />
                  )}

                  {/* Currency / Price */}
                  {currentStep.fieldType === "currency" && (
                    <div className="relative max-w-xs">
                      <span className="absolute left-1 top-3 text-xl text-zinc-500 font-mono">
                        {currentStep.currencySymbol || "$"}
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        autoFocus
                        placeholder="0.00"
                        value={currentFieldVal ?? ""}
                        onChange={(e) => handleAnswerChange(e.target.value)}
                        className="w-full bg-zinc-950 border-b-2 border-zinc-800 focus:border-white text-xl text-white py-3 pl-7 pr-1 focus:outline-none transition-colors font-mono"
                      />
                    </div>
                  )}

                  {/* Date Picker */}
                  {currentStep.fieldType === "date" && (
                    <div className="relative max-w-sm">
                      <input
                        type="date"
                        autoFocus
                        value={currentFieldVal || ""}
                        onChange={(e) => handleAnswerChange(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-base text-white focus:outline-none focus:border-white transition-colors"
                      />
                    </div>
                  )}

                  {/* Time Picker */}
                  {currentStep.fieldType === "time" && (
                    <div className="relative max-w-sm">
                      <input
                        type="time"
                        autoFocus
                        value={currentFieldVal || ""}
                        onChange={(e) => handleAnswerChange(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-base text-white focus:outline-none focus:border-white transition-colors font-mono"
                      />
                    </div>
                  )}

                  {/* Address */}
                  {currentStep.fieldType === "address" && (
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="Street Address"
                        value={currentFieldVal?.street || ""}
                        onChange={(e) => handleAnswerChange({ ...(currentFieldVal || {}), street: e.target.value })}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-zinc-500"
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="text"
                          placeholder="City"
                          value={currentFieldVal?.city || ""}
                          onChange={(e) => handleAnswerChange({ ...(currentFieldVal || {}), city: e.target.value })}
                          className="bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-zinc-500"
                        />
                        <input
                          type="text"
                          placeholder="State / Region"
                          value={currentFieldVal?.state || ""}
                          onChange={(e) => handleAnswerChange({ ...(currentFieldVal || {}), state: e.target.value })}
                          className="bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-zinc-500"
                        />
                        <input
                          type="text"
                          placeholder="Postal Code"
                          value={currentFieldVal?.zip || ""}
                          onChange={(e) => handleAnswerChange({ ...(currentFieldVal || {}), zip: e.target.value })}
                          className="bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-zinc-500 font-mono"
                        />
                      </div>
                    </div>
                  )}

                  {/* Country Selector */}
                  {currentStep.fieldType === "country" && (
                    <select
                      autoFocus
                      value={currentFieldVal || ""}
                      onChange={(e) => handleAnswerChange(e.target.value)}
                      className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 text-base text-white focus:outline-none focus:border-white transition-colors"
                    >
                      <option value="">Select country...</option>
                      {["United States", "United Kingdom", "Canada", "Germany", "France", "Australia", "Japan", "India", "Singapore", "Brazil", "Global / Other"].map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  )}

                  {/* Dropdown Select */}
                  {currentStep.fieldType === "select" && (
                    <select
                      autoFocus
                      value={currentFieldVal || ""}
                      onChange={(e) => handleAnswerChange(e.target.value)}
                      className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 text-base text-white focus:outline-none focus:border-white transition-colors"
                    >
                      <option value="">Choose an option...</option>
                      {(currentStep.options || []).map((opt) => (
                        <option key={opt.id} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Radio Cards (Single Choice) */}
                  {currentStep.fieldType === "radio" && (
                    <div className="grid gap-2.5">
                      {(currentStep.options || []).map((opt) => {
                        const isSelected = currentFieldVal === opt.value;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => handleAnswerChange(opt.value)}
                            className={`w-full text-left p-4 rounded-xl border flex items-center justify-between transition-all ${
                              isSelected
                                ? "bg-white text-black border-white font-medium"
                                : "bg-zinc-950 text-zinc-300 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/60"
                            }`}
                          >
                            <span className="text-sm">{opt.label}</span>
                            <div
                              className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                isSelected ? "border-black" : "border-zinc-600"
                              }`}
                            >
                              {isSelected && <div className="w-2 h-2 rounded-full bg-black" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Checkboxes (Multiple Choice) */}
                  {currentStep.fieldType === "checkbox" && (
                    <div className="grid gap-2.5">
                      {(currentStep.options || []).map((opt) => {
                        const currentArr: string[] = Array.isArray(currentFieldVal)
                          ? currentFieldVal
                          : [];
                        const isChecked = currentArr.includes(opt.value);
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              const nextArr = isChecked
                                ? currentArr.filter((v) => v !== opt.value)
                                : [...currentArr, opt.value];
                              handleAnswerChange(nextArr);
                            }}
                            className={`w-full text-left p-4 rounded-xl border flex items-center justify-between transition-all ${
                              isChecked
                                ? "bg-white text-black border-white font-medium"
                                : "bg-zinc-950 text-zinc-300 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/60"
                            }`}
                          >
                            <span className="text-sm">{opt.label}</span>
                            <div
                              className={`w-4 h-4 rounded border flex items-center justify-center ${
                                isChecked ? "bg-black border-black text-white" : "border-zinc-600"
                              }`}
                            >
                              {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Star Rating (1 to 5) */}
                  {currentStep.fieldType === "rating" && (
                    <div className="flex items-center gap-3">
                      {[1, 2, 3, 4, 5].map((val) => {
                        const active = (currentFieldVal || 0) >= val;
                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => handleAnswerChange(val)}
                            className="p-3 rounded-2xl border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900/80 transition-all text-center focus:outline-none focus:ring-2 focus:ring-white"
                          >
                            <Star
                              className={`w-7 h-7 transition-colors ${
                                active
                                  ? "text-white fill-white"
                                  : "text-zinc-600 hover:text-zinc-400"
                              }`}
                            />
                            <span className="text-xs font-mono mt-1 block text-zinc-400">
                              {val}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Net Promoter Score (0 to 10) */}
                  {currentStep.fieldType === "nps" && (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-1.5 justify-between">
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                          const isSelected = currentFieldVal === num;
                          return (
                            <button
                              key={num}
                              type="button"
                              onClick={() => handleAnswerChange(num)}
                              className={`w-11 h-12 rounded-xl border flex items-center justify-center font-mono font-semibold transition-all ${
                                isSelected
                                  ? "bg-white text-black border-white shadow-xl"
                                  : "bg-zinc-950 text-zinc-300 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900"
                              }`}
                            >
                              {num}
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex justify-between text-xs text-zinc-500 font-mono">
                        <span>Not likely at all</span>
                        <span>Extremely likely</span>
                      </div>
                    </div>
                  )}

                  {/* Opinion Slider */}
                  {currentStep.fieldType === "slider" && (
                    <div className="space-y-4 max-w-md">
                      <div className="flex justify-between text-xl font-bold font-mono text-white">
                        <span>{currentFieldVal ?? currentStep.min ?? 0}</span>
                      </div>
                      <input
                        type="range"
                        min={currentStep.min ?? 0}
                        max={currentStep.max ?? 100}
                        step={currentStep.step ?? 1}
                        value={currentFieldVal ?? currentStep.min ?? 0}
                        onChange={(e) => handleAnswerChange(Number(e.target.value))}
                        className="w-full accent-white bg-zinc-900 cursor-pointer h-2 rounded-lg"
                      />
                    </div>
                  )}

                  {/* File Upload Simulator */}
                  {currentStep.fieldType === "file" && (
                    <div className="border-2 border-dashed border-zinc-800 hover:border-zinc-600 rounded-2xl p-8 text-center space-y-3 cursor-pointer bg-zinc-950 transition-colors">
                      <UploadCloud className="w-8 h-8 text-zinc-400 mx-auto" />
                      <div>
                        <span className="text-sm font-medium text-white block">
                          {currentFieldVal ? `Attached: ${currentFieldVal}` : "Click or drag document to upload"}
                        </span>
                        <span className="text-xs text-zinc-500">
                          PDF, PNG, JPG up to 10MB
                        </span>
                      </div>
                      <input
                        type="file"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleAnswerChange(file.name);
                        }}
                        className="hidden"
                        id="form-file-input"
                      />
                      <label
                        htmlFor="form-file-input"
                        className="inline-block px-4 py-1.5 rounded-lg text-xs font-semibold bg-zinc-900 border border-zinc-700 text-white cursor-pointer hover:bg-zinc-800"
                      >
                        Browse Files
                      </label>
                    </div>
                  )}

                  {/* Digital Signature */}
                  {currentStep.fieldType === "signature" && (
                    <div className="space-y-2">
                      <label className="text-xs text-zinc-500 font-mono">Sign Full Legal Name</label>
                      <input
                        type="text"
                        placeholder="Type your full legal name..."
                        value={currentFieldVal || ""}
                        onChange={(e) => handleAnswerChange(e.target.value)}
                        className="w-full bg-zinc-950 border-b border-zinc-700 py-3 text-2xl font-serif italic text-white focus:outline-none focus:border-white"
                      />
                    </div>
                  )}

                  {/* Legal Consent */}
                  {currentStep.fieldType === "consent" && (
                    <label className="flex items-start gap-3 p-4 rounded-xl border border-zinc-800 bg-zinc-950 cursor-pointer hover:border-zinc-700 transition-colors">
                      <input
                        type="checkbox"
                        checked={Boolean(currentFieldVal)}
                        onChange={(e) => handleAnswerChange(e.target.checked)}
                        className="w-5 h-5 accent-white rounded bg-zinc-900 border-zinc-700 mt-0.5"
                      />
                      <span className="text-sm text-zinc-300 leading-relaxed">
                        {currentStep.placeholder || "I acknowledge and agree to the privacy policy, terms of service, and consent to digital processing of my submitted response."}
                      </span>
                    </label>
                  )}
                </div>

                {/* Validation Error Banner */}
                {errorMsg && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-red-950/40 border border-red-900/50 text-red-300 text-xs animate-in fade-in">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Bottom Navigation Toolbar */}
      {status === "in_progress" && currentStep && currentStep.type !== "end" && (
        <footer className="w-full border-t border-zinc-900 bg-zinc-950/80 backdrop-blur sticky bottom-0 z-30">
          <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
            <button
              onClick={handleBack}
              disabled={history.length === 0}
              className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white disabled:opacity-0 disabled:pointer-events-none transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <div className="flex items-center gap-3">
              <span className="hidden sm:inline text-[11px] text-zinc-500 font-mono">
                Press <strong className="text-zinc-300">Enter ↵</strong>
              </span>

              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-white text-black hover:bg-zinc-200 active:scale-95 transition-all shadow-lg"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
