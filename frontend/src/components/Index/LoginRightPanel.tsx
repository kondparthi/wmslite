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
    "w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm text-neutral-900 placeholder-neutral-400 bg-neutral-50/70 focus:bg-white focus:outline-none focus:ring-2 transition-all";

  return (
    <>
      <div
        className="flex flex-col justify-center items-center w-full lg:w-1/2 bg-[radial-gradient(circle_at_top_right,_#EAF6FF,_#FFFFFF_55%)] px-6 py-12 min-h-[700px] h-[100dvh]"
        id="login-right-panel"
      >
        {/* Mobile Logo */}
        <div className="flex lg:hidden items-center gap-3 mb-10">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-white shadow-md border border-gray-100">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="32" height="32" rx="8" fill="#003A78"/>
              <text x="4" y="23" fontFamily="Arial" fontWeight="800" fontSize="18" fill="#009FE3">dp</text>
            </svg>
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-bold text-lg tracking-wide" style={{ color: "#003A78" }}>Delaplex</span>
            <span className="text-xs font-medium tracking-widest uppercase" style={{ color: "#009FE3" }}>WMS Lite</span>
          </div>
        </div>

        <div
          className="w-full max-w-md space-y-7 bg-white rounded-2xl border border-neutral-100 shadow-[0_18px_50px_-20px_rgba(0,58,120,0.25)] p-8"
        >
          {/* Header */}
          <div className="space-y-2">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center mb-1"
              style={{ background: "linear-gradient(135deg, #003A78, #009FE3)" }}
            >
              <FontAwesomeIcon icon={faArrowRightToBracket} className="text-white text-sm" />
            </div>
            <h2 className="text-2xl font-bold" style={{ color: "#003A78" }}>Welcome back</h2>
            <p className="text-neutral-500 text-sm">Sign in to your WMS Lite account to continue.</p>
          </div>

          {/* Login Form */}
          <form className="space-y-5" id="login-form" onSubmit={handleSubmit}>
            {/* Warehouse / Tenant ID */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium" style={{ color: "#003A78" }}>Warehouse / Tenant ID</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FontAwesomeIcon icon={faBuilding} className="text-sm" style={{ color: "#009FE3" }} />
                </div>
                <input
                  className={inputClass}
                  style={{ borderColor: "#DCE7F2", "--tw-ring-color": "#009FE3" } as React.CSSProperties}
                  placeholder="e.g. DELAPLEX-WH01"
                  type="text"
                  value={tenantId}
                  onChange={e => setTenantId(e.target.value)}
                  autoComplete="organization"
                />
              </div>
              <p className="text-xs text-neutral-400">Your organization's unique warehouse identifier</p>
            </div>

            {/* Email / Username */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium" style={{ color: "#003A78" }}>Email or Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FontAwesomeIcon icon={faUser} className="text-sm" style={{ color: "#009FE3" }} />
                </div>
                <input
                  className={inputClass}
                  style={{ borderColor: "#DCE7F2", "--tw-ring-color": "#009FE3" } as React.CSSProperties}
                  placeholder="Enter your email or username"
                  type="text"
                  value={usernameOrEmail}
                  onChange={e => setUsernameOrEmail(e.target.value)}
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium" style={{ color: "#003A78" }}>Password</label>
                <Link
                  className="text-xs font-medium hover:underline"
                  style={{ color: "#009FE3" }}
                  to="/wms-lite-forgot-password"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FontAwesomeIcon icon={faLock} className="text-sm" style={{ color: "#009FE3" }} />
                </div>
                <input
                  className={`${inputClass} pr-10`}
                  style={{ borderColor: "#DCE7F2", "--tw-ring-color": "#009FE3" } as React.CSSProperties}
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
                  <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEyeRegular} className="text-neutral-400 text-sm" />
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="hidden" checked={remember} onChange={e => setRemember(e.target.checked)} />
                <div
                  className="w-4 h-4 border-2 rounded flex items-center justify-center bg-white flex-shrink-0"
                  style={{ borderColor: "#009FE3" }}
                  onClick={() => setRemember(v => !v)}
                >
                  {remember && <FontAwesomeIcon icon={faCheck} className="text-xs" style={{ color: "#009FE3" }} />}
                </div>
                <span className="text-sm text-neutral-600">Remember me for 30 days</span>
              </label>
              <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                <FontAwesomeIcon icon={faShieldHalved} className="text-xs" style={{ color: "#009FE3" }} />
                <span>Secure login</span>
              </div>
            </div>

            {error && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            {/* Login Button */}
            <button
              className="w-full text-white py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90 shadow-md disabled:opacity-60"
              style={{ background: "linear-gradient(90deg, #003A78 0%, #009FE3 100%)" }}
              type="submit"
              disabled={loading}
            >
              <FontAwesomeIcon icon={loading ? faSpinner : faArrowRightToBracket} className={`text-sm ${loading ? "animate-spin" : ""}`} />
              {loading ? "Signing in…" : "Sign In to WMS Lite"}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-neutral-200"></div>
              <span className="text-xs text-neutral-400">or</span>
              <div className="flex-1 h-px bg-neutral-200"></div>
            </div>

            {/* SSO Button */}
            <button
              className="w-full bg-white py-2.5 rounded-lg text-sm border flex items-center justify-center gap-2 transition-all hover:bg-blue-50 font-medium"
              style={{ borderColor: "#009FE3", color: "#003A78" }}
              type="button"
              title="SSO / Active Directory integration is planned for a later phase (Admin Configuration — Nice to Have)"
            >
              <FontAwesomeIcon icon={faKey} className="text-sm" style={{ color: "#009FE3" }} />
              Sign in with SSO / Active Directory
            </button>
          </form>

          {/* Info Note */}
          <div
            className="rounded-lg p-4 flex gap-3"
            style={{ background: "rgba(0,159,227,0.06)", border: "1px solid rgba(0,159,227,0.25)" }}
          >
            <div className="flex-shrink-0 mt-0.5">
              <FontAwesomeIcon icon={faCircleInfo} className="text-sm" style={{ color: "#009FE3" }} />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-semibold" style={{ color: "#003A78" }}>Need access?</p>
              <p className="text-xs text-neutral-500">Contact your warehouse administrator or Delaplex support to provision your account.</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col items-center gap-2 pt-6">
          <div className="flex items-center gap-4 text-xs text-neutral-400">
            <a className="hover:text-[#009FE3] transition-colors" href="#">Privacy Policy</a>
            <span>·</span>
            <a className="hover:text-[#009FE3] transition-colors" href="#">Terms of Use</a>
            <span>·</span>
            <a className="hover:text-[#009FE3] transition-colors" href="#">Support</a>
          </div>
          <p className="text-xs text-neutral-400">© 2026 WMS Lite by Delaplex</p>
        </div>
      </div>
    </>
  );
};

export default LoginRightPanel;
