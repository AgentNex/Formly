"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import {
  Workflow,
  ArrowRight,
  ArrowLeft,
  Mail,
  KeyRound,
  Lock,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Eye,
  EyeOff,
} from "lucide-react";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { signIn } = useAuthActions();

  const [step, setStep] = useState<"request" | "verify">("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage("Please enter your registered email address.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      await signIn("password", {
        email: email.trim().toLowerCase(),
        flow: "reset",
      });
      setSuccessMessage("A verification reset code has been sent to your email.");
      setStep("verify");
    } catch (err: any) {
      console.error("Password reset request error:", err);
      // In production security, we avoid leaking user existence, but advance to code entry
      setSuccessMessage("If an account exists with this email, a reset code was dispatched.");
      setStep("verify");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || newPassword.length < 8) {
      setErrorMessage("Please enter the verification code and a new password with at least 8 characters.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      await signIn("password", {
        email: email.trim().toLowerCase(),
        code: code.trim(),
        newPassword,
        flow: "reset-verification",
      });
      setSuccessMessage("Password successfully updated! Redirecting to workspace...");
      setTimeout(() => {
        router.replace("/");
      }, 1500);
    } catch (err: any) {
      console.error("Password reset verification error:", err);
      setErrorMessage(
        err?.message || "Invalid or expired reset code. Please verify and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col justify-center items-center px-4 py-12 selection:bg-white selection:text-black">
      {/* Brand Header */}
      <div className="w-full max-w-md mb-8 flex flex-col items-center text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors mb-6 group"
        >
          <div className="w-6 h-6 rounded-md bg-white flex items-center justify-center text-black font-black text-sm">
            <Workflow className="w-3.5 h-3.5 text-black" />
          </div>
          <span className="font-semibold text-sm tracking-tight text-zinc-200 group-hover:text-white transition-colors">
            Formly
          </span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
            Security
          </span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          Reset your password
        </h1>
        <p className="text-sm text-zinc-400 mt-2">
          {step === "request"
            ? "Enter your email to receive a secure verification code."
            : "Enter the code sent to your email and choose a new password."}
        </p>
      </div>

      {/* Reset Card */}
      <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-xl p-6 sm:p-8 shadow-2xl relative">
        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-6 p-3.5 rounded-lg bg-red-950/40 border border-red-900/60 text-red-200 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{errorMessage}</div>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="mb-6 p-3.5 rounded-lg bg-emerald-950/40 border border-emerald-900/60 text-emerald-200 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{successMessage}</div>
          </div>
        )}

        {step === "request" ? (
          <form onSubmit={handleRequestReset} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium text-zinc-300 mb-1.5 tracking-wide uppercase"
              >
                Registered Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all font-sans"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 bg-white text-black font-semibold rounded-lg text-sm hover:bg-zinc-200 active:bg-zinc-300 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending Code...</span>
                </>
              ) : (
                <>
                  <span>Send Reset Code</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyReset} className="space-y-4">
            <div>
              <label
                htmlFor="code"
                className="block text-xs font-medium text-zinc-300 mb-1.5 tracking-wide uppercase"
              >
                Verification Code
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  id="code"
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. 123456"
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all font-mono tracking-wider"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="newPassword"
                className="block text-xs font-medium text-zinc-300 mb-1.5 tracking-wide uppercase"
              >
                New Password (min. 8 chars)
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all font-sans"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 bg-white text-black font-semibold rounded-lg text-sm hover:bg-zinc-200 active:bg-zinc-300 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <span>Save New Password</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep("request");
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className="w-full text-center text-xs text-zinc-500 hover:text-zinc-300 pt-2 transition-colors"
            >
              Didn&apos;t receive code? Resend
            </button>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-zinc-900 flex items-center justify-center">
          <Link
            href="/signin"
            className="inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Sign In</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
