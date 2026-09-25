"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth";
import {
  Workflow,
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
  Building2,
  AlertCircle,
  Loader2,
  CheckCircle2,
  KeyRound,
} from "lucide-react";

function SignUpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/";

  const {
    signUp,
    verifyEmail,
    signInWithOAuth,
    isAuthenticated,
    isLoading: isAuthLoading,
  } = useAuth();
  const syncViewer = useMutation(api.users.syncViewer);

  const [step, setStep] = useState<"register" | "verify">("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // If already authenticated, redirect to destination
  useEffect(() => {
    if (isAuthenticated && !isAuthLoading) {
      router.replace(redirectPath);
    }
  }, [isAuthenticated, isAuthLoading, redirectPath, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage("Please enter your full name.");
      return;
    }
    if (!email.trim()) {
      setErrorMessage("Please enter a valid work email.");
      return;
    }
    if (password.length < 8) {
      setErrorMessage("Password must contain at least 8 characters.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await signUp(email.trim().toLowerCase(), password, name.trim());
      if (res.error) {
        const msg = res.error.message || "";
        if (
          msg.includes("AccountAlreadyExists") ||
          msg.includes("already registered") ||
          msg.includes("duplicate") ||
          msg.includes("exists")
        ) {
          setErrorMessage(
            "An account with this email already exists. Please sign in instead."
          );
        } else {
          setErrorMessage(
            msg || "Account creation failed. Please check your details and try again."
          );
        }
        return;
      }

      if (res.data?.requireEmailVerification) {
        setStep("verify");
        return;
      }

      // Synchronize initial tenant organization immediately
      try {
        await syncViewer({
          email: email.trim().toLowerCase(),
          name: name.trim(),
          externalId: res.data?.user?.id,
        });
      } catch (syncErr) {
        console.warn("Workspace sync will complete on initial navigation:", syncErr);
      }

      router.replace(redirectPath);
    } catch (err: any) {
      console.error("Sign up failed:", err);
      setErrorMessage(
        err?.message || "Account creation failed. Please check your details."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode.trim()) {
      setErrorMessage("Please enter the 6-digit verification code.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await verifyEmail(email.trim().toLowerCase(), verificationCode.trim());
      if (res.error) {
        setErrorMessage(
          res.error.message || "Invalid verification code. Please check and try again."
        );
        return;
      }

      try {
        await syncViewer({
          email: email.trim().toLowerCase(),
          name: name.trim(),
          externalId: res.data?.user?.id,
        });
      } catch (syncErr) {
        console.warn("Workspace sync will complete on initial navigation:", syncErr);
      }

      router.replace(redirectPath);
    } catch (err: any) {
      console.error("Email verification failed:", err);
      setErrorMessage(err?.message || "Email verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setErrorMessage(null);

    try {
      const targetUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}${redirectPath}`
          : redirectPath;
      await signInWithOAuth("google", {
        redirectTo: targetUrl,
      });
    } catch (err: any) {
      console.error("Google OAuth error:", err);
      setErrorMessage(
        err?.message || "Google sign in could not be initiated."
      );
    } finally {
      setGoogleLoading(false);
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
            Enterprise
          </span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          {step === "register" ? "Create your workspace" : "Verify your email"}
        </h1>
        <p className="text-sm text-zinc-400 mt-2">
          {step === "register"
            ? "Start designing intelligent workflow forms with server-authoritative DAG execution."
            : `Enter the 6-digit verification code dispatched to ${email}.`}
        </p>
      </div>

      {/* Auth Card */}
      <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-xl p-6 sm:p-8 shadow-2xl relative">
        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-6 p-3.5 rounded-lg bg-red-950/40 border border-red-900/60 text-red-200 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{errorMessage}</div>
          </div>
        )}

        {step === "register" ? (
          <>
            {/* Credentials Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="name"
                  className="block text-xs font-medium text-zinc-300 mb-1.5 tracking-wide uppercase"
                >
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    id="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all font-sans"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-medium text-zinc-300 mb-1.5 tracking-wide uppercase"
                >
                  Work Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jane@company.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all font-sans"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-medium text-zinc-300 mb-1.5 tracking-wide uppercase"
                >
                  Password (min. 8 characters)
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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

              <div>
                <label
                  htmlFor="orgName"
                  className="block text-xs font-medium text-zinc-300 mb-1.5 tracking-wide uppercase"
                >
                  Organization / Workspace Name <span className="text-zinc-500">(Optional)</span>
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    id="orgName"
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder={name ? `${name.trim()}'s Workspace` : "Acme Corp"}
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
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Workspace</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-800"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-zinc-950 px-3 text-zinc-500 font-mono tracking-wider">
                  Or continue with
                </span>
              </div>
            </div>

            {/* Social Auth */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full py-2.5 px-4 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/60 rounded-lg text-sm font-medium text-zinc-200 transition-colors flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {googleLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#ffffff"
                    d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z"
                  />
                </svg>
              )}
              <span>Sign up with Google</span>
            </button>
          </>
        ) : (
          /* Email Verification Step */
          <form onSubmit={handleVerify} className="space-y-4">
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
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="e.g. 123456"
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all font-mono tracking-wider"
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
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <span>Verify & Activate</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep("register");
                setErrorMessage(null);
              }}
              className="w-full text-center text-xs text-zinc-500 hover:text-zinc-300 pt-2 transition-colors"
            >
              Back to registration details
            </button>
          </form>
        )}

        {/* Terms notice */}
        <div className="mt-6 pt-4 border-t border-zinc-900 flex items-center justify-center gap-1.5 text-xs text-zinc-500">
          <CheckCircle2 className="w-3.5 h-3.5 text-zinc-400" />
          <span>Protected by InsForge Auth & Enterprise RBAC</span>
        </div>
      </div>

      {/* Switch to Sign In */}
      <p className="mt-8 text-center text-sm text-zinc-400">
        Already have an account?{" "}
        <Link
          href={`/signin${redirectPath !== "/" ? `?redirect=${encodeURIComponent(redirectPath)}` : ""}`}
          className="text-white font-medium hover:underline underline-offset-4"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center text-zinc-500">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      }
    >
      <SignUpContent />
    </Suspense>
  );
}
