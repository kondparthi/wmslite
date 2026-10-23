import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye as faEyeRegular, faEyeSlash } from '@fortawesome/free-regular-svg-icons';
import { faArrowLeft, faCircleCheck, faCircleXmark, faLock, faRotateRight, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { api, ApiError } from "@/lib/api";
import type { ResetIdentity } from "./IdentifyUserStep";

const inputClass =
  "w-full pl-10 pr-10 py-2.5 border border-neutral-300 rounded-lg text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent";

const ResetPasswordStep = ({
  identity,
  code,
  onBack,
}: {
  identity: ResetIdentity;
  code: string;
  onBack?: () => void;
}) => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const requirements = [
    { met: password.length >= 8, label: "At least 8 characters" },
    { met: /[A-Z]/.test(password), label: "One uppercase letter" },
    { met: /\d/.test(password), label: "One number" },
    { met: /[^A-Za-z0-9]/.test(password), label: "One special character (!@#$...)" },
  ];

  const handleReset = async () => {
    setError(null);
    if (!requirements.every((r) => r.met)) {
      setError("Your new password does not meet all the requirements below.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await api.raw("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          tenant_id: identity.tenantId,
          username: identity.username,
          code,
          new_password: password,
        }),
      });
      setDone(true);
      setTimeout(() => navigate("/"), 1800);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const eye = (shown: boolean, toggle: () => void, label: string) => (
    <button
      type="button"
      aria-label={label}
      onClick={toggle}
      className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer"
    >
      <FontAwesomeIcon icon={shown ? faEyeSlash : faEyeRegular} className="text-neutral-400 text-sm" />
    </button>
  );

  return (
    <>
      <div className="space-y-6" id="step-3">
        <div className="space-y-2">
          <h3 className="text-neutral-900 text-xl">Set New Password</h3>
          <p className="text-neutral-500 text-sm">Create a strong new password for your WMS Lite account. Password must meet the requirements below.</p>
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm text-neutral-700">New Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FontAwesomeIcon icon={faLock} className="text-neutral-400 text-sm" />
              </div>
              <input
                className={inputClass}
                placeholder="Enter new password"
                type={showPw ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {eye(showPw, () => setShowPw((v) => !v), "Show or hide new password")}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm text-neutral-700">Confirm New Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FontAwesomeIcon icon={faLock} className="text-neutral-400 text-sm" />
              </div>
              <input
                className={inputClass}
                placeholder="Confirm new password"
                type={showConfirm ? "text" : "password"}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
              {eye(showConfirm, () => setShowConfirm((v) => !v), "Show or hide confirm password")}
            </div>
          </div>
          {/* Password Requirements */}
          <div className="space-y-2">
            <p className="text-xs text-neutral-500">Password requirements:</p>
            <div className="space-y-1.5">
              {requirements.map((req) => (
                <div key={req.label} className="flex items-center gap-2">
                  <FontAwesomeIcon
                    icon={req.met ? faCircleCheck : faCircleXmark}
                    className={`text-xs ${req.met ? "text-emerald-500" : "text-neutral-300"}`}
                  />
                  <span className={`text-xs ${req.met ? "text-neutral-700" : "text-neutral-400"}`}>{req.label}</span>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div role="alert" className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
          )}
          {done && (
            <div role="status" className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              Password updated. Redirecting to sign in…
            </div>
          )}

          <button
            className="w-full bg-neutral-900 text-white py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 hover:bg-neutral-700 transition-colors disabled:opacity-60"
            type="button"
            onClick={handleReset}
            disabled={loading || done}
          >
            <FontAwesomeIcon icon={loading ? faSpinner : faRotateRight} className={`text-sm ${loading ? "animate-spin" : ""}`} />
            {loading ? "Updating…" : "Reset Password & Sign In"}
          </button>
          {onBack && (
            <button
              className="w-full border border-neutral-300 text-neutral-700 py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 hover:bg-neutral-50 transition-colors"
              type="button"
              onClick={onBack}
            >
              <FontAwesomeIcon icon={faArrowLeft} className="text-sm" />
              Back
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default ResetPasswordStep;
