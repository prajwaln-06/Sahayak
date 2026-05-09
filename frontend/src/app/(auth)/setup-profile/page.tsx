"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import LoadingSpinner from "@/components/LoadingSpinner";
import api from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

export default function SetupProfilePage() {
  const router = useRouter();
  const { user, isLoading: authLoading, refreshUser } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [wantsHost, setWantsHost] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  // Pre-fill existing data
  useEffect(() => {
    if (user) {
      if (user.full_name) setFullName(user.full_name);
      if (user.email) setEmail(user.email);
    }
  }, [user]);

  const isValidEmail = (val: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

  const canSubmit =
    fullName.trim().length >= 2 && (!email || isValidEmail(email));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    setError("");
    setSuccess("");

    try {
      // 1. Update profile
      await api.post("/auth/update-profile", {
        full_name: fullName.trim(),
      });

      // 2. Send email verification if email provided
      if (email && !user?.is_email_verified) {
        try {
          await api.post("/auth/send-email-verification", {
            email: email.trim(),
          });
          setSuccess(
            wantsHost
              ? "Profile saved! Check your email to verify — verification is required to list spaces."
              : "Profile saved! Check your email for the verification link."
          );
        } catch (emailErr: unknown) {
          const axiosErr = emailErr as { response?: { data?: { detail?: string } } };
          // Profile was saved, email failed — not a blocker
          setSuccess("Profile saved!");
          setError(
            axiosErr.response?.data?.detail ||
            "Email verification couldn't be sent, but your profile is saved."
          );
        }
      } else {
        setSuccess("Profile saved!");
      }

      // 3. Refresh user data
      await refreshUser();

      // 4. Store host intent for later (after email verification)
      if (wantsHost) {
        localStorage.setItem("flexispace_host_intent", "true");
      }

      // 5. Redirect after a brief delay so user sees the success message
      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(
        axiosErr.response?.data?.detail ||
        "Failed to update profile. Please try again."
      );
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-[#0D1B2A] mb-2">
          Set up your profile
        </h1>
        <p className="text-gray-500 text-sm">
          Tell us a bit about yourself
        </p>
      </div>

      {/* Success message */}
      {success && (
        <div className="mb-6 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-start gap-2">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {success}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mb-6 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm flex items-start gap-2">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Full Name */}
        <div>
          <label htmlFor="full-name" className="block text-sm font-medium text-gray-700 mb-1.5">
            Full Name <span className="text-red-400">*</span>
          </label>
          <input
            id="full-name"
            type="text"
            placeholder="John Doe"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={isSubmitting}
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-900
              placeholder:text-gray-400 outline-none transition-all duration-200
              focus:border-[#0D1B2A] focus:ring-2 focus:ring-[#0D1B2A]/10
              disabled:opacity-50 disabled:bg-gray-50"
          />
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
            Email Address
            <span className="text-gray-400 font-normal ml-1">(optional)</span>
          </label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting}
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-900
              placeholder:text-gray-400 outline-none transition-all duration-200
              focus:border-[#0D1B2A] focus:ring-2 focus:ring-[#0D1B2A]/10
              disabled:opacity-50 disabled:bg-gray-50"
          />
          {email && !isValidEmail(email) && (
            <p className="mt-1 text-xs text-red-500">
              Please enter a valid email address
            </p>
          )}
        </div>

        {/* Host toggle */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-800">
              I want to list a space
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Become a host and earn from your spaces
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={wantsHost}
            onClick={() => setWantsHost(!wantsHost)}
            disabled={isSubmitting}
            className={`
              relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0
              ${wantsHost ? "bg-[#0D1B2A]" : "bg-gray-300"}
              ${isSubmitting ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
            `}
          >
            <span
              className={`
                absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm
                transition-transform duration-200
                ${wantsHost ? "translate-x-5" : "translate-x-0"}
              `}
            />
          </button>
        </div>

        {/* Host email hint */}
        {wantsHost && !email && (
          <p className="text-xs text-amber-600 flex items-center gap-1 -mt-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            Email is required for host registration
          </p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={!canSubmit || isSubmitting}
          className={`
            w-full py-3.5 rounded-xl text-sm font-semibold transition-all duration-200
            flex items-center justify-center gap-2
            ${
              canSubmit && !isSubmitting
                ? "bg-[#0D1B2A] text-white hover:bg-[#1B2D45] active:scale-[0.98] shadow-lg shadow-[#0D1B2A]/20"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }
          `}
        >
          {isSubmitting ? (
            <>
              <LoadingSpinner size="sm" className="border-gray-400 border-t-white" />
              Saving...
            </>
          ) : (
            "Continue"
          )}
        </button>
      </form>

      {/* Skip */}
      <div className="mt-4 text-center">
        <button
          onClick={() => router.push("/dashboard")}
          disabled={isSubmitting}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
        >
          Skip for now &rarr;
        </button>
      </div>
    </div>
  );
}
