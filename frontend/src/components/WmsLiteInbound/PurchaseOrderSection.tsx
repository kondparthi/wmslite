import React, { useMemo, useState } from "react";
import {
  ShoppingCart, Plus, Search, FileDown, FileUp, Eye, Pencil,
  Trash2, X, Check, AlertCircle, Loader2,
} from "lucide-react";
import {
  useMasterDataList,
  useMasterDataCreate,
  useMasterDataUpdate,
  useMasterDataDelete,
} from "@/hooks/useMasterDataApi";

const BRAND = "#009FE3";
const POS_RESOURCE = "/operations/purchase-orders";
const SUPPLIERS_RESOURCE = "/master-data/suppliers";

interface PoRecord {
  id: number;
  po_number: string;
  supplier_id: number;
  order_date: string | null;
  expected_date: string | null;
  lines: number;
  qty_ordered: number;
  qty_received: number;
  total_value: number;
  status: string;
}

interface LookupRecord { id: number; name: string; }

const statusColor: Record<string, string> = {
  Open:    "bg-blue-50 text-blue-700",
  Partial: "bg-amber-50 text-amber-700",
  Closed:  "bg-emerald-50 text-emerald-700",
  Overdue: "bg-red-50 text-red-700",
};

const emptyForm = {
  po_number: "", supplier_id: "", order_date: "", expected_date: "", lines: "1", qty_ordered: "", total_value: "",
};

const PurchaseOrderSection = () => {
  const { data: pos = [], isLoading } = useMasterDataList<PoRecord>(POS_RESOURCE);
  const { data: suppliers = [] } = useMasterDataList<LookupRecord>(SUPPLIERS_RESOURCE);
  const createPo = useMasterDataCreate<PoRecord>(POS_RESOURCE);
  const updatePo = useMasterDataUpdate<PoRecord>(POS_RESOURCE);
  const deletePo = useMasterDataDelete(POS_RESOURCE);

  const supplierById = useMemo(() => new Map(suppliers.map(s => [s.id, s.name])), [suppliers]);

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<PoRecord | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  const filters = ["All", "Open", "Partial", "Closed", "Overdue"];
  const filtered = pos.filter(p =>
    (filter === "All" || p.status === filter) &&
    (p.po_number.toLowerCase().includes(search.toLowerCase()) ||
     (supplierById.get(p.supplier_id) || "").toLowerCase().includes(search.toLowerCase()))
  );
  const detail = pos.find(p => p.id === selected);
  const overdue = pos.find(p => p.status === "Overdue");

  const openNew = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setFormError(null);
    setShowForm(true);
  };
  const openEdit = (p: PoRecord) => {
    setEditTarget(p);
    setForm({
      po_number: p.po_number,
      supplier_id: String(p.supplier_id),
      order_date: p.order_date ? p.order_date.slice(0, 10) : "",
      expected_date: p.expected_date ? p.expected_date.slice(0, 10) : "",
      lines: String(p.lines),
      qty_ordered: String(p.qty_ordered),
      total_value: String(p.total_value),
    });
    setFormError(null);
    setShowForm(true);
  };

  const handleSave = async () => {
    setFormError(null);
    if (!form.po_number || !form.supplier_id || !form.expected_date) {
      setFormError("PO number, supplier and expected date are required.");
      return;
    }
    const payload = {
      po_number: form.po_number,
      supplier_id: Number(form.supplier_id),
      order_date: form.order_date ? new Date(form.order_date).toISOString() : null,
      expected_date: new Date(form.expected_date).toISOString(),
      lines: Number(form.lines) || 1,
      qty_ordered: Number(form.qty_ordered) || 0,
      total_value: Number(form.total_value) || 0,
    };
    try {
      if (editTarget) {
        await updatePo.mutateAsync({ id: editTarget.id, payload });
      } else {
        await createPo.mutateAsync({ ...payload, qty_received: 0, status: "Open" });
      }
      setShowForm(false);
      setEditTarget(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save purchase order.");
    }
  };

  const handleDelete = (id: number) => {
    deletePo.mutate(id);
    if (selected === id) setSelected(null);
  };

  const receiveAgainstPo = (p: PoRecord) => {
    updatePo.mutate({ id: p.id, payload: { qty_received: p.qty_ordered, status: "Closed" } });
  };

  return (
    <section className="grid grid-cols-1 lg:grid-cols-3 gap-4" id="po-section">
      {/* Table */}
      <div className="lg:col-span-2 bg-white rounded-xl border border-neutral-200">
        <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
              <ShoppingCart size={14} className="text-[#009FE3]" /> Purchase Orders
            </h2>
            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{pos.length} POs</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 border border-neutral-200 rounded-lg px-3 py-1.5 bg-neutral-50">
              <Search size={12} className="text-neutral-400" />
              <input className="bg-transparent text-xs text-neutral-700 placeholder-neutral-400 focus:outline-none w-28" placeholder="Search PO..." type="text"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <button onClick={openNew} className="flex items-center gap-1.5 px-3 py-1.5 text-white rounded-lg text-xs hover:opacity-90 transition" style={{ background: BRAND }}>
              <Plus size={12} /> New PO
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 border border-neutral-200 text-neutral-700 rounded-lg text-xs hover:bg-neutral-50" title="Coming soon">
              <FileUp size={12} /> Import
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 border border-neutral-200 text-neutral-700 rounded-lg text-xs hover:bg-neutral-50" title="Coming soon">
              <FileDown size={12} /> Export
            </button>
          </div>
        </div>
        {/* Filter chips */}
        <div className="px-5 py-2.5 border-b border-neutral-100 flex items-center gap-2 flex-wrap">
          {filters.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1 rounded-full transition-all ${filter === f ? "text-white" : "border border-neutral-200 text-neutral-600 hover:bg-neutral-50"}`}
              style={filter === f ? { background: BRAND } : {}}
            >{f}</button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-100">
                <th className="text-left py-2.5 px-3 text-neutral-500">PO #</th>
                <th className="text-left py-2.5 px-3 text-neutral-500">Supplier</th>
                <th className="text-left py-2.5 px-3 text-neutral-500">Expected</th>
                <th className="text-left py-2.5 px-3 text-neutral-500">Lines</th>
                <th className="text-left py-2.5 px-3 text-neutral-500">Ordered</th>
                <th className="text-left py-2.5 px-3 text-neutral-500">Received</th>
                <th className="text-left py-2.5 px-3 text-neutral-500">Status</th>
                <th className="text-left py-2.5 px-3 text-neutral-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {isLoading ? (
                <tr><td colSpan={8} className="text-center py-8 text-neutral-400"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Loading purchase orders...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-neutral-400">No purchase orders found.</td></tr>
              ) : filtered.map(po => (
                <tr key={po.id}
                  className={`hover:bg-blue-50/30 cursor-pointer transition-colors ${selected === po.id ? "bg-blue-50/50" : ""}`}
                  onClick={() => setSelected(po.id)}
                >
                  <td className="py-2.5 px-3 font-medium text-neutral-900">{po.po_number}</td>
                  <td className="py-2.5 px-3 text-neutral-700">{supplierById.get(po.supplier_id) || `#${po.supplier_id}`}</td>
                  <td className="py-2.5 px-3 text-neutral-600">{po.expected_date ? new Date(po.expected_date).toLocaleDateString() : "—"}</td>
                  <td className="py-2.5 px-3 text-neutral-700">{po.lines}</td>
                  <td className="py-2.5 px-3 text-neutral-700">{po.qty_ordered.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-neutral-700">{po.qty_received.toLocaleString()}</td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[po.status] || "bg-neutral-100 text-neutral-600"}`}>{po.status}</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1.5">
                      <button onClick={e => { e.stopPropagation(); setSelected(po.id); setShowForm(false); }} className="text-neutral-400 hover:text-[#009FE3] transition-colors"><Eye size={12} /></button>
                      <button onClick={e => { e.stopPropagation(); openEdit(po); }} disabled={po.status === "Closed"}
                        className={`transition-colors ${po.status === "Closed" ? "text-neutral-200 cursor-not-allowed" : "text-neutral-400 hover:text-amber-500"}`}><Pencil size={12} /></button>
                      <button onClick={e => { e.stopPropagation(); handleDelete(po.id); }} className="text-neutral-400 hover:text-red-500 transition-colors"><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-neutral-100 flex items-center justify-between">
          <span className="text-xs text-neutral-400">Showing {filtered.length} of {pos.length} POs</span>
        </div>
      </div>

      {/* Side Panel */}
      <div className="flex flex-col gap-4">
        {showForm ? (
          /* Create/Edit PO Form */
          <div className="bg-white rounded-xl border border-neutral-200">
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
                <Plus size={13} className="text-[#009FE3]" /> {editTarget ? "Edit Purchase Order" : "Create New PO"}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-neutral-400 hover:text-neutral-600"><X size={14} /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs text-neutral-600 mb-1">PO Number <span className="text-neutral-400">*</span></label>
                <input className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#009FE3]" placeholder="PO-XXXX" type="text"
                  value={form.po_number} onChange={e => setForm(f => ({ ...f, po_number: e.target.value }))} disabled={!!editTarget} />
              </div>
              <div>
                <label className="block text-xs text-neutral-600 mb-1">Supplier <span className="text-neutral-400">*</span></label>
                <select className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs text-neutral-900 bg-white focus:outline-none focus:border-[#009FE3]"
                  value={form.supplier_id} onChange={e => setForm(f => ({ ...f, supplier_id: e.target.value }))}>
                  <option value="">Select supplier...</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-neutral-600 mb-1">Order Date</label>
                  <input className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#009FE3]" type="date"
                    value={form.order_date} onChange={e => setForm(f => ({ ...f, order_date: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-neutral-600 mb-1">Expected Date *</label>
                  <input className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#009FE3]" type="date"
                    value={form.expected_date} onChange={e => setForm(f => ({ ...f, expected_date: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-neutral-600 mb-1">Lines</label>
                  <input type="number" min="1" className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs focus:outline-none" value={form.lines}
                    onChange={e => setForm(f => ({ ...f, lines: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-neutral-600 mb-1">Ordered Qty</label>
                  <input type="number" min="0" className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs focus:outline-none" value={form.qty_ordered}
                    onChange={e => setForm(f => ({ ...f, qty_ordered: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-xs text-neutral-600 mb-1">PO Value ($)</label>
                <input type="number" min="0" className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs focus:outline-none" value={form.total_value}
                  onChange={e => setForm(f => ({ ...f, total_value: e.target.value }))} />
              </div>
              {formError && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</div>}
              <div className="pt-2 space-y-2">
                <button onClick={handleSave} disabled={createPo.isPending || updatePo.isPending}
                  className="w-full py-2 text-white rounded-lg text-xs hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-60" style={{ background: BRAND }}>
                  {(createPo.isPending || updatePo.isPending) ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                  {editTarget ? "Save Changes" : "Create Purchase Order"}
                </button>
                <button onClick={() => setShowForm(false)} className="w-full py-2 border border-neutral-200 text-neutral-700 rounded-lg text-xs hover:bg-neutral-50">Cancel</button>
              </div>
            </div>
          </div>
        ) : detail ? (
          /* PO Detail */
          <div className="bg-white rounded-xl border border-neutral-200">
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-neutral-900">{detail.po_number}</h3>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[detail.status] || "bg-neutral-100 text-neutral-600"}`}>{detail.status}</span>
            </div>
            <div className="p-5 space-y-3">
              {[
                ["Supplier", supplierById.get(detail.supplier_id) || `#${detail.supplier_id}`],
                ["Expected Date", detail.expected_date ? new Date(detail.expected_date).toLocaleDateString() : "—"],
                ["Total Lines", detail.lines],
                ["Ordered Qty", detail.qty_ordered.toLocaleString()],
                ["Received Qty", detail.qty_received.toLocaleString()],
                ["PO Value", `$${detail.total_value.toLocaleString()}`],
              ].map(([k, v]) => (
                <div key={k as string} className="flex justify-between text-xs">
                  <span className="text-neutral-500">{k}</span>
                  <span className="text-neutral-900 font-medium">{v}</span>
                </div>
              ))}
              {/* Progress */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-neutral-500">Receipt Progress</span>
                  <span className="text-neutral-900">{detail.qty_ordered > 0 ? Math.round((detail.qty_received / detail.qty_ordered) * 100) : 0}%</span>
                </div>
                <div className="w-full bg-neutral-100 rounded-full h-1.5">
                  <div className="h-1.5 rounded-full" style={{ width: `${detail.qty_ordered > 0 ? Math.round((detail.qty_received / detail.qty_ordered) * 100) : 0}%`, background: BRAND }}></div>
                </div>
              </div>
              <p className="text-xs text-neutral-400 italic pt-1">
                Per-SKU line items aren't tracked yet — this phase covers PO header + totals. Let me know if you need line-level detail next.
              </p>
              <div className="flex gap-2 pt-1">
                <button onClick={() => receiveAgainstPo(detail)} disabled={detail.status === "Closed"}
                  className={`flex-1 py-2 rounded-lg text-xs ${detail.status === "Closed" ? "bg-neutral-100 text-neutral-400 cursor-not-allowed" : "text-white hover:opacity-90"}`}
                  style={detail.status === "Closed" ? {} : { background: BRAND }}>
                  Receive Against PO
                </button>
                <button onClick={() => openEdit(detail)} disabled={detail.status === "Closed"}
                  className={`flex-1 py-2 border border-neutral-200 rounded-lg text-xs ${detail.status === "Closed" ? "text-neutral-300 cursor-not-allowed" : "text-neutral-700 hover:bg-neutral-50"}`}>
                  Edit PO
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-neutral-200 p-8 text-center">
            <ShoppingCart size={28} className="text-neutral-300 mx-auto mb-2" />
            <p className="text-xs text-neutral-400">Select a PO to view details</p>
          </div>
        )}

        {/* Alert card */}
        {overdue && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex gap-3">
            <AlertCircle size={15} className="text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-red-700">{pos.filter(p => p.status === "Overdue").length} Overdue PO(s)</p>
              <p className="text-xs text-red-600 mt-0.5">{overdue.po_number} from {supplierById.get(overdue.supplier_id) || "supplier"} needs follow-up.</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default PurchaseOrderSection;
