import React, { useState } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faBuilding, faPaperPlane, faSpinner, faUser } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "@/lib/api";

export interface ResetIdentity {
  tenantId: string;
  username: string;
}

const inputClass =
  "w-full pl-10 pr-4 py-2.5 border border-neutral-300 rounded-lg text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent";

const IdentifyUserStep = ({
  initial,
  onNext,
}: {
  initial?: ResetIdentity;
  onNext?: (identity: ResetIdentity) => void;
}) => {
  const navigate = useNavigate();
  const [tenantId, setTenantId] = useState(initial?.tenantId ?? "");
  const [username, setUsername] = useState(initial?.username ?? "");
  const [method, setMethod] = useState<"otp" | "admin">("otp");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!tenantId.trim() || !username.trim()) {
      setError("Please enter your Warehouse / Tenant ID and your email or username.");
      return;
    }
    if (method === "admin") {
      setError("Please contact your warehouse administrator to have your password reset.");
      return;
    }
    setLoading(true);
    try {
      await api.raw("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ tenant_id: tenantId.trim(), username: username.trim() }),
      });
      onNext?.({ tenantId: tenantId.trim(), username: username.trim() });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="space-y-6" id="step-1">
        <div className="space-y-2">
          <h2 className="text-neutral-900 text-3xl">Forgot Password?</h2>
          <p className="text-neutral-500 text-sm">
            Enter your email or username and we'll send you a verification code to reset your password.
          </p>
        </div>
        <form className="space-y-5" id="identify-form" onSubmit={handleSubmit}>
          {/* Warehouse / Tenant ID */}
          <div className="space-y-1.5">
            <label className="block text-sm text-neutral-700">Warehouse / Tenant ID</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FontAwesomeIcon icon={faBuilding} className="text-neutral-400 text-sm" />
              </div>
              <input
                className={inputClass}
                placeholder="e.g. DELAPLEX-WH01"
                type="text"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
              />
            </div>
            <p className="text-xs text-neutral-400">Your organization's unique warehouse identifier</p>
          </div>
          {/* Email / Username */}
          <div className="space-y-1.5">
            <label className="block text-sm text-neutral-700">Email or Username</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FontAwesomeIcon icon={faUser} className="text-neutral-400 text-sm" />
              </div>
              <input
                className={inputClass}
                placeholder="Enter your registered email or username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>
          {/* Recovery Method */}
          <div className="space-y-2">
            <label className="block text-sm text-neutral-700">Recovery Method</label>
            <div className="grid grid-cols-2 gap-3">
              {([
                { key: "otp", title: "Email OTP", sub: "Send code to email" },
                { key: "admin", title: "Admin Reset", sub: "Contact administrator" },
              ] as const).map((opt) => {
                const selected = method === opt.key;
                return (
                  <label
                    key={opt.key}
                    className={`flex items-center gap-3 rounded-lg p-3 cursor-pointer ${
                      selected ? "border-2 border-neutral-900 bg-neutral-50" : "border border-neutral-200 bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="recovery-method"
                      className="sr-only"
                      checked={selected}
                      onChange={() => { setMethod(opt.key); setError(null); }}
                    />
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selected ? "border-neutral-900" : "border-neutral-300"}`}>
                      {selected && <div className="w-2 h-2 rounded-full bg-neutral-900"></div>}
                    </div>
                    <div>
                      <p className={`text-xs ${selected ? "text-neutral-900" : "text-neutral-700"}`}>{opt.title}</p>
                      <p className="text-xs text-neutral-500">{opt.sub}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {error && (
            <div role="alert" className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            className="w-full bg-neutral-900 text-white py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 hover:bg-neutral-700 transition-colors disabled:opacity-60"
            type="submit"
            disabled={loading}
          >
            <FontAwesomeIcon icon={loading ? faSpinner : faPaperPlane} className={`text-sm ${loading ? "animate-spin" : ""}`} />
            {loading ? "Sending…" : "Send Verification Code"}
          </button>
        </form>
        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-neutral-200"></div>
          <span className="text-xs text-neutral-400">or</span>
          <div className="flex-1 h-px bg-neutral-200"></div>
        </div>
        {/* Back to Login */}
        <button
          className="w-full border border-neutral-300 text-neutral-700 py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 hover:bg-neutral-50 transition-colors"
          type="button"
          onClick={() => navigate("/")}
        >
          <FontAwesomeIcon icon={faArrowLeft} className="text-sm" />
          Back to Sign In
        </button>
      </div>
    </>
  );
};

export default IdentifyUserStep;
