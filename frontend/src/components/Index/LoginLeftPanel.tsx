import React from "react";

/**
 * Full-bleed warehouse-themed background for the login page.
 * Pure SVG/CSS — no external image dependency, so it always renders
 * regardless of network/CDN availability.
 */
const LoginLeftPanel = () => (
  <div
    className="fixed inset-0 overflow-hidden"
    style={{ background: "linear-gradient(160deg, #001A3D 0%, #002B5C 40%, #003A78 70%, #0072B8 100%)" }}
    aria-hidden="true"
  >
    {/* Abstract warehouse racking illustration */}
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMax slice"
      style={{ opacity: 0.5 }}
    >
      <defs>
        <linearGradient id="rackFade" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#7CD4FF" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#7CD4FF" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Receding rows of racking, three vanishing "aisles" */}
      {[0, 1, 2].map((aisle) => {
        const baseX = 120 + aisle * 480;
        return (
          <g key={aisle}>
            {Array.from({ length: 6 }).map((_, row) => {
              const y = 900 - row * 70;
              const scale = 1 - row * 0.09;
              const w = 360 * scale;
              const x = baseX - w / 2 + 180;
              return (
                <rect
                  key={row}
                  x={x}
                  y={y - 46 * scale}
                  width={w}
                  height={46 * scale}
                  rx={4}
                  fill="url(#rackFade)"
                  stroke="#7CD4FF"
                  strokeOpacity={0.25}
                  strokeWidth={1}
                />
              );
            })}
          </g>
        );
      })}
      {/* Pallet dots scattered on the racking */}
      {Array.from({ length: 18 }).map((_, i) => {
        const x = 140 + ((i * 97) % 1400);
        const y = 760 - ((i * 53) % 420);
        const s = 10 + (i % 3) * 4;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={s}
            height={s}
            rx={2}
            fill="#009FE3"
            opacity={0.3 + (i % 3) * 0.1}
          />
        );
      })}
    </svg>

    {/* Dot-grid overlay */}
    <div
      className="absolute inset-0 opacity-[0.12] pointer-events-none"
      style={{
        backgroundImage: "radial-gradient(#7CD4FF 1px, transparent 1px)",
        backgroundSize: "26px 26px",
      }}
    />

    {/* Soft glow orbs */}
    <div className="absolute -top-32 -right-32 w-[28rem] h-[28rem] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(0,159,227,0.35) 0%, rgba(0,159,227,0) 70%)" }} />
    <div className="absolute bottom-[-8rem] left-[-6rem] w-96 h-96 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(124,212,255,0.25) 0%, rgba(124,212,255,0) 70%)" }} />
    <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[36rem] h-[36rem] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(0,58,120,0.4) 0%, rgba(0,58,120,0) 70%)" }} />

    {/* Vignette so the centered card reads clearly on any viewport */}
    <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at center, rgba(0,20,45,0) 35%, rgba(0,20,45,0.55) 100%)" }} />
  </div>
);

export default LoginLeftPanel;
