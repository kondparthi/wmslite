import React from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBoxesStacked, faChartLine, faGlobe, faShieldHalved, faTruckFast } from '@fortawesome/free-solid-svg-icons';

const LoginLeftPanel = () => (
  <>
    <div
      className="hidden lg:flex flex-col justify-between w-1/2 p-12 h-[100dvh] min-h-[700px] relative overflow-hidden"
      style={{ background: "linear-gradient(160deg, #002B5C 0%, #003A78 45%, #0072B8 100%)" }}
      id="login-left-panel"
    >
      {/* Decorative backdrop: dot grid + soft glow orbs */}
      <div
        className="absolute inset-0 opacity-[0.15] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(#7CD4FF 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />
      <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(0,159,227,0.35) 0%, rgba(0,159,227,0) 70%)" }} />
      <div className="absolute bottom-[-6rem] left-[-4rem] w-72 h-72 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(124,212,255,0.22) 0%, rgba(124,212,255,0) 70%)" }} />

      {/* Logo */}
      <div className="relative z-10 flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-white shadow-lg">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="32" height="32" rx="8" fill="#003A78"/>
            <text x="4" y="23" fontFamily="Arial" fontWeight="800" fontSize="18" fill="#009FE3">dp</text>
          </svg>
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-white text-xl font-bold tracking-wide">Delaplex</span>
          <span className="text-[#7CD4FF] text-xs font-medium tracking-widest uppercase">WMS Lite</span>
        </div>
      </div>

      {/* Center Content */}
      <div className="relative z-10 space-y-9">
        <div className="space-y-4">
          <span
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase"
            style={{ background: "rgba(124,212,255,0.14)", border: "1px solid rgba(124,212,255,0.35)", color: "#BEEBFF" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
            Platform Online
          </span>
          <h1 className="text-white text-4xl font-bold leading-tight tracking-tight">
            Warehouse Management,<br />Made Simple.
          </h1>
          <p className="text-blue-200/90 text-base leading-relaxed max-w-md">
            End-to-end warehouse operations control — from inbound to outbound, inventory to billing, all in one platform.
          </p>
        </div>

        {/* Feature Highlights */}
        <div className="space-y-3">
          {[
            { icon: faBoxesStacked, title: "Inventory Control", sub: "Real-time tracking, cycle counts, adjustments" },
            { icon: faTruckFast,    title: "Inbound & Outbound", sub: "ASN, putaway, wave planning, shipment orders" },
            { icon: faChartLine,   title: "Labor & 3PL Billing", sub: "Track labor, manage billing and cross-docking" },
            { icon: faGlobe,       title: "Multi-National & Localization", sub: "Multi-language, multi-currency, multi-warehouse" },
          ].map(({ icon, title, sub }) => (
            <div
              key={title}
              className="flex items-center gap-4 rounded-xl px-3 py-3 transition-colors"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(0,159,227,0.2)", border: "1px solid rgba(0,159,227,0.4)" }}
              >
                <FontAwesomeIcon icon={icon} className="text-sm" style={{ color: "#7CD4FF" }} />
              </div>
              <div>
                <p className="text-white text-sm font-medium">{title}</p>
                <p className="text-blue-300/80 text-xs">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(0,159,227,0.2)" }}>
            <FontAwesomeIcon icon={faShieldHalved} className="text-xs" style={{ color: "#7CD4FF" }} />
          </div>
          <span className="text-blue-300/80 text-xs">Enterprise-grade security &amp; compliance</span>
        </div>
        <p className="text-blue-400/70 text-xs">© 2026 WMS Lite by Delaplex. All rights reserved.</p>
      </div>
    </div>
  </>
);

export default LoginLeftPanel;
