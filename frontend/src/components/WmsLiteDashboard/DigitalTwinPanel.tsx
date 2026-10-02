import React, { useMemo, useState } from "react";
import { X, Boxes, ListChecks, Table2, LayoutGrid } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useDigitalTwinFloorPlan } from "@/hooks/useDashboardApi";
import type { FloorPlanLocation } from "@/hooks/useDashboardApi";

// Sequential blue ramp (light -> dark), from the dataviz skill's documented
// default palette (references/palette.md). Only one sequential context is
// ever visible at a time here (the metric toggle swaps which magnitude
// this ramp encodes — inventory level vs. pick pendency — never both at
// once), so both metrics reuse this single validated hue rather than
// inventing a second, unvalidated ramp for the toggle's other state.
const SEQUENTIAL_BLUE: [number, string][] = [
  [0, "#cde2fb"], [0.1, "#b7d3f6"], [0.2, "#9ec5f4"], [0.3, "#86b6ef"],
  [0.4, "#6da7ec"], [0.5, "#5598e7"], [0.55, "#3987e5"], [0.65, "#2a78d6"],
  [0.75, "#256abf"], [0.85, "#1c5cab"], [0.92, "#184f95"], [0.97, "#104281"], [1, "#0d366b"],
];

function colorForRatio(ratio: number): string {
  const r = Math.min(1, Math.max(0, ratio));
  let picked = SEQUENTIAL_BLUE[0][1];
  for (const [stop, hex] of SEQUENTIAL_BLUE) {
    if (r >= stop) picked = hex;
  }
  return picked;
}

type Metric = "inventory" | "picks";

interface DigitalTwinPanelProps {
  open: boolean;
  onClose: () => void;
}

const VIEW_W = 760;
const VIEW_H = 380;
const PAD = 30;
const CELL = 34;

export default function DigitalTwinPanel({ open, onClose }: DigitalTwinPanelProps) {
  const { data: locations = [], isLoading } = useDigitalTwinFloorPlan();
  const [metric, setMetric] = useState<Metric>("inventory");
  const [showTable, setShowTable] = useState(false);
  const [hovered, setHovered] = useState<{ loc: FloorPlanLocation; mx: number; my: number } | null>(null);

  const maxPendingPicks = useMemo(
    () => Math.max(1, ...locations.map(l => l.pending_picks)),
    [locations]
  );

  const { minX, minY, maxX, maxY } = useMemo(() => {
    if (locations.length === 0) return { minX: 0, minY: 0, maxX: 1, maxY: 1 };
    return {
      minX: Math.min(...locations.map(l => l.x)),
      minY: Math.min(...locations.map(l => l.y)),
      maxX: Math.max(...locations.map(l => l.x)),
      maxY: Math.max(...locations.map(l => l.y)),
    };
  }, [locations]);

  const scaleX = (x: number) => {
    const span = maxX - minX || 1;
    return PAD + ((x - minX) / span) * (VIEW_W - PAD * 2 - CELL);
  };
  const scaleY = (y: number) => {
    const span = maxY - minY || 1;
    return PAD + ((y - minY) / span) * (VIEW_H - PAD * 2 - CELL);
  };

  const ratioFor = (loc: FloorPlanLocation) =>
    metric === "inventory" ? loc.occupancy_ratio : loc.pending_picks / maxPendingPicks;

  const metricLabel = metric === "inventory" ? "Inventory Level (on-hand qty, relative)" : "Pick Pendency (open picks)";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl w-[95vw] p-0 gap-0 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-neutral-900 rounded-lg flex items-center justify-center">
              <LayoutGrid className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">Digital Twin — Warehouse Floor Plan</h2>
              <p className="text-xs text-neutral-500">2D top-down heatmap of real location coordinates (scoped down from 3D, client-agreed)</p>
            </div>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700"><X size={18} /></button>
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-100 flex-wrap gap-2">
          <div className="flex gap-1.5">
            <button
              onClick={() => setMetric("inventory")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${metric === "inventory" ? "bg-neutral-900 text-white border-neutral-900" : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400"}`}
            >
              <Boxes size={13} /> Inventory Level
            </button>
            <button
              onClick={() => setMetric("picks")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${metric === "picks" ? "bg-neutral-900 text-white border-neutral-900" : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400"}`}
            >
              <ListChecks size={13} /> Pick Pendency
            </button>
          </div>
          <button
            onClick={() => setShowTable(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400 transition-colors"
          >
            <Table2 size={13} /> {showTable ? "Show Map" : "Show as Table"}
          </button>
        </div>

        <div className="p-5">
          {isLoading ? (
            <p className="text-xs text-neutral-400 text-center py-16">Loading floor plan…</p>
          ) : locations.length === 0 ? (
            <p className="text-xs text-neutral-400 text-center py-16">No locations with coordinates yet.</p>
          ) : showTable ? (
            <div className="overflow-x-auto max-h-[420px] overflow-y-auto border border-neutral-200 rounded-lg">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-neutral-50">
                  <tr className="border-b border-neutral-100">
                    {["Location", "Zone", "On-Hand Qty", "Pending Picks"].map(h => (
                      <th key={h} className="text-left py-2.5 px-3 text-neutral-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {locations.map(l => (
                    <tr key={l.location_id}>
                      <td className="py-2 px-3 font-mono text-neutral-800">{l.code}</td>
                      <td className="py-2 px-3 text-neutral-600">{l.zone_code || "—"} {l.zone_type ? `(${l.zone_type})` : ""}</td>
                      <td className="py-2 px-3 text-neutral-700">{l.on_hand_qty}</td>
                      <td className="py-2 px-3 text-neutral-700">{l.pending_picks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="relative">
              <svg
                viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
                className="w-full border border-neutral-200 rounded-lg bg-[#fcfcfb]"
                style={{ maxHeight: 420 }}
                onMouseLeave={() => setHovered(null)}
              >
                {locations.map(loc => {
                  const ratio = ratioFor(loc);
                  const cx = scaleX(loc.x);
                  const cy = scaleY(loc.y);
                  return (
                    <g key={loc.location_id}>
                      <rect
                        x={cx} y={cy} width={CELL} height={CELL} rx={4}
                        fill={colorForRatio(ratio)}
                        stroke="rgba(11,11,11,0.10)"
                        strokeWidth={1}
                        onMouseMove={(e) => setHovered({ loc, mx: e.clientX, my: e.clientY })}
                        onMouseEnter={(e) => setHovered({ loc, mx: e.clientX, my: e.clientY })}
                        style={{ cursor: "pointer" }}
                      />
                      <text x={cx + CELL / 2} y={cy + CELL / 2 + 3} textAnchor="middle" fontSize={7} fill="#52514e" fontFamily="system-ui, -apple-system, sans-serif" pointerEvents="none">
                        {loc.code.length > 8 ? loc.code.slice(0, 7) + "…" : loc.code}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {hovered && (
                <div
                  className="fixed z-50 pointer-events-none bg-neutral-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg"
                  style={{ left: hovered.mx + 14, top: hovered.my + 14, maxWidth: 220 }}
                >
                  <p className="font-semibold font-mono">{hovered.loc.code}</p>
                  <p className="text-neutral-300">{hovered.loc.zone_code || "No zone"} {hovered.loc.zone_type ? `· ${hovered.loc.zone_type}` : ""}</p>
                  <div className="mt-1 space-y-0.5">
                    <p>On-hand: <span className="font-medium">{hovered.loc.on_hand_qty}</span></p>
                    <p>Pending picks: <span className="font-medium">{hovered.loc.pending_picks}</span></p>
                  </div>
                </div>
              )}

              {/* Legend */}
              <div className="flex items-center gap-3 mt-4">
                <span className="text-xs text-neutral-500">{metricLabel}</span>
                <div className="flex items-center gap-1.5 flex-1 max-w-xs">
                  <span className="text-[10px] text-neutral-400">Low</span>
                  <div
                    className="h-2.5 flex-1 rounded-full"
                    style={{ background: `linear-gradient(to right, ${SEQUENTIAL_BLUE.map(([, hex]) => hex).join(",")})` }}
                  />
                  <span className="text-[10px] text-neutral-400">High</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
