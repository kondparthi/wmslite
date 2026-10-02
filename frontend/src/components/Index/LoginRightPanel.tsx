import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye as faEyeRegular, faEyeSlash } from '@fortawesome/free-regular-svg-icons';
import { faArrowRightToBracket, faBuilding, faCheck, faCircleInfo, faKey, faLock, faShieldHalved, faUser, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { login, ApiError } from "@/lib/auth";

const LoginRightPanel = () => {
  const navigate = useNavigate();
  const [tenantId, setTenantId] = useState("");
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!tenantId || !usernameOrEmail || !password) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);
    try {
      await login(tenantId, usernameOrEmail, password);
      navigate("/wms-lite-dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.status === 401 ? "Invalid tenant ID, username/email, or password." : err.message);
      } else {
        setError("Could not reach the server. Is the backend running?");
      }
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm text-white placeholder-white/40 bg-white/10 focus:bg-white/15 focus:outline-none focus:ring-2 transition-all";

  return (
    <div className="relative z-10 flex flex-col items-center justify-center w-full h-dvh px-4 py-4 overflow-hidden">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-3 flex-shrink-0">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white shadow-lg flex-shrink-0">
          <svg width="26" height="26" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="32" height="32" rx="8" fill="#003A78"/>
            <text x="4" y="23" fontFamily="Arial" fontWeight="800" fontSize="18" fill="#009FE3">dp</text>
          </svg>
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-white text-lg font-bold tracking-wide">Delaplex</span>
          <span className="text-[#7CD4FF] text-[11px] font-medium tracking-widest uppercase">WMS Lite</span>
        </div>
        <span
          className="ml-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide uppercase"
          style={{ background: "rgba(124,212,255,0.14)", border: "1px solid rgba(124,212,255,0.35)", color: "#BEEBFF" }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
          Online
        </span>
      </div>

      {/* Glass card — internal scroll is a safety net for very short viewports,
          the outer shell never scrolls so the page itself never shows a scrollbar */}
      <div
        className="w-full max-w-md space-y-4 rounded-2xl p-6 overflow-y-auto"
        style={{
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.16)",
          boxShadow: "0 24px 60px -20px rgba(0,10,30,0.65)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          maxHeight: "calc(100dvh - 110px)",
        }}
      >
        {/* Header */}
        <div className="space-y-1.5">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center mb-1"
            style={{ background: "linear-gradient(135deg, #009FE3, #7CD4FF)" }}
          >
            <FontAwesomeIcon icon={faArrowRightToBracket} className="text-[#002B5C] text-sm" />
          </div>
          <h2 className="text-xl font-bold text-white">Welcome back</h2>
          <p className="text-blue-200/80 text-xs">Sign in to your WMS Lite account to continue.</p>
        </div>

        {/* Login Form */}
        <form className="space-y-4" id="login-form" onSubmit={handleSubmit}>
          {/* Warehouse / Tenant ID */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-blue-100">Warehouse / Tenant ID</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FontAwesomeIcon icon={faBuilding} className="text-sm" style={{ color: "#7CD4FF" }} />
              </div>
              <input
                className={inputClass}
                style={{ borderColor: "rgba(255,255,255,0.18)", "--tw-ring-color": "#7CD4FF" } as React.CSSProperties}
                placeholder="e.g. DELAPLEX-WH01"
                type="text"
                value={tenantId}
                onChange={e => setTenantId(e.target.value)}
                autoComplete="organization"
              />
            </div>
          </div>

          {/* Email / Username */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-blue-100">Email or Username</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FontAwesomeIcon icon={faUser} className="text-sm" style={{ color: "#7CD4FF" }} />
              </div>
              <input
                className={inputClass}
                style={{ borderColor: "rgba(255,255,255,0.18)", "--tw-ring-color": "#7CD4FF" } as React.CSSProperties}
                placeholder="Enter your email or username"
                type="text"
                value={usernameOrEmail}
                onChange={e => setUsernameOrEmail(e.target.value)}
                autoComplete="username"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-blue-100">Password</label>
              <Link
                className="text-xs font-medium hover:underline"
                style={{ color: "#7CD4FF" }}
                to="/wms-lite-forgot-password"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FontAwesomeIcon icon={faLock} className="text-sm" style={{ color: "#7CD4FF" }} />
              </div>
              <input
                className={`${inputClass} pr-10`}
                style={{ borderColor: "rgba(255,255,255,0.18)", "--tw-ring-color": "#7CD4FF" } as React.CSSProperties}
                placeholder="Enter your password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer"
              >
                <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEyeRegular} className="text-blue-200/70 text-sm" />
              </button>
            </div>
          </div>

          {/* Remember Me */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="hidden" checked={remember} onChange={e => setRemember(e.target.checked)} />
              <div
                className="w-4 h-4 border-2 rounded flex items-center justify-center bg-white/10 flex-shrink-0"
                style={{ borderColor: "#7CD4FF" }}
                onClick={() => setRemember(v => !v)}
              >
                {remember && <FontAwesomeIcon icon={faCheck} className="text-xs" style={{ color: "#7CD4FF" }} />}
              </div>
              <span className="text-xs text-blue-100">Remember me for 30 days</span>
            </label>
            <div className="flex items-center gap-1.5 text-[11px] text-blue-200/70">
              <FontAwesomeIcon icon={faShieldHalved} className="text-xs" style={{ color: "#7CD4FF" }} />
              <span>Secure login</span>
            </div>
          </div>

          {error && (
            <div className="text-xs text-red-100 bg-red-500/20 border border-red-400/40 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {/* Login Button */}
          <button
            className="w-full text-[#002B5C] py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90 shadow-md disabled:opacity-60"
            style={{ background: "linear-gradient(90deg, #7CD4FF 0%, #009FE3 100%)" }}
            type="submit"
            disabled={loading}
          >
            <FontAwesomeIcon icon={loading ? faSpinner : faArrowRightToBracket} className={`text-sm ${loading ? "animate-spin" : ""}`} />
            {loading ? "Signing in…" : "Sign In to WMS Lite"}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/15"></div>
            <span className="text-xs text-blue-200/60">or</span>
            <div className="flex-1 h-px bg-white/15"></div>
          </div>

          {/* SSO Button */}
          <button
            className="w-full py-2.5 rounded-lg text-sm border flex items-center justify-center gap-2 transition-all hover:bg-white/10 font-medium text-white"
            style={{ borderColor: "rgba(255,255,255,0.22)", background: "rgba(255,255,255,0.04)" }}
            type="button"
            title="SSO / Active Directory integration is planned for a later phase (Admin Configuration — Nice to Have)"
          >
            <FontAwesomeIcon icon={faKey} className="text-sm" style={{ color: "#7CD4FF" }} />
            Sign in with SSO / Active Directory
          </button>
        </form>

        {/* Info Note */}
        <div
          className="rounded-lg p-3 flex gap-3"
          style={{ background: "rgba(124,212,255,0.08)", border: "1px solid rgba(124,212,255,0.25)" }}
        >
          <div className="flex-shrink-0 mt-0.5">
            <FontAwesomeIcon icon={faCircleInfo} className="text-sm" style={{ color: "#7CD4FF" }} />
          </div>
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-white">Need access?</p>
            <p className="text-xs text-blue-200/70">Contact your warehouse administrator or Delaplex support to provision your account.</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-col items-center gap-1 pt-3 flex-shrink-0">
        <div className="flex items-center gap-4 text-xs text-blue-200/60">
          <a className="hover:text-[#7CD4FF] transition-colors" href="#">Privacy Policy</a>
          <span>·</span>
          <a className="hover:text-[#7CD4FF] transition-colors" href="#">Terms of Use</a>
          <span>·</span>
          <a className="hover:text-[#7CD4FF] transition-colors" href="#">Support</a>
        </div>
        <p className="text-xs text-blue-200/50">© 2026 WMS Lite by Delaplex</p>
      </div>
    </div>
  );
};

export default LoginRightPanel;
