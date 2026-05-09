"use client";

import React, { useRef, useCallback, useEffect } from "react";

interface OTPInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  error?: string;
}

export default function OTPInput({
  value,
  onChange,
  length = 6,
  disabled = false,
  error,
}: OTPInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first empty box on mount
  useEffect(() => {
    const firstEmpty = value.length;
    if (firstEmpty < length) {
      inputRefs.current[firstEmpty]?.focus();
    }
  }, []);

  const handleChange = useCallback(
    (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
      const digit = e.target.value.replace(/\D/g, "");
      if (!digit) return;

      // Take only the last typed digit
      const newChar = digit.slice(-1);
      const newValue = value.substring(0, index) + newChar + value.substring(index + 1);
      onChange(newValue.slice(0, length));

      // Auto-advance to next box
      if (index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [value, onChange, length]
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace") {
        e.preventDefault();
        if (value[index]) {
          // Clear current box
          const newValue = value.substring(0, index) + value.substring(index + 1);
          onChange(newValue);
        } else if (index > 0) {
          // Move to previous box and clear it
          inputRefs.current[index - 1]?.focus();
          const newValue = value.substring(0, index - 1) + value.substring(index);
          onChange(newValue);
        }
      } else if (e.key === "ArrowLeft" && index > 0) {
        inputRefs.current[index - 1]?.focus();
      } else if (e.key === "ArrowRight" && index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [value, onChange, length]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
      if (pasted) {
        onChange(pasted);
        const focusIndex = Math.min(pasted.length, length - 1);
        inputRefs.current[focusIndex]?.focus();
      }
    },
    [onChange, length]
  );

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-3">
        Enter OTP
      </label>

      <div className="flex gap-2.5 justify-center" onPaste={handlePaste}>
        {Array.from({ length }, (_, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={1}
            value={value[i] || ""}
            onChange={(e) => handleChange(i, e)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onFocus={(e) => e.target.select()}
            disabled={disabled}
            className={`
              w-12 h-14 text-center text-xl font-bold rounded-xl border-2
              transition-all duration-200 outline-none
              ${disabled ? "opacity-50 cursor-not-allowed bg-gray-50" : "bg-white"}
              ${error ? "border-red-400 text-red-600" : "border-gray-200"}
              ${value[i] ? "border-[#0D1B2A] text-[#0D1B2A]" : ""}
              focus:border-[#0D1B2A] focus:ring-2 focus:ring-[#0D1B2A]/10
            `}
          />
        ))}
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-500 text-center flex items-center justify-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}
