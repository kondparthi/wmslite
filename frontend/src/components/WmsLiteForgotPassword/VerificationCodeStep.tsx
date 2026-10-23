import React, { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClock as faClockRegular } from '@fortawesome/free-regular-svg-icons';
import { faArrowLeft, faCircleCheck, faEnvelopeOpenText, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { api, ApiError } from "@/lib/api";
import type { ResetIdentity } from "./IdentifyUserStep";

const CODE_LENGTH = 6;
const CODE_LIFETIME_SECONDS = 10 * 60; // matches RESET_CODE_EXPIRE_MINUTES on the backend

const VerificationCodeStep = ({
  identity,
  onNext,
  onBack,
}: {
  identity: ResetIdentity;
  onNext?: (code: string) => void;
  onBack?: () => void;
}) => {
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [secondsLeft, setSecondsLeft] = useState(CODE_LIFETIME_SECONDS);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const t = setInterval(() => setSecondsLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");
  const code = digits.join("");

  const setDigit = (i: number, value: string) => {
    const v = value.replace(/\D/g, "").slice(-1);
    setDigits((d) => d.map((x, idx) => (idx === i ? v : x)));
    if (v && i < CODE_LENGTH - 1) inputs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
    if (e.key === "Enter") verify();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);
    if (!pasted) return;
    e.preventDefault();
    setDigits(Array.from({ length: CODE_LENGTH }, (_, i) => pasted[i] ?? ""));
    inputs.current[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus();
  };

  const body = (extra: object = {}) =>
    JSON.stringify({ tenant_id: identity.tenantId, username: identity.username, ...extra });

  const verify = async () => {
    setError(null);
    setNotice(null);
    if (code.length !== CODE_LENGTH) {
      setError("Please enter the full 6-digit code.");
      return;
    }
    if (secondsLeft === 0) {
      setError("This code has expired. Use Resend Code to get a new one.");
      return;
    }
    setLoading(true);
    try {
      await api.raw("/auth/verify-reset-code", { method: "POST", body: body({ code }) });
      onNext?.(code);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setError(null);
    setNotice(null);
    setResending(true);
    try {
      await api.raw("/auth/forgot-password", { method: "POST", body: body() });
      setDigits(Array(CODE_LENGTH).fill(""));
      setSecondsLeft(CODE_LIFETIME_SECONDS);
      setNotice("A new code has been sent.");
      inputs.current[0]?.focus();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reach the server. Please try again.");
    } finally {
      setResending(false);
    }
  };

  return (
    <>
      <div className="space-y-6" id="step-2">
        <div className="flex items-center gap-3 p-4 bg-neutral-50 border border-neutral-200 rounded-lg">
          <div className="w-10 h-10 bg-neutral-900 rounded-lg flex items-center justify-center flex-shrink-0">
            <FontAwesomeIcon icon={faEnvelopeOpenText} className="text-white text-sm" />
          </div>
          <div>
            <p className="text-sm text-neutral-900">Check your email</p>
            <p className="text-xs text-neutral-500">If <span className="text-neutral-900">{identity.username}</span> matches an account, a code was sent to its registered email.</p>
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-neutral-900 text-xl">Enter Verification Code</h3>
          <p className="text-neutral-500 text-sm">A 6-digit code was sent to your registered email. It expires in 10 minutes.</p>
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm text-neutral-700">6-Digit OTP Code</label>
          <div className="flex gap-2" onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => { inputs.current[i] = el; }}
                className="w-full py-3 border border-neutral-300 rounded-lg text-center text-lg text-neutral-900 focus:outline-none focus:border-neutral-900 focus:border-2"
                maxLength={1}
                type="text"
                inputMode="numeric"
                autoComplete={i === 0 ? "one-time-code" : "off"}
                aria-label={`Digit ${i + 1}`}
                value={d}
                onChange={(e) => setDigit(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
              />
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-neutral-500">
          <div className="flex items-center gap-1.5">
            <FontAwesomeIcon icon={faClockRegular} className="text-xs" />
            <span>Code expires in <span className="text-neutral-900">{mm}:{ss}</span></span>
          </div>
          <button
            className="text-neutral-900 underline underline-offset-2 text-xs disabled:opacity-60"
            type="button"
            onClick={resend}
            disabled={resending}
          >
            {resending ? "Sending…" : "Resend Code"}
          </button>
        </div>

        {notice && (
          <div role="status" className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{notice}</div>
        )}
        {error && (
          <div role="alert" className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
        )}

        <button
          type="button"
          onClick={verify}
          disabled={loading}
          className="w-full bg-neutral-900 text-white py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 hover:bg-neutral-700 transition-colors disabled:opacity-60"
        >
          <FontAwesomeIcon icon={loading ? faSpinner : faCircleCheck} className={`text-sm ${loading ? "animate-spin" : ""}`} />
          {loading ? "Verifying…" : "Verify Code"}
        </button>
        <button
          className="w-full border border-neutral-300 text-neutral-700 py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 hover:bg-neutral-50 transition-colors"
          type="button"
          onClick={() => onBack && onBack()}
        >
          <FontAwesomeIcon icon={faArrowLeft} className="text-sm" />
          Back
        </button>
      </div>
    </>
  );
};

export default VerificationCodeStep;
