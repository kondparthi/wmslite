import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBars, faMagnifyingGlass, faBell, faRotateRight, faChevronDown,
  faTriangleExclamation, faCircleCheck, faCircleInfo,
  faGear, faUserEdit, faShieldAlt, faCircleUser, faClockRotateLeft, faXmark,
  faEnvelope, faCalendarDays, faLock, faKey,
  faIdBadge, faPen, faCheckDouble, faTrash, faWarehouse,
  faLocationDot, faClock, faDesktop, faFingerprint,
  faArrowRightFromBracket
} from '@fortawesome/free-solid-svg-icons';
import { getStoredUser, logout as authLogout } from '@/lib/auth';
import { useAdminUsers, useLoginHistory } from '@/hooks/useAdminConfigApi';
import { useNotificationLog } from '@/hooks/useNotificationOpsApi';

const routeConfig: Record<string, { title: string; subtitle: string; searchPlaceholder: string }> = {
  '/wms-lite-dashboard': {
    title: 'Operations Dashboard',
    subtitle: 'Live data',
    searchPlaceholder: 'Search orders, SKUs, tasks...',
  },
  '/wms-lite-master-data': {
    title: 'Master Data Management',
    subtitle: 'Configure reference data and warehouse parameters',
    searchPlaceholder: 'Search master data...',
  },
  '/wms-lite-inbound': {
    title: 'Inbound Operations',
    subtitle: 'Manage ASN, receiving, putaway, appointments and inbound tasks',
    searchPlaceholder: 'Search inbound...',
  },
  '/wms-lite-inventory': {
    title: 'Inventory Management',
    subtitle: 'Balance, movements, adjustments, cycle count and kitting',
    searchPlaceholder: 'Search inventory...',
  },
  '/wms-lite-outbound': {
    title: 'Outbound Operations',
    subtitle: 'Orders, picking, packing, shipping and dispatch',
    searchPlaceholder: 'Search outbound...',
  },
  '/wms-lite-labor-management': {
    title: 'Labor Management',
    subtitle: 'Employee tracking, productivity and performance',
    searchPlaceholder: 'Search labor...',
  },
  '/wms-lite-3pl-billing': {
    title: '3PL Billing',
    subtitle: 'Rate cards, invoicing and revenue analytics',
    searchPlaceholder: 'Search billing...',
  },
  '/wms-lite-yard-management': {
    title: 'Yard Management',
    subtitle: 'Gate, dock, trailer and yard operations',
    searchPlaceholder: 'Search yard...',
  },
  '/wms-lite-dynamic-slotting': {
    title: 'Dynamic Slotting',
    subtitle: 'Slot optimization, velocity profiling and relocation',
    searchPlaceholder: 'Search slotting...',
  },
  '/wms-lite-cross-docking': {
    title: 'Cross Docking',
    subtitle: 'Direct transfer, staging and dock-to-dock operations',
    searchPlaceholder: 'Search cross docking...',
  },
  '/wms-lite-admin-config': {
    title: 'Admin Configuration',
    subtitle: 'System settings, master data, localization, users, integrations and security',
    searchPlaceholder: 'Search configuration...',
  },
  '/wms-lite-returns-rma': {
    title: 'Returns / RMA Management',
    subtitle: 'Returns processing, RMA authorisation, inspection, disposition & reverse logistics',
    searchPlaceholder: 'Search returns, RMA...',
  },
  '/wms-lite-replenishment': {
    title: 'Replenishment Execution',
    subtitle: 'Monitor, execute and manage warehouse replenishment tasks',
    searchPlaceholder: 'Search replenishment tasks...',
  },
  '/wms-lite-shipping-execution': {
    title: 'Shipping Execution',
    subtitle: 'Label generation, manifests, carrier integration and rate shopping',
    searchPlaceholder: 'Search shipments, orders...',
  },
  '/wms-lite-notifications-config': {
    title: 'Notifications & Alerts',
    subtitle: 'Configure email, SMS and in-app alerts for operational events',
    searchPlaceholder: 'Search notification rules...',
  },
};

type NotifCategory = 'all' | 'alert' | 'info' | 'success';

/** Live header clock — real current date/time, not a fixed mock string. */
function formatHeaderDateTime(d: Date): string {
  const datePart = d.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const timePart = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${datePart} · ${timePart}`;
}

/** Relative "x min/hr ago" from a real ISO timestamp. */
function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '—';
  const then = new Date(iso.endsWith('Z') ? iso : iso + 'Z').getTime();
  const diffMs = Date.now() - then;
  if (!Number.isFinite(diffMs) || diffMs < 0) return 'just now';
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function initialsOf(name: string | null | undefined, fallback: string): string {
  const source = (name && name.trim()) || fallback;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

/** Small initials avatar — replaces the stock stock-photo placeholders. */
function InitialsAvatar({ label, size = 32 }: { label: string; size?: number }) {
  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0 text-white font-semibold"
      style={{ width: size, height: size, fontSize: size * 0.38, background: 'linear-gradient(135deg, #003A78 0%, #009FE3 100%)' }}
    >
      {label}
    </div>
  );
}

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const config = routeConfig[location.pathname] ?? {
    title: 'WMS Lite',
    subtitle: '',
    searchPlaceholder: 'Search...',
  };

  // ── Real logged-in user (from the actual /auth/login response), not a
  // hardcoded fixture. useAdminUsers fills in the extra fields (warehouse,
  // shift, MFA, last login) that the auth response itself doesn't carry.
  const authUser = useMemo(() => getStoredUser(), []);
  const { data: adminUsers } = useAdminUsers();
  const adminUser = useMemo(
    () => adminUsers?.find(u => u.id === authUser?.id),
    [adminUsers, authUser]
  );
  const displayName = authUser?.full_name || authUser?.username || 'Signed-in user';
  const displayInitials = initialsOf(authUser?.full_name, authUser?.username || 'U');

  // ── Real notification log (see Notifications module) powers the bell —
  // no fixture list.
  const { data: logEntries = [] } = useNotificationLog();
  const notifSource = useMemo(
    () => [...logEntries].sort((a, b) => b.id - a.id).slice(0, 20),
    [logEntries]
  );
  const [dismissedIds, setDismissedIds] = useState<Set<number>>(new Set());
  const [readIds, setReadIds] = useState<Set<number>>(new Set());
  const notifList = useMemo(() => notifSource
    .filter(n => !dismissedIds.has(n.id))
    .map(n => {
      const category: NotifCategory = n.status === 'Failed' ? 'alert' : n.status === 'Delivered' ? 'success' : 'info';
      const icon = category === 'alert' ? faTriangleExclamation : category === 'success' ? faCircleCheck : faCircleInfo;
      const color = category === 'alert' ? 'text-red-500' : category === 'success' ? 'text-emerald-500' : 'text-blue-500';
      const bg = category === 'alert' ? 'bg-red-50' : category === 'success' ? 'bg-emerald-50' : 'bg-blue-50';
      const border = category === 'alert' ? 'border-red-200' : category === 'success' ? 'border-emerald-200' : 'border-blue-200';
      return {
        id: n.id, category, icon, color, bg, border,
        title: `${n.rule_name || n.kind} — ${n.status}`,
        message: n.event_detail,
        time: timeAgo(n.created_at),
        module: n.kind,
        unread: !readIds.has(n.id),
      };
    }), [notifSource, dismissedIds, readIds]);

  // ── Real recent sign-ins for this user (Admin Config's LoginHistory),
  // in place of a fabricated "active sessions" list.
  const { data: loginHistory = [] } = useLoginHistory();
  const mySignIns = useMemo(
    () => loginHistory.filter(r => authUser && r.user_id === authUser.id).slice(0, 5),
    [loginHistory, authUser]
  );

  const [searchValue, setSearchValue] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifFilter, setNotifFilter] = useState<NotifCategory>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState('Just now');
  const [profileTab, setProfileTab] = useState<'info' | 'security' | 'sessions'>('info');
  const [now, setNow] = useState(() => new Date());

  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Live-ticking header clock (top-left, next to the page title).
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  const unreadCount = notifList.filter(n => n.unread).length;
  const filteredNotifs = notifFilter === 'all' ? notifList : notifList.filter(n => n.category === notifFilter);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllRead = () => setReadIds(new Set(notifSource.map(n => n.id)));
  const dismissNotif = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissedIds(prev => new Set(prev).add(id));
  };
  const dismissAll = () => setDismissedIds(new Set(notifSource.map(n => n.id)));

  const handleRefresh = useCallback(() => {
    if (refreshing) return;
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      const n = new Date();
      setLastRefreshed(`${n.getHours()}:${String(n.getMinutes()).padStart(2, '0')} ${n.getHours() >= 12 ? 'PM' : 'AM'}`);
    }, 1200);
  }, [refreshing]);

  const handleSignOut = () => {
    authLogout();
    navigate('/');
  };

  return (
    <>
      <header className="bg-white border-b border-[#009FE3]/20 px-6 py-3.5 flex items-center justify-between flex-shrink-0 relative z-30" id="header">
        {/* Left: Title */}
        <div className="flex items-center gap-3">
          <button className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg border border-neutral-200">
            <FontAwesomeIcon icon={faBars} className="text-neutral-700 text-sm" />
          </button>
          <div>
            <h1 className="text-[#003A78] text-lg font-semibold leading-tight">{config.title}</h1>
            <p className="text-neutral-400 text-xs">
              {formatHeaderDateTime(now)}{config.subtitle ? ` · ${config.subtitle}` : ''}
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="hidden md:flex items-center gap-2 border border-neutral-200 rounded-lg px-3 py-2 bg-neutral-50 w-56">
            <FontAwesomeIcon icon={faMagnifyingGlass} className="text-neutral-400 text-xs" />
            <input
              className="bg-transparent text-xs text-neutral-700 placeholder-neutral-400 focus:outline-none w-full"
              placeholder={config.searchPlaceholder}
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
          </div>

          {/* ── Refresh Button ── */}
          <div className="relative group">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className={`w-9 h-9 flex items-center justify-center rounded-lg border transition-all duration-200 ${refreshing ? 'bg-blue-50 border-blue-200' : 'bg-white border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300'}`}
              title={`Refresh data · Last: ${lastRefreshed}`}
            >
              <FontAwesomeIcon
                icon={faRotateRight}
                className={`text-sm transition-all duration-300 ${refreshing ? 'text-blue-500 animate-spin' : 'text-neutral-500 group-hover:text-neutral-700'}`}
              />
            </button>
            {/* Tooltip */}
            <div className="absolute right-0 top-11 bg-neutral-900 text-white text-[10px] rounded-md px-2.5 py-1.5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
              <p className="font-medium">Refresh Data</p>
              <p className="text-neutral-400">Last updated: {lastRefreshed}</p>
            </div>
          </div>

          {/* ── Notification Bell ── */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => { setNotifOpen(v => !v); setUserOpen(false); setProfileOpen(false); }}
              className={`w-9 h-9 flex items-center justify-center rounded-lg border transition-colors ${notifOpen ? 'border-[#009FE3]' : 'bg-white border-neutral-200 hover:bg-sky-50 hover:border-[#009FE3]/50'}`}
              style={notifOpen ? { background: '#009FE3' } : {}}
            >
              <FontAwesomeIcon icon={faBell} className={`text-sm ${notifOpen ? 'text-white' : 'text-neutral-600'}`} />
            </button>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center pointer-events-none animate-pulse">
                <span className="text-white font-bold" style={{ fontSize: '9px' }}>{unreadCount}</span>
              </span>
            )}

            {/* Notification Dropdown */}
            {notifOpen && (
              <div className="absolute right-0 top-11 w-[420px] bg-white border border-neutral-200 rounded-xl shadow-2xl overflow-hidden z-50">
                {/* Header */}
                <div className="px-4 py-3 border-b border-neutral-100">
                  <div className="flex items-center justify-between mb-2.5">
                    <div>
                      <p className="text-sm font-semibold text-neutral-900">Notifications</p>
                      <p className="text-xs text-neutral-400">{unreadCount} unread · {notifList.length} total</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <button onClick={markAllRead} className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-medium transition-colors px-2 py-1 rounded hover:bg-blue-50">
                          <FontAwesomeIcon icon={faCheckDouble} className="text-[10px]" />
                          Mark all read
                        </button>
                      )}
                      {notifList.length > 0 && (
                        <button onClick={dismissAll} className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-red-500 font-medium transition-colors px-2 py-1 rounded hover:bg-red-50">
                          <FontAwesomeIcon icon={faTrash} className="text-[10px]" />
                          Clear all
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Category Filter Tabs */}
                  <div className="flex gap-1">
                    {(['all', 'alert', 'info', 'success'] as NotifCategory[]).map(cat => {
                      const counts = { all: notifList.length, alert: notifList.filter(n => n.category === 'alert').length, info: notifList.filter(n => n.category === 'info').length, success: notifList.filter(n => n.category === 'success').length };
                      return (
                        <button
                          key={cat}
                          onClick={() => setNotifFilter(cat)}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors capitalize ${notifFilter === cat ? 'text-white' : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'}`}
                          style={notifFilter === cat ? { background: '#009FE3' } : {}}
                        >
                          {cat} {counts[cat] > 0 && <span className={`ml-1 text-[10px] ${notifFilter === cat ? 'text-neutral-300' : 'text-neutral-400'}`}>({counts[cat]})</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* List */}
                <div className="max-h-80 overflow-y-auto divide-y divide-neutral-50">
                  {filteredNotifs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-neutral-400">
                      <FontAwesomeIcon icon={faBell} className="text-2xl mb-2 text-neutral-200" />
                      <p className="text-xs">No notifications</p>
                    </div>
                  ) : filteredNotifs.map(n => (
                    <div
                      key={n.id}
                      className={`group flex gap-3 px-4 py-3 hover:bg-neutral-50 cursor-pointer transition-colors border-l-2 ${n.unread ? 'bg-blue-50/20 border-blue-400' : 'border-transparent'}`}
                      onClick={() => setReadIds(prev => new Set(prev).add(n.id))}
                    >
                      <div className={`w-8 h-8 rounded-full ${n.bg} border ${n.border} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                        <FontAwesomeIcon icon={n.icon} className={`text-xs ${n.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-xs font-semibold ${n.unread ? 'text-neutral-900' : 'text-neutral-500'}`}>{n.title}</p>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className="text-[10px] text-neutral-400 whitespace-nowrap">{n.time}</span>
                            <button
                              onClick={(e) => dismissNotif(n.id, e)}
                              className="opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center rounded hover:bg-neutral-200 transition-all"
                            >
                              <FontAwesomeIcon icon={faXmark} className="text-[9px] text-neutral-400" />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">{n.message}</p>
                        <span className="inline-block mt-1 text-[10px] bg-neutral-100 text-neutral-500 px-1.5 py-0.5 rounded font-medium">{n.module}</span>
                      </div>
                      {n.unread && <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />}
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="px-4 py-2.5 border-t border-neutral-100 bg-neutral-50 flex items-center justify-between">
                  <span className="text-[10px] text-neutral-400">Auto-refreshes every 30s</span>
                  <button className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors">
                    View all notifications →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── User Profile ── */}
          <div className="relative pl-2 border-l border-neutral-200" ref={userRef}>
            <button
              onClick={() => { setUserOpen(v => !v); setNotifOpen(false); setProfileOpen(false); }}
              className="flex items-center gap-2 hover:bg-neutral-50 rounded-lg px-2 py-1.5 transition-colors"
            >
              <div className="relative ring-2 ring-neutral-200 rounded-full flex-shrink-0">
                <InitialsAvatar label={displayInitials} size={32} />
              </div>
              <div className="hidden md:block text-left">
                <p className="text-neutral-900 text-xs font-semibold leading-tight">{displayName}</p>
                <p className="text-neutral-400 text-[10px] leading-tight">{authUser?.role || '—'}</p>
              </div>
              <FontAwesomeIcon
                icon={faChevronDown}
                className={`text-neutral-400 text-[10px] transition-transform duration-200 ${userOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {/* Online indicator */}
            <div className="absolute bottom-1.5 left-2.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white pointer-events-none" />

            {/* User Dropdown */}
            {userOpen && (
              <div className="absolute right-0 top-12 w-80 bg-white border border-neutral-200 rounded-xl shadow-2xl overflow-hidden z-50">
                {/* Profile Hero Card */}
                <div className="px-4 py-4" style={{ background: 'linear-gradient(135deg, #003A78 0%, #005BAA 100%)' }}>
                  <div className="flex items-center gap-3">
                    <InitialsAvatar label={displayInitials} size={48} />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold leading-tight">{displayName}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="inline-block text-[10px] bg-blue-500/30 text-blue-200 border border-blue-400/30 px-1.5 py-0.5 rounded font-medium">{authUser?.role || '—'}</span>
                        {adminUser?.warehouse_code && (
                          <span className="inline-block text-[10px] bg-white/10 text-neutral-300 border border-white/10 px-1.5 py-0.5 rounded font-medium">{adminUser.warehouse_code}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                        <span className="text-emerald-300 text-[10px]">Active now</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="bg-white/10 rounded-lg px-2 py-1.5 text-center">
                      <p className="text-white text-xs font-semibold">{authUser?.tenant_id || '—'}</p>
                      <p className="text-neutral-400 text-[10px]">Tenant</p>
                    </div>
                    <div className="bg-white/10 rounded-lg px-2 py-1.5 text-center">
                      <p className="text-white text-xs font-semibold">{adminUser?.warehouse_code || '—'}</p>
                      <p className="text-neutral-400 text-[10px]">Warehouse</p>
                    </div>
                  </div>
                </div>

                {/* Account menu */}
                <div className="border-b border-neutral-100 px-4 py-2.5">
                  <p className="text-xs font-semibold" style={{ color: '#003A78' }}>My Account</p>
                </div>

                {(
                  <div className="py-1.5">
                    <button
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-50 transition-colors text-left"
                      onClick={() => { setProfileOpen(true); setUserOpen(false); }}
                    >
                      <div className="w-7 h-7 rounded-lg bg-neutral-100 flex items-center justify-center">
                        <FontAwesomeIcon icon={faCircleUser} className="text-neutral-600 text-xs" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-neutral-800">My Profile</p>
                        <p className="text-[10px] text-neutral-400">View details, contact info & preferences</p>
                      </div>
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-50 transition-colors text-left">
                      <div className="w-7 h-7 rounded-lg bg-neutral-100 flex items-center justify-center">
                        <FontAwesomeIcon icon={faUserEdit} className="text-neutral-600 text-xs" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-neutral-800">Account Settings</p>
                        <p className="text-[10px] text-neutral-400">Password, language & notifications</p>
                      </div>
                    </button>
                    <button
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-50 transition-colors text-left"
                      onClick={() => { navigate('/wms-lite-admin-config'); setUserOpen(false); }}
                    >
                      <div className="w-7 h-7 rounded-lg bg-neutral-100 flex items-center justify-center">
                        <FontAwesomeIcon icon={faGear} className="text-neutral-600 text-xs" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-neutral-800">Admin Configuration</p>
                        <p className="text-[10px] text-neutral-400">System settings & warehouse config</p>
                      </div>
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-50 transition-colors text-left">
                      <div className="w-7 h-7 rounded-lg bg-neutral-100 flex items-center justify-center">
                        <FontAwesomeIcon icon={faClockRotateLeft} className="text-neutral-600 text-xs" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-neutral-800">Activity Log</p>
                        <p className="text-[10px] text-neutral-400">Recent actions and audit trail</p>
                      </div>
                    </button>
                    <button
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-50 transition-colors text-left"
                      onClick={() => { setProfileOpen(true); setUserOpen(false); setProfileTab('security'); }}
                    >
                      <div className="w-7 h-7 rounded-lg bg-neutral-100 flex items-center justify-center">
                        <FontAwesomeIcon icon={faShieldAlt} className="text-neutral-600 text-xs" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-neutral-800">Security &amp; Sessions</p>
                        <p className="text-[10px] text-neutral-400">2FA, active sessions & device management</p>
                      </div>
                    </button>
                    {/* Last login info */}
                    <div className="mx-4 my-2 px-3 py-2 bg-neutral-50 rounded-lg border border-neutral-100">
                      <p className="text-[10px] text-neutral-400">Last login</p>
                      <p className="text-xs font-medium text-neutral-700 mt-0.5">
                        {adminUser?.last_login_at ? new Date(adminUser.last_login_at.endsWith('Z') ? adminUser.last_login_at : adminUser.last_login_at + 'Z').toLocaleString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : '—'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Logout */}
                <div className="px-4 pb-3 pt-2 border-t border-neutral-100">
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-lg transition-colors"
                  >
                    <FontAwesomeIcon icon={faArrowRightFromBracket} className="text-xs" />
                    <span className="text-xs font-semibold">Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── My Profile Modal ── */}
      {profileOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setProfileOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()} ref={profileRef}>
            {/* Modal Header */}
            <div className="px-6 py-5 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #003A78 0%, #005BAA 100%)' }}>
              <div className="flex items-center gap-3">
                <div className="ring-2 ring-white/30 rounded-full flex-shrink-0">
                  <InitialsAvatar label={displayInitials} size={56} />
                </div>
                <div>
                  <p className="text-white font-semibold text-base">{displayName}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[11px] bg-blue-500/30 text-blue-200 border border-blue-400/30 px-2 py-0.5 rounded-full font-medium">{authUser?.role || '—'}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                    <span className="text-emerald-300 text-[11px]">Online{adminUser?.warehouse_code ? ` · ${adminUser.warehouse_code}` : ''}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setProfileOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                <FontAwesomeIcon icon={faXmark} className="text-white text-sm" />
              </button>
            </div>

            {/* Profile Tabs */}
            <div className="flex border-b border-neutral-100">
              {[
                { key: 'info', label: 'Profile Info', icon: faIdBadge },
                { key: 'security', label: 'Security', icon: faLock },
                { key: 'sessions', label: 'Sessions', icon: faDesktop },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setProfileTab(tab.key as typeof profileTab)}
                  className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-3 font-medium transition-colors border-b-2 ${profileTab === tab.key ? 'border-[#009FE3]' : 'text-neutral-400 border-transparent hover:text-neutral-600'}`}
                  style={profileTab === tab.key ? { color: '#003A78' } : {}}
                >
                  <FontAwesomeIcon icon={tab.icon} className="text-[10px]" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {profileTab === 'info' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { icon: faEnvelope, label: 'Email', value: authUser?.email || '—' },
                      { icon: faIdBadge, label: 'Username', value: authUser?.username || '—' },
                      { icon: faIdBadge, label: 'Role', value: authUser?.role || '—' },
                      { icon: faWarehouse, label: 'Warehouse', value: adminUser?.warehouse_code || '—' },
                      { icon: faClock, label: 'Shift', value: adminUser?.shift_name || '—' },
                      { icon: faCalendarDays, label: 'Last Login', value: adminUser?.last_login_at ? new Date(adminUser.last_login_at.endsWith('Z') ? adminUser.last_login_at : adminUser.last_login_at + 'Z').toLocaleString('en-US', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }) : '—' },
                    ].map(item => (
                      <div key={item.label} className="flex items-start gap-2.5 bg-neutral-50 rounded-lg px-3 py-2.5 border border-neutral-100">
                        <div className="w-7 h-7 rounded-lg bg-white border border-neutral-200 flex items-center justify-center flex-shrink-0">
                          <FontAwesomeIcon icon={item.icon} className="text-neutral-500 text-[10px]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] text-neutral-400 font-medium">{item.label}</p>
                          <p className="text-xs text-neutral-800 font-semibold truncate">{item.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-neutral-200 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors">
                      <FontAwesomeIcon icon={faPen} className="text-[10px]" />
                      Edit Profile
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-white transition-colors" style={{ background: '#009FE3' }}>
                      <FontAwesomeIcon icon={faKey} className="text-[10px]" />
                      Change Password
                    </button>
                  </div>
                </div>
              )}

              {profileTab === 'security' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3.5 bg-neutral-50 border border-neutral-200 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-emerald-100 border border-emerald-200 flex items-center justify-center">
                        <FontAwesomeIcon icon={faFingerprint} className="text-emerald-600 text-sm" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-neutral-800">Two-Factor Authentication</p>
                        <p className="text-[10px] text-neutral-400">{adminUser?.mfa_enabled ? 'Authenticator app enabled' : 'Not enabled — set up in Admin Configuration → Users & Roles'}</p>
                      </div>
                    </div>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border ${adminUser?.mfa_enabled ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-neutral-100 text-neutral-500 border-neutral-200'}`}>
                      {adminUser?.mfa_enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3.5 bg-neutral-50 border border-neutral-200 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center">
                        <FontAwesomeIcon icon={faShieldAlt} className="text-neutral-600 text-sm" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-neutral-800">Account Status</p>
                        <p className="text-[10px] text-neutral-400">{adminUser?.locked ? 'Account is locked' : 'Account is active'}</p>
                      </div>
                    </div>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border ${adminUser?.locked ? 'bg-red-100 text-red-700 border-red-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>
                      {adminUser?.locked ? 'Locked' : 'Active'}
                    </span>
                  </div>
                  <button className="w-full flex items-center justify-center gap-1.5 mt-2 px-3 py-2.5 rounded-lg text-xs font-medium text-white transition-colors" style={{ background: '#009FE3' }}>
                    <FontAwesomeIcon icon={faKey} className="text-[10px]" />
                    Change Password
                  </button>
                </div>
              )}

              {profileTab === 'sessions' && (
                <div className="space-y-3">
                  <p className="text-xs text-neutral-500 mb-3">Your real recent sign-in attempts (full history in Admin Configuration → Audit &amp; Security).</p>
                  {mySignIns.length === 0 ? (
                    <p className="text-xs text-neutral-400 text-center py-6">No sign-in history yet.</p>
                  ) : mySignIns.map((s) => (
                    <div key={s.id} className={`flex items-center justify-between p-3.5 rounded-xl border ${s.status === 'Success' ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.status === 'Success' ? 'bg-emerald-100 border border-emerald-200' : 'bg-red-100 border border-red-200'}`}>
                          <FontAwesomeIcon icon={faDesktop} className={`text-sm ${s.status === 'Success' ? 'text-emerald-600' : 'text-red-500'}`} />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-neutral-800">{s.device || 'Unknown device'}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <FontAwesomeIcon icon={faLocationDot} className="text-[9px] text-neutral-400" />
                            <span className="text-[10px] text-neutral-400">{s.ip_address || '—'}</span>
                            <span className="text-[10px] text-neutral-300">·</span>
                            <FontAwesomeIcon icon={faClock} className="text-[9px] text-neutral-400" />
                            <span className="text-[10px] text-neutral-400">{timeAgo(s.created_at)}</span>
                          </div>
                        </div>
                      </div>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border ${s.status === 'Success' ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-red-100 text-red-700 border-red-300'}`}>
                        {s.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
