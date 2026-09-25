"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
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
  RotateCcw,
  ShieldCheck,
  Check,
} from "lucide-react";

function SignUpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/";

  const {
    signUp,
    verifyEmail,
    resendVerificationEmail,
    signInWithOAuth,
    isAuthenticated,
    isLoading: isAuthLoading,
  } = useAuth();

  const [step, setStep] = useState<"register" | "verify">("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [orgName, setOrgName] = useState("");

  // Verification State
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);

  // Common Form State
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const codeInputRef = useRef<HTMLInputElement>(null);
  const verificationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // If already authenticated, redirect to destination
  useEffect(() => {
    if (isAuthenticated && !isAuthLoading) {
      router.replace(redirectPath);
    }
  }, [isAuthenticated, isAuthLoading, redirectPath, router]);

  // Handle Resend cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Focus code input on entering verify step
  useEffect(() => {
    if (step === "verify" && !isLocked && !isVerifying) {
      setTimeout(() => {
        codeInputRef.current?.focus();
      }, 150);
    }
  }, [step, isLocked, isVerifying]);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (verificationTimerRef.current) {
        clearTimeout(verificationTimerRef.current);
      }
    };
  }, []);

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
        setVerificationCode("");
        setIsLocked(false);
        setIsVerifying(false);
        setResendCooldown(60); // Start 60s cooldown for fresh OTP
        return;
      }

      // No email verification required - direct redirect
      window.location.href = redirectPath;
    } catch (err: any) {
      console.error("Sign up failed:", err);
      setErrorMessage(
        err?.message || "Account creation failed. Please check your details."
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Execute email verification with immediate graying out,
   * 10-second silent background confirmation safeguard,
   * and permanent lock with 'Resend Code' recovery upon failure.
   */
  const executeVerification = async (codeToVerify: string) => {
    const sanitizedCode = codeToVerify.replace(/\D/g, "").slice(0, 6);
    if (sanitizedCode.length !== 6) {
      setErrorMessage("Please enter the complete 6-digit verification code.");
      return;
    }

    // Immediately gray out and disable the input section
    setIsVerifying(true);
    setIsLocked(false);
    setErrorMessage(null);
    setResendSuccess(null);

    // Setup 10-second silent confirmation timer
    let didResolve = false;
    const timeoutPromise = new Promise<{ isTimeout: true }>((resolve) => {
      verificationTimerRef.current = setTimeout(() => {
        if (!didResolve) {
          resolve({ isTimeout: true });
        }
      }, 10000); // 10 seconds
    });

    try {
      const verifyPromise = (async () => {
        const res = await verifyEmail(
          email.trim().toLowerCase(),
          sanitizedCode
        );
        return { isTimeout: false as const, res };
      })();

      const outcome = await Promise.race([verifyPromise, timeoutPromise]);

      if (outcome.isTimeout) {
        // 10 seconds elapsed without server completion / cancelled in background
        didResolve = true;
        setIsVerifying(false);
        setIsLocked(true); // Input section remains grayed out and unusable!
        setErrorMessage(
          "Verification timed out after 10 seconds of background confirmation. The input section has been safely locked. Click 'Resend Code' below to receive a new code."
        );
        return;
      }

      didResolve = true;
      if (verificationTimerRef.current) {
        clearTimeout(verificationTimerRef.current);
      }

      const { res } = outcome;
      if (res.error) {
        // Server side failure or invalid code
        setIsVerifying(false);
        setIsLocked(true); // Input section remains locked and grayed out until 'Resend Code' is clicked!
        const serverMsg =
          res.error.message ||
          res.error.error ||
          "Invalid or expired verification code.";
        setErrorMessage(
          `${serverMsg} Please click 'Resend Code' below to receive a fresh verification code.`
        );
        return;
      }

      // Verification successful: navigate immediately to target dashboard
      window.location.href = redirectPath;
    } catch (err: any) {
      didResolve = true;
      if (verificationTimerRef.current) {
        clearTimeout(verificationTimerRef.current);
      }
      setIsVerifying(false);
      setIsLocked(true); // Input section remains locked and grayed out
      setErrorMessage(
        err?.message ||
          "Verification could not be confirmed due to a server error. Click 'Resend Code' below to receive a fresh code."
      );
    }
  };

  /**
   * Strictly numeric input handler.
   * Strips all non-digit characters and auto-submits on 6th digit.
   */
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isVerifying || isLocked) return;
    // Strict numeric filtering: only 0-9 allowed
    const numericOnly = e.target.value.replace(/\D/g, "").slice(0, 6);
    setVerificationCode(numericOnly);
    setErrorMessage(null);

    // Auto-trigger immediately upon entering the 6th digit
    if (numericOnly.length === 6) {
      executeVerification(numericOnly);
    }
  };

  /**
   * Resend Code action.
   * Dispatches a new 6-digit OTP, unlocks the input section,
   * clears previous code, and focuses the input.
   */
  const handleResendCode = async () => {
    if (resendLoading || resendCooldown > 0) return;
    setResendLoading(true);
    setErrorMessage(null);
    setResendSuccess(null);

    try {
      const res = await resendVerificationEmail(email.trim().toLowerCase());
      if (res.error) {
        setErrorMessage(
          res.error.message ||
            "Could not resend verification code. Please try again shortly."
        );
        return;
      }

      setResendSuccess(
        `A fresh 6-digit verification code has been dispatched to ${email}.`
      );
      // Unlock the input section and clear the previous code
      setVerificationCode("");
      setIsLocked(false);
      setIsVerifying(false);
      setResendCooldown(60);

      // Re-focus the input section so user can immediately type
      setTimeout(() => {
        codeInputRef.current?.focus();
      }, 100);
    } catch (err: any) {
      setErrorMessage(
        err?.message || "Failed to resend code due to a network error."
      );
    } finally {
      setResendLoading(false);
    }
  };

  const handleManualVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isVerifying || isLocked) return;
    executeVerification(verificationCode);
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

        {/* Resend Success Alert */}
        {resendSuccess && (
          <div className="mb-6 p-3.5 rounded-lg bg-emerald-950/40 border border-emerald-900/60 text-emerald-200 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
            <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{resendSuccess}</div>
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
          <form onSubmit={handleManualVerifySubmit} className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="verification-code"
                  className="block text-xs font-medium text-zinc-300 tracking-wide uppercase"
                >
                  6-Digit Verification Code
                </label>
                {isVerifying && (
                  <span className="text-[11px] text-zinc-400 font-mono flex items-center gap-1.5 animate-pulse">
                    <Loader2 className="w-3 h-3 animate-spin text-white" />
                    Verifying code...
                  </span>
                )}
                {isLocked && (
                  <span className="text-[11px] text-amber-400/90 font-mono">
                    Locked — Click &apos;Resend Code&apos; to unlock
                  </span>
                )}
              </div>

              {/* Input Section - Strict Numeric Keypad Popup & Immediate Disable */}
              <div
                className={cn(
                  "relative rounded-xl transition-all",
                  (isVerifying || isLocked) &&
                    "opacity-40 pointer-events-none select-none cursor-not-allowed"
                )}
              >
                {/* 
                  Strict numeric attributes:
                  - type="tel": Forces phone/numeric keypad on mobile
                  - inputMode="numeric": Modern standard for numeric virtual keyboard
                  - pattern="[0-9]*": iOS WebKit standard for numbers-only keypad
                  - autoComplete="one-time-code": SMS/Email OTP autofill
                */}
                <input
                  ref={codeInputRef}
                  id="verification-code"
                  name="verification-code"
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="one-time-code"
                  maxLength={6}
                  disabled={isVerifying || isLocked}
                  value={verificationCode}
                  onChange={handleCodeChange}
                  placeholder="••••••"
                  className={cn(
                    "w-full text-center text-3xl tracking-[0.55em] font-mono py-3.5 px-4 rounded-lg border transition-all",
                    isVerifying || isLocked
                      ? "bg-zinc-900/40 border-zinc-800/80 text-zinc-600 cursor-not-allowed"
                      : "bg-zinc-900 border-zinc-800 text-white placeholder-zinc-700 focus:outline-none focus:border-white focus:ring-1 focus:ring-white"
                  )}
                />

                {/* Segmented Digit Visual Boxes */}
                <div className="flex justify-between items-center gap-2 mt-3 pointer-events-none">
                  {[0, 1, 2, 3, 4, 5].map((idx) => {
                    const char = verificationCode[idx];
                    const isCurrent =
                      !isVerifying &&
                      !isLocked &&
                      verificationCode.length === idx;
                    return (
                      <div
                        key={idx}
                        className={cn(
                          "flex-1 h-12 rounded-lg border flex items-center justify-center text-lg font-mono font-bold transition-all",
                          char
                            ? "border-zinc-500 bg-zinc-900 text-white shadow-inner"
                            : isCurrent
                            ? "border-white bg-zinc-900/80 text-transparent ring-1 ring-white/50"
                            : "border-zinc-800 bg-zinc-950 text-zinc-700",
                          (isVerifying || isLocked) &&
                            "border-zinc-800/60 bg-zinc-950/40 text-zinc-600"
                        )}
                      >
                        {char ||
                          (isCurrent ? (
                            <span className="w-1.5 h-4 bg-white animate-pulse" />
                          ) : (
                            "·"
                          ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              {/* Primary Verify Button */}
              <button
                type="submit"
                disabled={
                  isVerifying || isLocked || verificationCode.length !== 6
                }
                className={cn(
                  "w-full py-2.5 px-4 font-semibold rounded-lg text-sm transition-all flex items-center justify-center gap-2 shadow-sm",
                  isVerifying
                    ? "bg-zinc-800 text-zinc-400 cursor-wait"
                    : isLocked || verificationCode.length !== 6
                    ? "bg-zinc-900 text-zinc-600 border border-zinc-800 cursor-not-allowed opacity-50"
                    : "bg-white text-black hover:bg-zinc-200 active:bg-zinc-300"
                )}
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  <>
                    <span>Verify & Activate</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Resend Code Button */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={resendLoading || resendCooldown > 0}
                  className={cn(
                    "w-full py-2.5 px-4 rounded-lg text-xs font-mono font-medium transition-all flex items-center justify-center gap-2 border",
                    isLocked
                      ? "bg-white text-black hover:bg-zinc-200 border-white shadow-lg animate-bounce"
                      : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700",
                    (resendLoading || resendCooldown > 0) &&
                      "opacity-50 cursor-not-allowed animate-none"
                  )}
                >
                  {resendLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending fresh code...</span>
                    </>
                  ) : resendCooldown > 0 ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5 text-zinc-500" />
                      <span>Resend Code ({resendCooldown}s)</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span className="font-semibold">Resend Code</span>
                    </>
                  )}
                </button>
              </div>

              {/* Back to registration option */}
              <button
                type="button"
                onClick={() => {
                  setStep("register");
                  setErrorMessage(null);
                  setResendSuccess(null);
                  setIsLocked(false);
                  setIsVerifying(false);
                }}
                className="w-full text-center text-xs text-zinc-500 hover:text-zinc-300 pt-2 transition-colors"
              >
                Back to registration details
              </button>
            </div>
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
