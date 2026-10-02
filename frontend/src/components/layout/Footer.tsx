import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Globe, Clock, User, Wifi, Shield, Info, ChevronUp, Database, Server, Lock, RefreshCw, AlertTriangle, CheckCircle2, HelpCircle, FileText } from 'lucide-react';
import { getStoredUser, getToken } from '@/lib/auth';
import { useAdminUsers } from '@/hooks/useAdminConfigApi';

function initialsOf(name: string | null | undefined, fallback: string): string {
  const source = (name && name.trim()) || fallback;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function elapsedSince(iso: string | null | undefined): string {
  if (!iso) return '—';
  const then = new Date(iso.endsWith('Z') ? iso : iso + 'Z').getTime();
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

const Footer = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [expanded, setExpanded] = useState(false);

  // Real logged-in user, same source as the top Header — no more a
  // fixed "James Hartwell" fixture down here either.
  const authUser = useMemo(() => getStoredUser(), []);
  const { data: adminUsers } = useAdminUsers();
  const adminUser = useMemo(() => adminUsers?.find(u => u.id === authUser?.id), [adminUsers, authUser]);
  const displayName = authUser?.full_name || authUser?.username || 'Signed-in user';
  const displayInitials = initialsOf(authUser?.full_name, authUser?.username || 'U');
  const token = getToken();
  const sessionTag = token ? token.slice(-8).toUpperCase() : '—';

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) =>
    date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

  const formatDate = (date: Date) =>
    date.toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const tzLabel = timezone.split('/')[1]?.replace(/_/g, ' ') ?? timezone;

  const utcOffset = (() => {
    const off = -new Date().getTimezoneOffset();
    const sign = off >= 0 ? '+' : '-';
    const h = String(Math.floor(Math.abs(off) / 60)).padStart(2, '0');
    const m = String(Math.abs(off) % 60).padStart(2, '0');
    return `UTC${sign}${h}:${m}`;
  })();

  return (
    <footer className="bg-white border-t border-neutral-200 flex-shrink-0" id="footer">

      {/* ── Expanded System Details Panel ── */}
      {expanded && (
        <div className="border-b border-neutral-100 bg-neutral-50 px-6 py-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">

            {/* Application */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-1.5">
                <Info className="w-3 h-3" /> Application
              </p>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-[11px] text-neutral-400">Name</span>
                  <span className="text-[11px] font-semibold text-neutral-700">WMS Lite</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[11px] text-neutral-400">Version</span>
                  <span className="text-[11px] font-semibold text-neutral-700">v2.4.1</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[11px] text-neutral-400">Build</span>
                  <span className="text-[11px] font-semibold text-neutral-700">20260714-0842</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[11px] text-neutral-400">Env</span>
                  <span className="text-[11px] font-semibold text-emerald-600">Production</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[11px] text-neutral-400">Release</span>
                  <span className="text-[11px] font-semibold text-neutral-700">14 Jul 2026</span>
                </div>
              </div>
            </div>

            {/* Session */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-1.5">
                <User className="w-3 h-3" /> Session
              </p>
              <div className="space-y-1">
                <div className="flex justify-between gap-2">
                  <span className="text-[11px] text-neutral-400">User</span>
                  <span className="text-[11px] font-semibold text-neutral-700 truncate">{displayName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[11px] text-neutral-400">Role</span>
                  <span className="text-[11px] font-semibold text-neutral-700">{authUser?.role || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[11px] text-neutral-400">Tenant</span>
                  <span className="text-[11px] font-semibold text-neutral-700">{authUser?.tenant_id || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[11px] text-neutral-400">Session</span>
                  <span className="text-[11px] font-semibold text-neutral-700">{sessionTag}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[11px] text-neutral-400">Login</span>
                  <span className="text-[11px] font-semibold text-neutral-700">
                    {adminUser?.last_login_at ? new Date(adminUser.last_login_at.endsWith('Z') ? adminUser.last_login_at : adminUser.last_login_at + 'Z').toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Locale */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-1.5">
                <Globe className="w-3 h-3" /> Locale
              </p>
              <div className="space-y-1">
                <div className="flex justify-between gap-2">
                  <span className="text-[11px] text-neutral-400">Timezone</span>
                  <span className="text-[11px] font-semibold text-neutral-700 truncate">{tzLabel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[11px] text-neutral-400">Offset</span>
                  <span className="text-[11px] font-semibold text-neutral-700">{utcOffset}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[11px] text-neutral-400">Date Fmt</span>
                  <span className="text-[11px] font-semibold text-neutral-700">DD/MM/YYYY</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[11px] text-neutral-400">Currency</span>
                  <span className="text-[11px] font-semibold text-neutral-700">USD ($)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[11px] text-neutral-400">Language</span>
                  <span className="text-[11px] font-semibold text-neutral-700">English (US)</span>
                </div>
              </div>
            </div>

            {/* Infrastructure */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-1.5">
                <Server className="w-3 h-3" /> Infrastructure
              </p>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-[11px] text-neutral-400">API</span>
                  <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-2.5 h-2.5" /> Online</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[11px] text-neutral-400">Database</span>
                  <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-2.5 h-2.5" /> Healthy</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[11px] text-neutral-400">Cache</span>
                  <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-2.5 h-2.5" /> Active</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[11px] text-neutral-400">Region</span>
                  <span className="text-[11px] font-semibold text-neutral-700">US-East-1</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[11px] text-neutral-400">Latency</span>
                  <span className="text-[11px] font-semibold text-neutral-700">12 ms</span>
                </div>
              </div>
            </div>

            {/* Security */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-1.5">
                <Lock className="w-3 h-3" /> Security
              </p>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-[11px] text-neutral-400">Auth</span>
                  <span className="text-[11px] font-semibold text-emerald-600">JWT / SSO</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[11px] text-neutral-400">2FA</span>
                  <span className="text-[11px] font-semibold text-emerald-600">Enabled</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[11px] text-neutral-400">Session exp</span>
                  <span className="text-[11px] font-semibold text-amber-600">47 min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[11px] text-neutral-400">IP Lock</span>
                  <span className="text-[11px] font-semibold text-emerald-600">Active</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[11px] text-neutral-400">Audit Log</span>
                  <span className="text-[11px] font-semibold text-emerald-600">On</span>
                </div>
              </div>
            </div>

            {/* Sync / Data */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-1.5">
                <RefreshCw className="w-3 h-3" /> Sync
              </p>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-[11px] text-neutral-400">Last Sync</span>
                  <span className="text-[11px] font-semibold text-neutral-700">2 min ago</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[11px] text-neutral-400">ERP</span>
                  <span className="text-[11px] font-semibold text-emerald-600">Synced</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[11px] text-neutral-400">TMS</span>
                  <span className="text-[11px] font-semibold text-emerald-600">Synced</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[11px] text-neutral-400">EDI</span>
                  <span className="text-[11px] font-semibold text-amber-600">Pending</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[11px] text-neutral-400">Next sync</span>
                  <span className="text-[11px] font-semibold text-neutral-700">3 min</span>
                </div>
              </div>
            </div>

          </div>

          {/* System health bar */}
          <div className="mt-3 pt-3 border-t border-neutral-200 flex flex-wrap items-center gap-x-6 gap-y-1">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[11px] font-semibold text-emerald-600">All Systems Operational</span>
            </div>
            <span className="text-[11px] text-neutral-400">Warehouse: <span className="font-semibold text-neutral-600">{adminUser?.warehouse_code || '—'}</span></span>
            <span className="text-[11px] text-neutral-400">License: <span className="font-semibold text-neutral-600">Enterprise · Expires 31 Dec 2026</span></span>
            <span className="text-[11px] text-neutral-400">Support: <span className="font-semibold text-blue-600 cursor-pointer hover:underline">support@delaplex.com</span></span>
          </div>
        </div>
      )}

      {/* ── Main Footer Bar ── */}
      <div className="px-6 py-2.5 flex items-center justify-between gap-4 flex-wrap">

        {/* Left: Copyright + Links */}
        <div className="flex items-center gap-2.5 text-xs text-neutral-400 flex-wrap">
          <span className="font-semibold" style={{ color: '#003A78' }}>© 2026 WMS Lite</span>
          <span className="text-neutral-200">|</span>
          <span>Powered by <span className="font-semibold" style={{ color: '#009FE3' }}>Delaplex</span></span>
          <span className="text-neutral-200">|</span>
          <Link to="/privacy-policy" className="hover:text-neutral-700 transition-colors flex items-center gap-1">
            <FileText className="w-3 h-3" />Privacy
          </Link>
          <span className="hidden sm:inline text-neutral-200">·</span>
          <Link to="/terms-and-conditions" className="hidden sm:inline hover:text-neutral-700 transition-colors">Terms</Link>
          <span className="hidden sm:inline text-neutral-200">·</span>
          <Link to="/support" className="hidden sm:inline hover:text-neutral-700 transition-colors flex items-center gap-1">
            <HelpCircle className="w-3 h-3" />Support
          </Link>
          <span className="hidden sm:inline text-neutral-200">·</span>
          <Link to="/report-issue" className="hidden sm:inline hover:text-neutral-700 transition-colors flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />Report Issue
          </Link>
        </div>

        {/* Center: App Params */}
        <div className="hidden lg:flex items-center gap-3 text-xs text-neutral-400">
          <div className="flex items-center gap-1.5 bg-neutral-50 border border-neutral-100 rounded-full px-2.5 py-1">
            <Info className="w-3 h-3 text-neutral-400" />
            <span className="font-semibold text-neutral-600">v2.4.1</span>
            <span className="text-neutral-300">·</span>
            <span className="text-neutral-400">Build 0842</span>
          </div>

          <div className="flex items-center gap-1.5 bg-neutral-50 border border-neutral-100 rounded-full px-2.5 py-1">
            <Shield className="w-3 h-3 text-neutral-400" />
            <span className="font-semibold text-neutral-600">{authUser?.tenant_id || '—'}</span>
          </div>

          <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 rounded-full px-2.5 py-1">
            <Wifi className="w-3 h-3 text-emerald-500" />
            <span className="font-semibold text-emerald-600">Live</span>
            <span className="text-emerald-300">·</span>
            <span className="text-emerald-500 text-[10px]">12ms</span>
          </div>
        </div>

        {/* Right: User + Time + Expand */}
        <div className="flex items-center gap-2 text-xs text-neutral-400">

          {/* Logged-in user pill — real authenticated user, real elapsed session time */}
          <div className="hidden md:flex items-center gap-1.5 bg-neutral-50 border border-neutral-200 rounded-full px-2.5 py-1">
            <div className="w-4 h-4 rounded-full bg-neutral-800 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold" style={{ fontSize: '8px' }}>{displayInitials}</span>
            </div>
            <span className="text-neutral-600 font-semibold">{displayName}</span>
            <span className="text-neutral-300">·</span>
            <span className="text-neutral-400">{authUser?.role || '—'}</span>
            <span className="text-neutral-300">·</span>
            <span className="text-amber-500 font-medium">{elapsedSince(adminUser?.last_login_at)}</span>
          </div>

          <span className="hidden md:inline text-neutral-200">|</span>

          {/* Timezone pill */}
          <div className="hidden md:flex items-center gap-1.5 bg-neutral-50 border border-neutral-100 rounded-full px-2.5 py-1">
            <Globe className="w-3 h-3 text-neutral-400" />
            <span className="text-neutral-600">{tzLabel}</span>
            <span className="text-neutral-300">·</span>
            <span className="text-neutral-500">{utcOffset}</span>
          </div>

          {/* Live clock */}
          <div className="flex items-center gap-1.5 text-white rounded-full px-2.5 py-1 font-mono" style={{ background: '#003A78' }}>
            <Clock className="w-3 h-3" />
            <span className="text-[11px] font-medium">{formatTime(currentTime)}</span>
          </div>

          {/* Details toggle */}
          <button
            onClick={() => setExpanded(!expanded)}
            title="Toggle application parameters"
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-medium transition-all ${
              expanded
                ? 'text-white border-transparent'
                : 'border-neutral-200 text-neutral-400 hover:text-[#003A78]'
            }`}
            style={expanded ? { background: '#009FE3', borderColor: '#009FE3' } : {}}
          >
            <ChevronUp className={`w-3 h-3 transition-transform duration-200 ${expanded ? 'rotate-0' : 'rotate-180'}`} />
            <span className="hidden sm:inline">{expanded ? 'Hide' : 'Details'}</span>
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;