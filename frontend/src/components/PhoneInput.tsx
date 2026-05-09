"use client";

import React, { useState, useRef, useCallback } from "react";

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
}

export default function PhoneInput({
  value,
  onChange,
  disabled = false,
  error,
}: PhoneInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      // Allow only digits, max 10
      const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
      onChange(digits);
    },
    [onChange]
  );

  const isValid = value.length === 10;

  return (
    <div className="w-full">
      <label
        htmlFor="phone-input"
        className="block text-sm font-medium text-gray-700 mb-1.5"
      >
        Phone Number
      </label>
      <div
        className={`
          flex items-center rounded-xl border-2 transition-all duration-200
          ${focused ? "border-[#0D1B2A] ring-2 ring-[#0D1B2A]/10" : "border-gray-200"}
          ${error ? "border-red-400 ring-2 ring-red-100" : ""}
          ${disabled ? "opacity-50 cursor-not-allowed bg-gray-50" : "bg-white"}
        `}
        onClick={() => inputRef.current?.focus()}
      >
        {/* India flag + prefix */}
        <div className="flex items-center gap-1.5 pl-4 pr-3 py-3 border-r border-gray-200 select-none">
          <span className="text-xl leading-none">🇮🇳</span>
          <span className="text-sm font-semibold text-gray-600">+91</span>
        </div>

        <input
          ref={inputRef}
          id="phone-input"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          placeholder="98765 43210"
          value={value.replace(/(\d{5})(\d{0,5})/, "$1 $2").trim()}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          disabled={disabled}
          className="flex-1 px-3 py-3 text-base tracking-wider text-gray-900 placeholder:text-gray-400 bg-transparent outline-none"
        />

        {/* Validation indicator */}
        {value.length > 0 && (
          <div className="pr-3">
            {isValid ? (
              <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <span className="text-xs text-gray-400 font-medium">
                {10 - value.length}
              </span>
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}
