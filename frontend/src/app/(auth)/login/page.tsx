"use client";

import { useState, FormEvent } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import PhoneInput from "@/components/PhoneInput";
import LoadingSpinner from "@/components/LoadingSpinner";
import api from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const isValid = phone.length === 10;

  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/dashboard");
    }
  }, [authLoading, user, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setIsLoading(true);
    setError("");

    try {
      const fullPhone = `+91${phone}`;
      await api.post("/auth/send-otp", { phone: fullPhone });

      // Store phone for the OTP page
      sessionStorage.setItem("flexispace_otp_phone", fullPhone);
      router.push("/otp");
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(
        axiosErr.response?.data?.detail ||
        "Failed to send OTP. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-[#0D1B2A] mb-2">
          Welcome to FlexiSpace
        </h1>
        <p className="text-gray-500 text-sm">
          Enter your phone number to get started
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <PhoneInput
          value={phone}
          onChange={(val) => {
            setPhone(val);
            setError("");
          }}
          disabled={isLoading}
          error={error}
        />

        <button
          type="submit"
          disabled={!isValid || isLoading}
          className={`
            w-full py-3.5 rounded-xl text-sm font-semibold transition-all duration-200
            flex items-center justify-center gap-2
            ${
              isValid && !isLoading
                ? "bg-[#0D1B2A] text-white hover:bg-[#1B2D45] active:scale-[0.98] shadow-lg shadow-[#0D1B2A]/20"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }
          `}
        >
          {isLoading ? (
            <>
              <LoadingSpinner size="sm" className="border-gray-400 border-t-white" />
              Sending OTP...
            </>
          ) : (
            "Send OTP"
          )}
        </button>
      </form>

      {/* Terms */}
      <p className="mt-6 text-center text-xs text-gray-400 leading-relaxed">
        By continuing, you agree to FlexiSpace&apos;s{" "}
        <a href="#" className="underline hover:text-gray-600">
          Terms of Service
        </a>{" "}
        and{" "}
        <a href="#" className="underline hover:text-gray-600">
          Privacy Policy
        </a>
        .
      </p>
    </div>
  );
}
