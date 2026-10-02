import React, { useMemo, useState } from "react";
import {
  FileText, Plus, Search, Eye, Pencil, CheckCircle2, FileDown, FileUp,
  ChevronLeft, ChevronRight, Calendar, X, Check, Trash2, AlertCircle, Loader2,
} from "lucide-react";
import {
  useMasterDataList,
  useMasterDataCreate,
  useMasterDataUpdate,
  useMasterDataDelete,
} from "@/hooks/useMasterDataApi";

const BRAND = "#009FE3";

const ASNS_RESOURCE = "/operations/asns";
const SUPPLIERS_RESOURCE = "/master-data/suppliers";
const CARRIERS_RESOURCE = "/master-data/carriers";
const OWNERS_RESOURCE = "/master-data/material-owners";

interface AsnRecord {
  id: number;
  asn_number: string;
  supplier_id: number;
  po_reference: string | null;
  carrier_id: number | null;
  material_owner_id: number | null;
  expected_date: string | null;
  tracking_number: string | null;
  dock_door: string | null;
  lines: number;
  qty_expected: number;
  qty_received: number;
  status: string;
}

interface LookupRecord { id: number; name: string; }

const statusStyle: Record<string, string> = {
  "In Progress": "bg-blue-50 text-blue-700",
  "Open":        "bg-sky-50 text-sky-700",
  "Received":    "bg-emerald-50 text-emerald-700",
  "Overdue":     "bg-red-50 text-red-700",
  "Closed":      "bg-neutral-100 text-neutral-500",
};

const emptyForm = {
  asn_number: "", supplier_id: "", po_reference: "", carrier_id: "", material_owner_id: "",
  expected_date: "", tracking_number: "", dock_door: "", lines: "1", qty_expected: "",
};

const AsnSection = () => {
  const { data: asns = [], isLoading } = useMasterDataList<AsnRecord>(ASNS_RESOURCE);
  const { data: suppliers = [] } = useMasterDataList<LookupRecord>(SUPPLIERS_RESOURCE);
  const { data: carriers = [] } = useMasterDataList<LookupRecord>(CARRIERS_RESOURCE);
  const { data: owners = [] } = useMasterDataList<LookupRecord>(OWNERS_RESOURCE);
  const createAsn = useMasterDataCreate<AsnRecord>(ASNS_RESOURCE);
  const updateAsn = useMasterDataUpdate<AsnRecord>(ASNS_RESOURCE);
  const deleteAsn = useMasterDataDelete(ASNS_RESOURCE);

  const supplierById = useMemo(() => new Map(suppliers.map(s => [s.id, s.name])), [suppliers]);
  const carrierById = useMemo(() => new Map(carriers.map(c => [c.id, c.name])), [carriers]);
  const ownerById = useMemo(() => new Map(owners.map(o => [o.id, o.name])), [owners]);

  const [selected, setSelected] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<AsnRecord | null>(null);
  const [filterChip, setFilterChip] = useState("All");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  const filters = ["All", "Open", "In Progress", "Received", "Closed", "Overdue"];
  const filtered = asns.filter(a =>
    (filterChip === "All" || a.status === filterChip) &&
    (a.asn_number.toLowerCase().includes(search.toLowerCase()) ||
     (supplierById.get(a.supplier_id) || "").toLowerCase().includes(search.toLowerCase()) ||
     (a.po_reference || "").toLowerCase().includes(search.toLowerCase()))
  );
  const detail = asns.find(a => a.id === selected);

  const openNew = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setFormError(null);
    setShowForm(true);
  };
  const openEdit = (a: AsnRecord) => {
    setEditTarget(a);
    setForm({
      asn_number: a.asn_number,
      supplier_id: String(a.supplier_id),
      po_reference: a.po_reference || "",
      carrier_id: a.carrier_id ? String(a.carrier_id) : "",
      material_owner_id: a.material_owner_id ? String(a.material_owner_id) : "",
      expected_date: a.expected_date ? a.expected_date.slice(0, 10) : "",
      tracking_number: a.tracking_number || "",
      dock_door: a.dock_door || "",
      lines: String(a.lines),
      qty_expected: String(a.qty_expected),
    });
    setFormError(null);
    setShowForm(true);
  };

  const handleSave = async () => {
    setFormError(null);
    if (!form.asn_number || !form.supplier_id || !form.expected_date) {
      setFormError("ASN number, supplier and expected date are required.");
      return;
    }
    const payload = {
      asn_number: form.asn_number,
      supplier_id: Number(form.supplier_id),
      po_reference: form.po_reference || null,
      carrier_id: form.carrier_id ? Number(form.carrier_id) : null,
      material_owner_id: form.material_owner_id ? Number(form.material_owner_id) : null,
      expected_date: new Date(form.expected_date).toISOString(),
      tracking_number: form.tracking_number || null,
      dock_door: form.dock_door || null,
      lines: Number(form.lines) || 1,
      qty_expected: Number(form.qty_expected) || 0,
    };
    try {
      if (editTarget) {
        await updateAsn.mutateAsync({ id: editTarget.id, payload });
      } else {
        await createAsn.mutateAsync({ ...payload, qty_received: 0, status: "Open" });
      }
      setShowForm(false);
      setEditTarget(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save ASN.");
    }
  };

  const handleDelete = (id: number) => {
    deleteAsn.mutate(id);
    if (selected === id) setSelected(null);
  };
  const markReceived = (a: AsnRecord) => {
    updateAsn.mutate({ id: a.id, payload: { status: "Received", qty_received: a.qty_expected } });
  };

  return (
    <>
    <section className="grid grid-cols-1 lg:grid-cols-3 gap-4" id="asn-section">
      {/* ASN Table */}
      <div className="lg:col-span-2 bg-white rounded-xl border border-neutral-200">
        <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
              <FileText size={14} style={{ color: BRAND }} /> Advance Shipment Notice (ASN)
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#009FE315", color: BRAND }}>
              {asns.filter(a => a.status === "Open" || a.status === "In Progress").length} open
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 border border-neutral-200 rounded-lg px-3 py-1.5 bg-neutral-50">
              <Search size={12} className="text-neutral-400" />
              <input className="bg-transparent text-xs text-neutral-700 placeholder-neutral-400 focus:outline-none w-28"
                placeholder="Search ASN..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <button onClick={openNew}
              className="flex items-center gap-1.5 px-3 py-1.5 text-white rounded-lg text-xs hover:opacity-90 transition-opacity"
              style={{ background: BRAND }}>
              <Plus size={12} /> New ASN
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 border border-neutral-200 text-neutral-700 rounded-lg text-xs hover:bg-neutral-50 transition-colors" title="Coming soon">
              <FileUp size={12} /> Import
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 border border-neutral-200 text-neutral-700 rounded-lg text-xs hover:bg-neutral-50 transition-colors" title="Coming soon">
              <FileDown size={12} /> Export
            </button>
          </div>
        </div>

        {/* Filter chips */}
        <div className="px-5 py-3 border-b border-neutral-100 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-neutral-500">Filter:</span>
          {filters.map(f => (
            <button key={f} onClick={() => setFilterChip(f)}
              className="text-xs px-2.5 py-1 rounded-full transition-all border"
              style={filterChip === f
                ? { background: BRAND, color: "#fff", borderColor: BRAND }
                : { borderColor: "#E5E7EB", color: "#6B7280" }}>
              {f}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-100">
                <th className="text-left py-2.5 px-3 text-neutral-500">ASN #</th>
                <th className="text-left py-2.5 px-3 text-neutral-500">Supplier</th>
                <th className="text-left py-2.5 px-3 text-neutral-500">PO #</th>
                <th className="text-left py-2.5 px-3 text-neutral-500">Expected</th>
                <th className="text-left py-2.5 px-3 text-neutral-500">Lines</th>
                <th className="text-left py-2.5 px-3 text-neutral-500">Qty</th>
                <th className="text-left py-2.5 px-3 text-neutral-500">Status</th>
                <th className="text-left py-2.5 px-3 text-neutral-500">Carrier</th>
                <th className="text-left py-2.5 px-3 text-neutral-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {isLoading ? (
                <tr><td colSpan={9} className="text-center py-8 text-neutral-400"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Loading ASNs...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-8 text-neutral-400">No ASNs found.</td></tr>
              ) : filtered.map(a => (
                <tr key={a.id}
                  className={`hover:bg-blue-50/20 cursor-pointer transition-colors ${selected === a.id ? "bg-blue-50/40" : ""}`}
                  style={selected === a.id ? { borderLeft: `3px solid ${BRAND}` } : {}}
                  onClick={() => setSelected(a.id)}>
                  <td className="py-2.5 px-3 font-medium text-neutral-900">{a.asn_number}</td>
                  <td className="py-2.5 px-3 text-neutral-700">{supplierById.get(a.supplier_id) || `#${a.supplier_id}`}</td>
                  <td className="py-2.5 px-3 text-neutral-600">{a.po_reference || "—"}</td>
                  <td className="py-2.5 px-3 text-neutral-700">{a.expected_date ? new Date(a.expected_date).toLocaleDateString() : "—"}</td>
                  <td className="py-2.5 px-3 text-neutral-700">{a.lines}</td>
                  <td className="py-2.5 px-3 text-neutral-700">{a.qty_expected.toLocaleString()}</td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle[a.status] || "bg-neutral-100 text-neutral-600"}`}>{a.status}</span>
                  </td>
                  <td className="py-2.5 px-3 text-neutral-600">{a.carrier_id ? (carrierById.get(a.carrier_id) || `#${a.carrier_id}`) : "—"}</td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1.5">
                      <button onClick={e => { e.stopPropagation(); setSelected(a.id); setShowForm(false); }}
                        className="text-neutral-400 transition-colors hover:text-[#009FE3]" title="View"><Eye size={12} /></button>
                      <button onClick={e => { e.stopPropagation(); openEdit(a); }}
                        disabled={a.status === "Closed"}
                        className={`transition-colors ${a.status === "Closed" ? "text-neutral-200 cursor-not-allowed" : "text-neutral-400 hover:text-amber-500"}`} title="Edit"><Pencil size={12} /></button>
                      <button onClick={e => { e.stopPropagation(); markReceived(a); }}
                        disabled={a.status === "Closed" || a.status === "Received"}
                        className={`transition-colors ${(a.status === "Closed" || a.status === "Received") ? "text-neutral-200 cursor-not-allowed" : "text-neutral-400 hover:text-emerald-600"}`} title="Mark Received"><CheckCircle2 size={12} /></button>
                      <button onClick={e => { e.stopPropagation(); handleDelete(a.id); }}
                        className="text-neutral-400 hover:text-red-500 transition-colors" title="Delete"><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 border-t border-neutral-100 flex items-center justify-between">
          <span className="text-xs text-neutral-400">Showing {filtered.length} of {asns.length} ASNs</span>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-col gap-4">
        {showForm ? (
          <div className="bg-white rounded-xl border border-neutral-200">
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
                <Plus size={13} style={{ color: BRAND }} />
                {editTarget ? "Edit ASN" : "Create New ASN"}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-neutral-400 hover:text-neutral-700"><X size={14} /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs text-neutral-600 mb-1">ASN Number *</label>
                <input className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs focus:outline-none"
                  placeholder="ASN-2026-XXXX" value={form.asn_number} onChange={e => setForm(f => ({ ...f, asn_number: e.target.value }))}
                  disabled={!!editTarget} />
              </div>
              <div>
                <label className="block text-xs text-neutral-600 mb-1">Supplier *</label>
                <select className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs text-neutral-900 bg-white focus:outline-none"
                  value={form.supplier_id} onChange={e => setForm(f => ({ ...f, supplier_id: e.target.value }))}>
                  <option value="">Select supplier...</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-neutral-600 mb-1">PO Reference</label>
                <input className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs focus:outline-none"
                  placeholder="PO-XXXX" value={form.po_reference} onChange={e => setForm(f => ({ ...f, po_reference: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-neutral-600 mb-1">Expected Date *</label>
                  <input type="date" className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs focus:outline-none"
                    value={form.expected_date} onChange={e => setForm(f => ({ ...f, expected_date: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-neutral-600 mb-1">Carrier</label>
                  <select className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none"
                    value={form.carrier_id} onChange={e => setForm(f => ({ ...f, carrier_id: e.target.value }))}>
                    <option value="">None</option>
                    {carriers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-neutral-600 mb-1">Tracking Number</label>
                <input className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs focus:outline-none"
                  placeholder="Tracking #" value={form.tracking_number} onChange={e => setForm(f => ({ ...f, tracking_number: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-neutral-600 mb-1">Lines</label>
                  <input type="number" min="1" className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs focus:outline-none"
                    value={form.lines} onChange={e => setForm(f => ({ ...f, lines: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-neutral-600 mb-1">Expected Qty</label>
                  <input type="number" min="0" className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs focus:outline-none"
                    value={form.qty_expected} onChange={e => setForm(f => ({ ...f, qty_expected: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-xs text-neutral-600 mb-1">Dock Door</label>
                <input className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs focus:outline-none"
                  placeholder="e.g. DOCK-01" value={form.dock_door} onChange={e => setForm(f => ({ ...f, dock_door: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-neutral-600 mb-1">Material Owner</label>
                <select className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none"
                  value={form.material_owner_id} onChange={e => setForm(f => ({ ...f, material_owner_id: e.target.value }))}>
                  <option value="">None</option>
                  {owners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
              {formError && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</div>
              )}
              <div className="flex items-center gap-2 pt-2">
                <button onClick={handleSave} disabled={createAsn.isPending || updateAsn.isPending}
                  className="flex-1 py-2 text-white rounded-lg text-xs hover:opacity-90 flex items-center justify-center gap-1.5 transition-opacity disabled:opacity-60"
                  style={{ background: BRAND }}>
                  {(createAsn.isPending || updateAsn.isPending) ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                  {editTarget ? "Save Changes" : "Create ASN"}
                </button>
                <button onClick={() => setShowForm(false)}
                  className="flex-1 py-2 border border-neutral-200 text-neutral-700 rounded-lg text-xs hover:bg-neutral-50">Cancel</button>
              </div>
            </div>
          </div>
        ) : detail ? (
          <div className="bg-white rounded-xl border border-neutral-200">
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-neutral-900">{detail.asn_number}</h3>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle[detail.status] || "bg-neutral-100 text-neutral-600"}`}>{detail.status}</span>
            </div>
            <div className="p-5 space-y-3">
              {[
                ["Supplier",       supplierById.get(detail.supplier_id) || `#${detail.supplier_id}`],
                ["PO Reference",   detail.po_reference || "—"],
                ["Expected Date",  detail.expected_date ? new Date(detail.expected_date).toLocaleDateString() : "—"],
                ["Carrier",        detail.carrier_id ? (carrierById.get(detail.carrier_id) || `#${detail.carrier_id}`) : "—"],
                ["Tracking #",     detail.tracking_number || "—"],
                ["Total Lines",    detail.lines],
                ["Expected Qty",   detail.qty_expected.toLocaleString()],
                ["Received Qty",   detail.qty_received.toLocaleString()],
                ["Dock Door",      detail.dock_door || "—"],
                ["Material Owner", detail.material_owner_id ? (ownerById.get(detail.material_owner_id) || `#${detail.material_owner_id}`) : "—"],
              ].map(([k, v]) => (
                <div key={k as string} className="flex justify-between text-xs">
                  <span className="text-neutral-500">{k}</span>
                  <span className="text-neutral-900 font-medium">{v}</span>
                </div>
              ))}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-neutral-500">Receipt Progress</span>
                  <span className="text-neutral-900 font-medium">{detail.qty_expected > 0 ? Math.round((detail.qty_received / detail.qty_expected) * 100) : 0}%</span>
                </div>
                <div className="w-full bg-neutral-100 rounded-full h-1.5">
                  <div className="h-1.5 rounded-full transition-all" style={{ width: `${detail.qty_expected > 0 ? Math.round((detail.qty_received / detail.qty_expected) * 100) : 0}%`, background: BRAND }} />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => markReceived(detail)}
                  disabled={detail.status === "Closed" || detail.status === "Received"}
                  className={`flex-1 py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-opacity font-medium ${(detail.status === "Closed" || detail.status === "Received") ? "bg-neutral-100 text-neutral-400 cursor-not-allowed" : "text-white hover:opacity-90"}`}
                  style={(detail.status === "Closed" || detail.status === "Received") ? {} : { background: BRAND }}>
                  <CheckCircle2 size={11} /> Receive
                </button>
                <button onClick={() => openEdit(detail)}
                  disabled={detail.status === "Closed"}
                  className={`flex-1 py-2 border border-neutral-200 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors ${detail.status === "Closed" ? "text-neutral-300 cursor-not-allowed" : "text-neutral-700 hover:bg-neutral-50"}`}>
                  <Pencil size={11} /> Edit
                </button>
              </div>
              <button onClick={() => handleDelete(detail.id)}
                className="w-full py-2 border border-red-200 text-red-600 rounded-lg text-xs hover:bg-red-50 flex items-center justify-center gap-1.5 transition-colors">
                <Trash2 size={11} /> Delete ASN
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-neutral-200 p-8 text-center">
            <FileText size={28} className="text-neutral-300 mx-auto mb-2" />
            <p className="text-xs text-neutral-400">Select an ASN to view details</p>
          </div>
        )}

        {/* Overdue alert */}
        {asns.some(a => a.status === "Overdue") && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
            <AlertCircle size={15} className="text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-red-700">{asns.filter(a => a.status === "Overdue").length} Overdue ASN(s)</p>
              <p className="text-xs text-red-600 mt-0.5">Follow up with the supplier on overdue shipments.</p>
            </div>
          </div>
        )}
      </div>
    </section>
    </>
  );
};

export default AsnSection;
