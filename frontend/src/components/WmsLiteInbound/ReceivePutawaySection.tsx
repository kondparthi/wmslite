import React, { useMemo, useState } from "react";
import {
  CheckCircle2, Plus, Search, X, Check, AlertCircle, Loader2,
} from "lucide-react";
import { useMasterDataList } from "@/hooks/useMasterDataApi";
import { useInboundReceipts, useCreateReceipt } from "@/hooks/useInboundOpsApi";

const BRAND = "#009FE3";

const ASNS_RESOURCE = "/operations/asns";
const MATERIALS_RESOURCE = "/master-data/materials";
const STRATEGIES_RESOURCE = "/operations/putaway-strategies";

interface AsnRecord { id: number; asn_number: string; }
interface MaterialRecord { id: number; sku: string; }
interface StrategyRecord { id: number; name: string; priority: number; zone: string | null; rule_type: string; status: string; }

const condStyle: Record<string, string> = {
  "Good": "bg-emerald-50 text-emerald-700",
  "Damaged": "bg-red-50 text-red-600",
  "QC Hold": "bg-amber-50 text-amber-700",
};

const ReceivePutawaySection = () => {
  const { data: receipts = [], isLoading } = useInboundReceipts();
  const { data: asns = [] } = useMasterDataList<AsnRecord>(ASNS_RESOURCE);
  const { data: materials = [] } = useMasterDataList<MaterialRecord>(MATERIALS_RESOURCE);
  const { data: strategies = [] } = useMasterDataList<StrategyRecord>(STRATEGIES_RESOURCE);
  const createReceipt = useCreateReceipt();

  const asnById = useMemo(() => new Map(asns.map(a => [a.id, a.asn_number])), [asns]);
  const materialById = useMemo(() => new Map(materials.map(m => [m.id, m.sku])), [materials]);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ asn_id: "", material_id: "", qty: "", lpn: "", condition: "Good" });
  const [error, setError] = useState<string | null>(null);

  const handleAddReceipt = async () => {
    setError(null);
    if (!form.material_id || !form.qty) {
      setError("Material and quantity are required.");
      return;
    }
    try {
      await createReceipt.mutateAsync({
        asn_id: form.asn_id ? Number(form.asn_id) : null,
        material_id: Number(form.material_id),
        qty: Number(form.qty),
        lpn: form.lpn || undefined,
        condition: form.condition,
        received_by: "Current User",
      });
      setForm({ asn_id: "", material_id: "", qty: "", lpn: "", condition: "Good" });
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not record receipt.");
    }
  };

  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-4" id="receive-putaway-section">
      {/* Received by WebUI */}
      <div className="bg-white rounded-xl border border-neutral-200">
        <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
            <CheckCircle2 size={14} className="text-neutral-700" /> Received by WebUI
          </h2>
          <button onClick={() => setShowForm(s => !s)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-white rounded-lg text-xs hover:opacity-90 transition-opacity"
            style={{ background: BRAND }}>
            <Plus size={12} /> Receive
          </button>
        </div>

        {showForm && (
          <div className="px-5 py-3 border-b border-neutral-100 bg-neutral-50">
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-neutral-600 mb-1">ASN #</label>
                <select className="w-full border border-neutral-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none"
                  value={form.asn_id} onChange={e => setForm(f => ({ ...f, asn_id: e.target.value }))}>
                  <option value="">None</option>
                  {asns.map(a => <option key={a.id} value={a.id}>{a.asn_number}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-neutral-600 mb-1">SKU / Material</label>
                <select className="w-full border border-neutral-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none"
                  value={form.material_id} onChange={e => setForm(f => ({ ...f, material_id: e.target.value }))}>
                  <option value="">Select...</option>
                  {materials.map(m => <option key={m.id} value={m.id}>{m.sku}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-neutral-600 mb-1">Qty Received</label>
                <input type="number" min="0" className="w-full border border-neutral-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                  placeholder="0" value={form.qty} onChange={e => setForm(f => ({ ...f, qty: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-neutral-600 mb-1">LPN / Pallet</label>
                <input className="w-full border border-neutral-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                  placeholder="LPN-XXXX" value={form.lpn} onChange={e => setForm(f => ({ ...f, lpn: e.target.value }))} />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <select className="text-xs border border-neutral-200 rounded-lg px-2 py-1.5 text-neutral-600 bg-white focus:outline-none"
                value={form.condition} onChange={e => setForm(f => ({ ...f, condition: e.target.value }))}>
                <option>Good</option><option>Damaged</option><option>QC Hold</option>
              </select>
              {error && <span className="text-xs text-red-600">{error}</span>}
              <div className="flex items-center gap-2 ml-auto">
                <button onClick={handleAddReceipt} disabled={createReceipt.isPending}
                  className="px-4 py-1.5 text-white rounded-lg text-xs hover:opacity-90 flex items-center gap-1.5 transition-opacity disabled:opacity-60"
                  style={{ background: BRAND }}>
                  {createReceipt.isPending ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} Confirm Receipt
                </button>
                <button onClick={() => setShowForm(false)}
                  className="text-neutral-400 hover:text-neutral-700"><X size={14} /></button>
              </div>
            </div>
            <p className="text-xs text-neutral-400 mt-2">Confirming creates a Pending putaway task automatically — finish it in the "Putaway by WebUI" tab.</p>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-100">
                <th className="text-left py-2.5 px-3 text-neutral-500">LPN</th>
                <th className="text-left py-2.5 px-3 text-neutral-500">SKU</th>
                <th className="text-left py-2.5 px-3 text-neutral-500">ASN</th>
                <th className="text-left py-2.5 px-3 text-neutral-500">Qty Rcvd</th>
                <th className="text-left py-2.5 px-3 text-neutral-500">Condition</th>
                <th className="text-left py-2.5 px-3 text-neutral-500">Received At</th>
                <th className="text-left py-2.5 px-3 text-neutral-500">By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-8 text-neutral-400"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Loading receipts...</td></tr>
              ) : receipts.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-neutral-400">No receipts yet.</td></tr>
              ) : receipts.map(r => (
                <tr key={r.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="py-2.5 px-3 font-medium text-neutral-900">{r.lpn || "—"}</td>
                  <td className="py-2.5 px-3 text-neutral-700">{materialById.get(r.material_id) || `#${r.material_id}`}</td>
                  <td className="py-2.5 px-3 text-neutral-600">{r.asn_id ? (asnById.get(r.asn_id) || `#${r.asn_id}`) : "—"}</td>
                  <td className="py-2.5 px-3 font-medium text-neutral-900">{r.qty}</td>
                  <td className="py-2.5 px-3">
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${condStyle[r.condition]}`}>{r.condition}</span>
                  </td>
                  <td className="py-2.5 px-3 text-neutral-600">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-neutral-600">{r.received_by || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Putaway Strategy summary panel (read-only — manage full list in the Putaway Strategy tab) */}
      <div className="bg-white rounded-xl border border-neutral-200">
        <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
            <Search size={14} style={{ color: BRAND }} /> Active Putaway Strategies
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-100">
                <th className="text-left py-2.5 px-3 text-neutral-500">Name</th>
                <th className="text-left py-2.5 px-3 text-neutral-500">Priority</th>
                <th className="text-left py-2.5 px-3 text-neutral-500">Zone</th>
                <th className="text-left py-2.5 px-3 text-neutral-500">Rule</th>
                <th className="text-left py-2.5 px-3 text-neutral-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {strategies.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-neutral-400">No strategies yet.</td></tr>
              ) : [...strategies].sort((a, b) => a.priority - b.priority).map(s => (
                <tr key={s.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="py-2.5 px-3 text-neutral-700">{s.name}</td>
                  <td className="py-2.5 px-3">
                    <span className="w-5 h-5 inline-flex items-center justify-center rounded text-xs font-bold text-white" style={{ background: BRAND }}>{s.priority}</span>
                  </td>
                  <td className="py-2.5 px-3 text-neutral-600">{s.zone || "—"}</td>
                  <td className="py-2.5 px-3 text-neutral-600">{s.rule_type}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-1.5 py-0.5 rounded text-xs font-medium"
                      style={s.status === "Active" ? { background: "#009FE320", color: BRAND } : { background: "#F3F4F6", color: "#9CA3AF" }}>
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-4 border-t border-neutral-100 bg-neutral-50 rounded-b-xl">
          <div className="flex items-start gap-2">
            <AlertCircle size={12} className="text-neutral-500 mt-0.5" />
            <p className="text-xs text-neutral-500">Strategies are evaluated in priority order. Add or edit strategies in the "Putaway Strategy" tab.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ReceivePutawaySection;
