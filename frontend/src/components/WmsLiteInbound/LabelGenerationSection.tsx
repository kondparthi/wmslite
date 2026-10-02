import React, { useState } from "react";
import { Printer, Tag, PackageCheck, Navigation2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import BarcodePreview from "./BarcodePreview";
import {
  useReceivingLabels, usePutawayLabels, usePrintReceivingLabel, usePrintPutawayLabel,
} from "@/hooks/useLabelGenerationApi";
import type { LabelPrintResult } from "@/hooks/useLabelGenerationApi";

const BRAND = "#009FE3";
type SubView = "receiving" | "putaway";

const conditionClass: Record<string, string> = {
  Good: "bg-emerald-50 text-emerald-700",
  Damaged: "bg-red-50 text-red-700",
  "QC Hold": "bg-amber-50 text-amber-700",
};

const statusClass: Record<string, string> = {
  Pending: "bg-neutral-100 text-neutral-600",
  "In Progress": "bg-blue-50 text-blue-700",
  Completed: "bg-emerald-50 text-emerald-700",
};

export default function LabelGenerationSection() {
  const [activeView, setActiveView] = useState<SubView>("receiving");
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState<{ title: string; result: LabelPrintResult } | null>(null);

  const { data: receivingLabels = [] } = useReceivingLabels();
  const { data: putawayLabels = [] } = usePutawayLabels();
  const printReceiving = usePrintReceivingLabel();
  const printPutaway = usePrintPutawayLabel();

  const filteredReceiving = receivingLabels.filter(r =>
    (r.lpn || "").toLowerCase().includes(search.toLowerCase()) ||
    r.material_code.toLowerCase().includes(search.toLowerCase()) ||
    r.material_name.toLowerCase().includes(search.toLowerCase())
  );
  const filteredPutaway = putawayLabels.filter(t =>
    t.material_code.toLowerCase().includes(search.toLowerCase()) ||
    t.material_name.toLowerCase().includes(search.toLowerCase()) ||
    (t.destination_location_code || "").toLowerCase().includes(search.toLowerCase())
  );

  const handlePrintReceiving = (id: number, label: string) => {
    printReceiving.mutate(id, { onSuccess: (result) => setPreview({ title: `Receiving Label — ${label}`, result }) });
  };
  const handlePrintPutaway = (id: number, label: string) => {
    printPutaway.mutate(id, { onSuccess: (result) => setPreview({ title: `Putaway Label — ${label}`, result }) });
  };

  const views: { id: SubView; label: string; icon: any }[] = [
    { id: "receiving", label: "Receiving Labels", icon: PackageCheck },
    { id: "putaway", label: "Putaway Labels", icon: Navigation2 },
  ];

  return (
    <div className="space-y-4" id="label-generation-section">
      <div className="bg-white rounded-xl border border-neutral-200 p-5">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
              <Tag size={14} style={{ color: BRAND }} /> Label Generation
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">Generate and reprint receiving/putaway labels with real, scannable barcodes.</p>
          </div>
          <div className="flex items-center gap-1.5 border border-neutral-200 rounded-lg px-3 py-1.5 bg-neutral-50">
            <Search size={12} className="text-neutral-400" />
            <input className="bg-transparent text-xs focus:outline-none w-40" placeholder="Search LPN, SKU, location..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="flex gap-1 flex-wrap mb-4">
          {views.map(v => {
            const Icon = v.icon;
            return (
              <button key={v.id} onClick={() => { setActiveView(v.id); setSearch(""); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${activeView === v.id ? "bg-neutral-900 text-white border-neutral-900" : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400"}`}>
                <Icon size={13} />{v.label}
              </button>
            );
          })}
        </div>

        {activeView === "receiving" && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-100">
                  {["Receipt #", "LPN", "Material", "Qty", "Condition", "Received By", "Print Count", "Label", "Actions"].map(h => (
                    <th key={h} className="text-left py-2.5 px-3 text-neutral-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {filteredReceiving.map(r => (
                  <tr key={r.id} className="hover:bg-blue-50/20 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-neutral-900">#{r.id}</td>
                    <td className="py-2.5 px-3"><code className="bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-700 font-mono">{r.lpn || "— (assigned on print)"}</code></td>
                    <td className="py-2.5 px-3 text-neutral-800">{r.material_code} — {r.material_name}</td>
                    <td className="py-2.5 px-3 text-neutral-700">{r.qty} {r.uom}</td>
                    <td className="py-2.5 px-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${conditionClass[r.condition] || "bg-neutral-100 text-neutral-500"}`}>{r.condition}</span></td>
                    <td className="py-2.5 px-3 text-neutral-600">{r.received_by || "—"}</td>
                    <td className="py-2.5 px-3 text-neutral-700">{r.print_count}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.label_printed ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500"}`}>
                        {r.label_printed ? "Printed" : "Not Printed"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <Button size="sm" className="h-7 text-xs gap-1 bg-neutral-900 hover:bg-neutral-800 text-white" onClick={() => handlePrintReceiving(r.id, r.lpn || `Receipt #${r.id}`)}>
                        <Printer size={11} /> {r.label_printed ? "Reprint" : "Print"}
                      </Button>
                    </td>
                  </tr>
                ))}
                {filteredReceiving.length === 0 && (
                  <tr><td colSpan={9} className="text-center py-8 text-neutral-400">No receiving records found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeView === "putaway" && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-100">
                  {["Task #", "Material", "Qty", "Destination", "Status", "Print Count", "Label", "Actions"].map(h => (
                    <th key={h} className="text-left py-2.5 px-3 text-neutral-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {filteredPutaway.map(t => (
                  <tr key={t.id} className="hover:bg-blue-50/20 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-neutral-900 font-mono">PUT-{String(t.id).padStart(6, "0")}</td>
                    <td className="py-2.5 px-3 text-neutral-800">{t.material_code} — {t.material_name}</td>
                    <td className="py-2.5 px-3 text-neutral-700">{t.qty} {t.uom}</td>
                    <td className="py-2.5 px-3"><code className="bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-700 font-mono">{t.destination_location_code || "Unassigned"}</code></td>
                    <td className="py-2.5 px-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${statusClass[t.status] || "bg-neutral-100 text-neutral-500"}`}>{t.status}</span></td>
                    <td className="py-2.5 px-3 text-neutral-700">{t.print_count}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.label_printed ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500"}`}>
                        {t.label_printed ? "Printed" : "Not Printed"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <Button size="sm" className="h-7 text-xs gap-1 bg-neutral-900 hover:bg-neutral-800 text-white" onClick={() => handlePrintPutaway(t.id, `PUT-${String(t.id).padStart(6, "0")}`)}>
                        <Printer size={11} /> {t.label_printed ? "Reprint" : "Print"}
                      </Button>
                    </td>
                  </tr>
                ))}
                {filteredPutaway.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-8 text-neutral-400">No putaway tasks found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={!!preview} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">{preview?.title}</DialogTitle>
          </DialogHeader>
          {preview && (
            <div className="space-y-3">
              <div className="flex justify-center py-2 bg-white border border-neutral-200 rounded-lg">
                <BarcodePreview value={preview.result.barcode_value} symbology={preview.result.symbology} />
              </div>
              <div className="text-xs text-neutral-500 text-center">
                {preview.result.symbology} · {preview.result.label_width_mm}mm × {preview.result.label_height_mm}mm · Print #{preview.result.print_count}
              </div>
              <div className="border-t border-neutral-100 pt-2 space-y-1.5">
                {preview.result.fields_included.map(fieldName => (
                  <div key={fieldName} className="flex justify-between text-xs">
                    <span className="text-neutral-500">{fieldName}</span>
                    <span className="font-medium text-neutral-800 text-right">{preview.result.fields[fieldName] ?? "—"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
