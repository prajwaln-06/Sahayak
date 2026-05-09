"use client";

import { useState, useEffect, useCallback, FormEvent } from "react";
import { useRouter } from "next/navigation";
import OTPInputComponent from "@/components/OTPInput";
import LoadingSpinner from "@/components/LoadingSpinner";
import api from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

const RESEND_COOLDOWN = 60; // seconds

export default function OTPPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [otp, setOtp] = useState("");
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState("");
  const [resendTimer, setResendTimer] = useState(RESEND_COOLDOWN);

  // ── Load phone from sessionStorage ─────────────────────────
  useEffect(() => {
    const storedPhone = sessionStorage.getItem("flexispace_otp_phone");
    if (!storedPhone) {
      router.replace("/login");
      return;
    }
    setPhone(storedPhone);
  }, [router]);

  // ── Resend countdown timer ─────────────────────────────────
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  // ── Auto-submit when 6 digits entered ──────────────────────
  useEffect(() => {
    if (otp.length === 6 && !isLoading) {
      handleVerify();
    }
  }, [otp]);

  // ── Verify OTP ─────────────────────────────────────────────
  const handleVerify = useCallback(async () => {
    if (otp.length !== 6 || !phone) return;

    setIsLoading(true);
    setError("");

    try {
      const res = await api.post("/auth/verify-otp", {
        phone,
        otp,
      });

      const { access_token, refresh_token } = res.data;
      const user = await login(access_token, refresh_token);

      // Clean up
      sessionStorage.removeItem("flexispace_otp_phone");

      // Redirect: new user → setup-profile, existing → dashboard
      if (!user.full_name) {
        router.push("/setup-profile");
      } else {
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(
        axiosErr.response?.data?.detail ||
        "OTP verification failed. Please try again."
      );
      setOtp("");
    } finally {
      setIsLoading(false);
    }
  }, [otp, phone, login, router]);

  // ── Resend OTP ─────────────────────────────────────────────
  const handleResend = async () => {
    if (resendTimer > 0 || !phone) return;

    setIsResending(true);
    setError("");

    try {
      await api.post("/auth/send-otp", { phone });
      setResendTimer(RESEND_COOLDOWN);
      setOtp("");
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(
        axiosErr.response?.data?.detail ||
        "Failed to resend OTP."
      );
    } finally {
      setIsResending(false);
    }
  };

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleVerify();
  };

  // Format phone for display
  const maskedPhone = phone
    ? `${phone.slice(0, 4)}****${phone.slice(-2)}`
    : "";

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-full bg-[#0D1B2A]/5 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-[#0D1B2A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-[#0D1B2A] mb-2">
          Verify your number
        </h1>
        <p className="text-gray-500 text-sm">
          We sent a 6-digit code to{" "}
          <span className="font-medium text-gray-700">{maskedPhone}</span>
        </p>
      </div>

      {/* OTP Form */}
      <form onSubmit={handleFormSubmit} className="space-y-6">
        <OTPInputComponent
          value={otp}
          onChange={(val) => {
            setOtp(val);
            setError("");
          }}
          disabled={isLoading}
          error={error}
        />

        <button
          type="submit"
          disabled={otp.length !== 6 || isLoading}
          className={`
            w-full py-3.5 rounded-xl text-sm font-semibold transition-all duration-200
            flex items-center justify-center gap-2
            ${
              otp.length === 6 && !isLoading
                ? "bg-[#0D1B2A] text-white hover:bg-[#1B2D45] active:scale-[0.98] shadow-lg shadow-[#0D1B2A]/20"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }
          `}
        >
          {isLoading ? (
            <>
              <LoadingSpinner size="sm" className="border-gray-400 border-t-white" />
              Verifying...
            </>
          ) : (
            "Verify OTP"
          )}
        </button>
      </form>

      {/* Resend */}
      <div className="mt-6 text-center">
        {resendTimer > 0 ? (
          <p className="text-sm text-gray-400">
            Resend code in{" "}
            <span className="font-semibold text-[#0D1B2A]">
              {String(Math.floor(resendTimer / 60)).padStart(2, "0")}:
              {String(resendTimer % 60).padStart(2, "0")}
            </span>
          </p>
        ) : (
          <button
            onClick={handleResend}
            disabled={isResending}
            className="text-sm font-medium text-[#0D1B2A] hover:underline transition-all disabled:opacity-50"
          >
            {isResending ? "Sending..." : "Resend OTP"}
          </button>
        )}
      </div>

      {/* Back to login */}
      <div className="mt-4 text-center">
        <button
          onClick={() => router.push("/login")}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          &larr; Change phone number
        </button>
      </div>
    </div>
  );
}
