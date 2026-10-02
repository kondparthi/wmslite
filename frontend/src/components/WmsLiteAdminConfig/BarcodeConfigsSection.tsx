import React, { useState } from "react";
import { QrCode, Plus, Search, Pencil, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BarcodePreview from "@/components/WmsLiteInbound/BarcodePreview";
import {
  useBarcodeConfigs, useCreateBarcodeConfig, useUpdateBarcodeConfig, useDeleteBarcodeConfig,
} from "@/hooks/useAdminConfigApi2";
import type { BarcodeConfig } from "@/hooks/useAdminConfigApi2";

const BRAND = "#009FE3";

const MODULES = ["Inbound", "Outbound", "Inventory", "Master Data"];
const LABEL_TYPES = ["Receiving Label", "Putaway Label", "Shipping Label", "Location Label"];
const SYMBOLOGIES = ["Code128", "Code39", "EAN13", "QR"];
const ALL_FIELDS = ["LPN", "Material", "Qty", "Condition", "Destination", "Tracking No", "Carrier", "Service", "Weight", "Location Code", "Zone", "Aisle"];

const SAMPLE_VALUE_BY_TYPE: Record<string, string> = {
  "Receiving Label": "RCV-000123",
  "Putaway Label": "PUT-000045",
  "Shipping Label": "SH-000789",
  "Location Label": "A-01-01",
};

type FormState = {
  module: string;
  label_type: string;
  symbology: string;
  label_width_mm: string;
  label_height_mm: string;
  fields: string[];
  active: boolean;
};

const emptyForm: FormState = {
  module: "Inbound",
  label_type: "Receiving Label",
  symbology: "Code128",
  label_width_mm: "100",
  label_height_mm: "50",
  fields: ["LPN", "Material", "Qty"],
  active: true,
};

export default function BarcodeConfigsSection() {
  const { data: configs = [] } = useBarcodeConfigs();
  const createConfig = useCreateBarcodeConfig();
  const updateConfig = useUpdateBarcodeConfig();
  const deleteConfig = useDeleteBarcodeConfig();

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<BarcodeConfig | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saved, setSaved] = useState(false);

  const notify = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };
  const openNew = () => { setForm(emptyForm); setEditTarget(null); setShowForm(true); };
  const openEdit = (c: BarcodeConfig) => {
    setForm({
      module: c.module, label_type: c.label_type, symbology: c.symbology,
      label_width_mm: String(c.label_width_mm), label_height_mm: String(c.label_height_mm),
      fields: c.fields_included.split(",").map(f => f.trim()).filter(Boolean),
      active: c.active,
    });
    setEditTarget(c);
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditTarget(null); };

  const toggleField = (f: string) => {
    setForm(prev => ({ ...prev, fields: prev.fields.includes(f) ? prev.fields.filter(x => x !== f) : [...prev.fields, f] }));
  };

  const handleSave = () => {
    const payload = {
      module: form.module,
      label_type: form.label_type,
      symbology: form.symbology,
      label_width_mm: Number(form.label_width_mm),
      label_height_mm: Number(form.label_height_mm),
      fields_included: form.fields.join(","),
      active: form.active,
    };
    if (editTarget) {
      updateConfig.mutate({ id: editTarget.id, payload }, { onSuccess: notify });
    } else {
      createConfig.mutate(payload, { onSuccess: notify });
    }
    closeForm();
  };

  const filtered = configs.filter(c =>
    c.module.toLowerCase().includes(search.toLowerCase()) ||
    c.label_type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">Bar Code Configs</h2>
          <p className="text-sm text-neutral-500 mt-0.5">Configure label symbology, dimensions and printed fields for every label type — Label Generation and Shipping Execution read these configs directly.</p>
        </div>
        {saved && <div className="flex items-center gap-1.5 text-emerald-600 text-sm"><Check className="w-4 h-4" />Saved successfully</div>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-neutral-200">
          <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-2"><QrCode size={14} style={{ color: BRAND }} /> Label Configurations</h3>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 border border-neutral-200 rounded-lg px-3 py-1.5 bg-neutral-50">
                <Search size={12} className="text-neutral-400" />
                <input className="bg-transparent text-xs focus:outline-none w-32" placeholder="Search module/label..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Button size="sm" className="bg-neutral-900 hover:bg-neutral-800 text-white gap-1.5 text-xs" onClick={openNew}><Plus size={12} /> Add Config</Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-100">
                  {["ID", "Module", "Label Type", "Symbology", "Size (mm)", "Fields", "Active", "Actions"].map(h => (
                    <th key={h} className="text-left py-2.5 px-3 text-neutral-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {filtered.map(c => (
                  <tr key={c.id} className={`hover:bg-blue-50/20 cursor-pointer transition-colors ${selected === c.id ? "bg-blue-50/40" : ""}`}
                    style={selected === c.id ? { borderLeft: `3px solid ${BRAND}` } : {}} onClick={() => setSelected(c.id)}>
                    <td className="py-2.5 px-3 font-medium text-neutral-900">{c.id}</td>
                    <td className="py-2.5 px-3"><span className="px-2 py-0.5 rounded text-xs" style={{ background: "#009FE315", color: BRAND }}>{c.module}</span></td>
                    <td className="py-2.5 px-3 text-neutral-800">{c.label_type}</td>
                    <td className="py-2.5 px-3"><code className="bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-700 font-mono">{c.symbology}</code></td>
                    <td className="py-2.5 px-3 text-neutral-600">{c.label_width_mm} × {c.label_height_mm}</td>
                    <td className="py-2.5 px-3 text-neutral-500 max-w-[180px] truncate" title={c.fields_included}>{c.fields_included}</td>
                    <td className="py-2.5 px-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.active ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500"}`}>{c.active ? "Active" : "Inactive"}</span></td>
                    <td className="py-2.5 px-3">
                      <div className="flex gap-1.5">
                        <button onClick={e => { e.stopPropagation(); openEdit(c); }} className="text-neutral-400 hover:text-amber-500 transition-colors"><Pencil size={12} /></button>
                        <button onClick={e => { e.stopPropagation(); deleteConfig.mutate(c.id); if (selected === c.id) setSelected(null); }} className="text-neutral-400 hover:text-red-500 transition-colors"><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-8 text-neutral-400">No bar code configs found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          {showForm ? (
            <Card className="border border-neutral-200 shadow-none">
              <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-semibold">{editTarget ? "Edit Config" : "New Config"}</CardTitle>
                <button onClick={closeForm} className="text-neutral-400 hover:text-neutral-700"><X size={14} /></button>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1"><Label className="text-xs">Module</Label>
                  <Select value={form.module} onValueChange={v => setForm(f => ({ ...f, module: v }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{MODULES.map(m => <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label className="text-xs">Label Type</Label>
                  <Select value={form.label_type} onValueChange={v => setForm(f => ({ ...f, label_type: v }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{LABEL_TYPES.map(t => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label className="text-xs">Symbology</Label>
                  <Select value={form.symbology} onValueChange={v => setForm(f => ({ ...f, symbology: v }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{SYMBOLOGIES.map(sy => <SelectItem key={sy} value={sy} className="text-xs">{sy}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1"><Label className="text-xs">Width (mm)</Label><Input className="h-8 text-xs" type="number" value={form.label_width_mm} onChange={e => setForm(f => ({ ...f, label_width_mm: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Height (mm)</Label><Input className="h-8 text-xs" type="number" value={form.label_height_mm} onChange={e => setForm(f => ({ ...f, label_height_mm: e.target.value }))} /></div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Fields Included</Label>
                  <div className="grid grid-cols-2 gap-1.5 border border-neutral-200 rounded-lg p-2.5 max-h-32 overflow-y-auto">
                    {ALL_FIELDS.map(f => (
                      <label key={f} className="flex items-center gap-1.5 text-xs text-neutral-700 cursor-pointer">
                        <Checkbox checked={form.fields.includes(f)} onCheckedChange={() => toggleField(f)} />
                        {f}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between py-0.5">
                  <Label className="text-xs">Active</Label>
                  <Switch checked={form.active} onCheckedChange={v => setForm(f => ({ ...f, active: v }))} />
                </div>

                <div className="border-t border-neutral-100 pt-3 space-y-2">
                  <p className="text-xs font-medium text-neutral-600">Live Preview</p>
                  <div className="flex justify-center py-2 bg-neutral-50 border border-neutral-200 rounded-lg">
                    <BarcodePreview value={SAMPLE_VALUE_BY_TYPE[form.label_type] || "SAMPLE-000000"} symbology={form.symbology} />
                  </div>
                  <p className="text-[10px] text-neutral-400 text-center">Sample encoding for a {form.label_type.toLowerCase()} — the real Label Generation preview uses the actual LPN/task code.</p>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button size="sm" className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-white gap-1 text-xs" onClick={handleSave}><Check size={11} /> {editTarget ? "Save" : "Create"}</Button>
                  <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={closeForm}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          ) : selected ? (
            (() => {
              const c = configs.find(x => x.id === selected);
              return c ? (
                <Card className="border border-neutral-200 shadow-none">
                  <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">{c.label_type}</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-center py-2 bg-neutral-50 border border-neutral-200 rounded-lg">
                      <BarcodePreview value={SAMPLE_VALUE_BY_TYPE[c.label_type] || "SAMPLE-000000"} symbology={c.symbology} />
                    </div>
                    {[["Module", c.module], ["Symbology", c.symbology], ["Size", `${c.label_width_mm} × ${c.label_height_mm} mm`], ["Fields", c.fields_included]].map(([k, v]) => (
                      <div key={k} className="flex justify-between text-xs gap-3">
                        <span className="text-neutral-500 flex-shrink-0">{k}</span>
                        <span className="font-medium text-neutral-800 text-right">{v}</span>
                      </div>
                    ))}
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-white text-xs gap-1" onClick={() => openEdit(c)}><Pencil size={10} /> Edit</Button>
                      <Button size="sm" variant="outline" className="flex-1 text-xs text-red-600 border-red-200 hover:bg-red-50" onClick={() => { deleteConfig.mutate(selected); setSelected(null); }}><Trash2 size={10} /> Delete</Button>
                    </div>
                  </CardContent>
                </Card>
              ) : null;
            })()
          ) : (
            <Card className="border border-neutral-200 shadow-none p-8 text-center">
              <QrCode size={28} className="mx-auto mb-2 text-neutral-300" />
              <p className="text-xs text-neutral-400">Select or create a bar code config</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
