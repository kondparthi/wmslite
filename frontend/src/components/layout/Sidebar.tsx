import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBuilding, faGaugeHigh, faDatabase, faTruckRampBox, faBoxesStacked, faTruckFast, faUsersGear, faFileInvoiceDollar, faSquareParking, faSliders, faRightLeft, faGear, faRightFromBracket, faRotateLeft, faArrowsRotate, faTruck, faBell, faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { getStoredUser, logout } from '@/lib/auth';

/* ── Delaplex "dp" circle logo ── */
function DelaplexLogo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Delaplex logo">
      {/* Sky-blue circle background */}
      <circle cx="100" cy="100" r="100" fill="#29B6E8" />

      {/* "d" — reversed D shape: vertical bar on right, bowl opens left */}
      <rect x="54" y="44" width="16" height="112" rx="6" fill="white" />
      <path d="M70 44 C70 44 114 44 114 100 C114 156 70 156 70 156 L70 140 C70 140 98 140 98 100 C98 60 70 60 70 60 Z" fill="white" />

      {/* "p" — vertical bar on left, bowl opens right */}
      <rect x="108" y="72" width="15" height="84" rx="6" fill="white" />
      <path d="M123 72 C123 72 160 72 160 104 C160 136 123 136 123 136 L123 121 C123 121 145 121 145 104 C145 87 123 87 123 87 Z" fill="white" />
    </svg>
  );
}

/* ── Initials avatar (no external image dependency) ── */
function InitialsAvatar({ name, size = 32 }: { name: string; size?: number }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('') || 'U';
  return (
    <div
      className="rounded-full ring-2 ring-[#009FE3]/60 flex-shrink-0 flex items-center justify-center font-semibold text-white select-none"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: 'linear-gradient(135deg, #009FE3, #003A78)',
      }}
    >
      {initials}
    </div>
  );
}

/* ── Nav item definitions, grouped exactly as before ── */
const NAV_GROUPS: { label: string | null; items: { to: string; icon: typeof faGaugeHigh; text: string }[] }[] = [
  { label: null, items: [{ to: '/wms-lite-dashboard', icon: faGaugeHigh, text: 'Dashboard' }] },
  { label: 'Master Data', items: [{ to: '/wms-lite-master-data', icon: faDatabase, text: 'Master Data' }] },
  {
    label: 'Operations',
    items: [
      { to: '/wms-lite-inbound', icon: faTruckRampBox, text: 'Inbound' },
      { to: '/wms-lite-inventory', icon: faBoxesStacked, text: 'Inventory' },
      { to: '/wms-lite-outbound', icon: faTruckFast, text: 'Outbound' },
    ],
  },
  {
    label: 'Advanced',
    items: [
      { to: '/wms-lite-labor-management', icon: faUsersGear, text: 'Labor Management' },
      { to: '/wms-lite-3pl-billing', icon: faFileInvoiceDollar, text: '3PL Billing' },
      { to: '/wms-lite-yard-management', icon: faSquareParking, text: 'Yard Management' },
      { to: '/wms-lite-dynamic-slotting', icon: faSliders, text: 'Dynamic Slotting' },
      { to: '/wms-lite-cross-docking', icon: faRightLeft, text: 'Cross Docking' },
    ],
  },
  {
    label: 'Logistics',
    items: [
      { to: '/wms-lite-returns-rma', icon: faRotateLeft, text: 'Returns / RMA' },
      { to: '/wms-lite-replenishment', icon: faArrowsRotate, text: 'Replenishment' },
      { to: '/wms-lite-shipping-execution', icon: faTruck, text: 'Shipping Execution' },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/wms-lite-notifications-config', icon: faBell, text: 'Notifications' },
      { to: '/wms-lite-admin-config', icon: faGear, text: 'Admin Configuration' },
    ],
  },
];

const SIDEBAR_GRADIENT = 'linear-gradient(165deg, rgb(0, 43, 92) 0%, rgb(0, 58, 120) 45%, rgb(0, 114, 184) 100%)';

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const [collapsed, setCollapsed] = useState(false);
  const user = getStoredUser();

  const isActive = (path: string) => currentPath === path;

  const handleSignOut = () => {
    logout();
    navigate('/');
  };

  const sectionLabel = 'px-3 text-[10px] font-bold text-sky-400/50 uppercase tracking-widest mb-1.5';

  return (
    <aside
      className={`hidden lg:flex flex-col flex-shrink-0 relative transition-[width] duration-200 ease-in-out ${collapsed ? 'w-20' : 'w-64'}`}
      id="sidebar"
      style={{ minHeight: '100vh', background: SIDEBAR_GRADIENT }}
    >
      {/* ── Collapse / expand toggle ── */}
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="absolute -right-3 top-6 z-40 w-6 h-6 rounded-full bg-white text-[#003A78]
          border border-[#00000014] shadow-md flex items-center justify-center
          hover:bg-sky-50 hover:scale-105 active:scale-95 transition-all"
      >
        <FontAwesomeIcon icon={collapsed ? faChevronRight : faChevronLeft} className="text-[10px]" />
      </button>

      {/* ── Logo area ── */}
      <div className={`flex items-center gap-3 py-4 border-b border-white/10 ${collapsed ? 'justify-center px-2' : 'px-5'}`}>
        <div className="flex-shrink-0">
          <DelaplexLogo size={collapsed ? 32 : 36} />
        </div>
        {!collapsed && (
          <div className="flex flex-col leading-tight min-w-0">
            <span className="text-white font-bold text-base tracking-tight truncate">WMS Lite</span>
            <span className="text-sky-300 text-[10px] font-medium tracking-widest uppercase truncate">by Delaplex</span>
          </div>
        )}
      </div>

      {/* ── Tenant Badge ── */}
      <div
        className={`mt-4 flex items-center gap-2 rounded-lg border border-white/10 ${collapsed ? 'mx-2 px-2 py-2 justify-center' : 'mx-4 px-3 py-2'}`}
        style={{ background: 'rgba(255,255,255,0.07)' }}
        title={collapsed ? (user?.tenant_id || 'Warehouse') : undefined}
      >
        <div className="w-6 h-6 rounded bg-[#009FE3]/20 flex items-center justify-center flex-shrink-0">
          <FontAwesomeIcon icon={faBuilding} className="text-[#009FE3] text-xs" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-white text-xs font-semibold truncate">{user?.tenant_id || 'Warehouse'}</p>
            <p className="text-sky-300/60 text-[10px]">Main Warehouse</p>
          </div>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav className={`flex-1 py-4 space-y-0.5 overflow-y-auto overflow-x-hidden ${collapsed ? 'px-2' : 'px-3'}`}>
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} className={gi === 0 ? '' : 'pt-4'}>
            {group.label && !collapsed && <p className={sectionLabel}>{group.label}</p>}
            {group.label && collapsed && <div className="mx-2 my-2 border-t border-white/10" />}
            {group.items.map((item) => {
              const active = isActive(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  title={collapsed ? item.text : undefined}
                  className={`group relative flex items-center rounded-lg transition-all duration-150 mb-0.5
                    ${collapsed ? 'justify-center px-0 py-2.5 mx-0' : 'gap-3 px-2.5 py-2.5'}
                    ${active
                      ? 'text-white shadow-sm'
                      : 'text-sky-200/70 hover:bg-white/8 hover:text-white'}
                  `}
                  style={active ? { background: 'rgba(0,159,227,0.22)', boxShadow: 'inset 0 0 0 1px rgba(124,212,255,0.25)' } : undefined}
                >
                  {/* active indicator bar */}
                  <span
                    className={`absolute left-0 top-1/2 -translate-y-1/2 rounded-r-full bg-[#7CD4FF] transition-all duration-150
                      ${active ? 'h-5 w-[3px]' : 'h-0 w-[3px]'}`}
                  />
                  <span
                    className={`flex items-center justify-center rounded-md flex-shrink-0 transition-colors ${collapsed ? 'w-8 h-8' : 'w-7 h-7'}`}
                    style={active ? { background: 'rgba(124,212,255,0.18)' } : undefined}
                  >
                    <FontAwesomeIcon icon={item.icon} className={`text-sm ${active ? 'text-[#7CD4FF]' : ''}`} />
                  </span>
                  {!collapsed && <span className="text-sm font-medium truncate">{item.text}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* ── User Profile Footer ── */}
      <div className={`py-3 border-t border-white/10 ${collapsed ? 'px-2' : 'px-3'}`} style={{ background: 'rgba(0,0,0,0.2)' }}>
        {/* User info row */}
        <div className={`flex items-center rounded-lg bg-white/5 mb-2 ${collapsed ? 'justify-center px-1 py-2' : 'gap-3 px-2 py-2'}`}>
          <InitialsAvatar name={user?.full_name || user?.username || 'User'} size={32} />
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <p className="text-white text-xs font-semibold truncate">{user?.full_name || user?.username || 'User'}</p>
                <p className="text-[#7CD4FF] text-[10px] font-medium truncate">{user?.role || ''}</p>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" title="Online" />
            </>
          )}
        </div>

        {/* Logout button — full width, prominent */}
        <button
          type="button"
          onClick={handleSignOut}
          title={collapsed ? 'Sign Out' : undefined}
          className={`w-full flex items-center justify-center gap-2 rounded-lg
            bg-red-500/10 hover:bg-red-500/25 active:bg-red-500/40
            text-red-400 hover:text-red-300
            border border-red-500/20 hover:border-red-500/40
            text-xs font-semibold transition-all duration-150 cursor-pointer group
            ${collapsed ? 'px-0 py-2' : 'px-3 py-2'}`}
        >
          <FontAwesomeIcon icon={faRightFromBracket} className="text-xs group-hover:translate-x-0.5 transition-transform" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
