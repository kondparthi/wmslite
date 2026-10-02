import { useState } from 'react';
import { X, CheckCircle, Package, Truck, MapPin, Barcode, Zap, Save, AlertTriangle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';

type BulkOperationType =
  | 'bulk-putaway'
  | 'bulk-picking'
  | 'bulk-allocation'
  | 'bulk-receive'
  | 'bulk-status-update';

interface BulkOperationsDrawerProps {
  type: BulkOperationType;
  selectedItems: { id: string; sku?: string; qty?: number; desc?: string }[];
  onClose: () => void;
  onComplete?: () => void;
}

const typeConfig = {
  'bulk-putaway': { title: 'Bulk Putaway', icon: Package, description: 'Assign putaway locations for all selected items in one operation.' },
  'bulk-picking': { title: 'Bulk Picking', icon: Zap, description: 'Execute pick tasks for all selected order lines simultaneously.' },
  'bulk-allocation': { title: 'Bulk Allocation', icon: MapPin, description: 'Allocate inventory to multiple orders or tasks at once.' },
  'bulk-receive': { title: 'Bulk Receive', icon: Truck, description: 'Confirm receipt for all selected ASN lines.' },
  'bulk-status-update': { title: 'Bulk Status Update', icon: CheckCircle, description: 'Update the status of all selected records at once.' },
};

export default function BulkOperationsDrawer({ type, selectedItems, onClose, onComplete }: BulkOperationsDrawerProps) {
  const [step, setStep] = useState<'configure' | 'confirm' | 'executing' | 'done'>('configure');
  const [progress, setProgress] = useState(0);
  const [form, setForm] = useState({
    targetZone: '',
    targetLocation: '',
    strategy: 'nearest-empty',
    status: 'Received',
    picker: '',
    notes: '',
    overrideConflicts: false,
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [doneCount, setDoneCount] = useState(0);

  const config = typeConfig[type];

  const handleExecute = () => {
    setStep('executing');
    let current = 0;
    const total = selectedItems.length;
    const interval = setInterval(() => {
      current++;
      setProgress(Math.round((current / total) * 100));
      setDoneCount(current);
      if (current >= total) {
        clearInterval(interval);
        setStep('done');
      }
    }, 180);
  };

  const handleConfirm = () => {
    const errs: string[] = [];
    if ((type === 'bulk-putaway' || type === 'bulk-receive') && !form.targetZone) errs.push('Target Zone is required.');
    if (errs.length > 0) { setErrors(errs); return; }
    setErrors([]);
    setStep('confirm');
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="w-[520px] bg-white h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#003A78,#005BAA)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
              <config.icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">{config.title}</p>
              <p className="text-blue-200 text-xs mt-0.5">{selectedItems.length} item(s) selected</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="px-6 py-3 border-b border-neutral-100 bg-neutral-50 flex items-center gap-2 flex-shrink-0">
          {['configure', 'confirm', 'execute', 'done'].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                step === s || (step === 'executing' && s === 'execute') || (step === 'done' && i < 4)
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-200 text-neutral-500'
              }`}>{i + 1}</div>
              <span className="text-xs text-neutral-600 capitalize">{s === 'executing' ? 'execute' : s}</span>
              {i < 3 && <div className="w-4 h-0.5 bg-neutral-200 mx-1" />}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Configure Step */}
          {step === 'configure' && (
            <div className="space-y-5">
              <p className="text-xs text-neutral-500">{config.description}</p>

              {/* Selected items preview */}
              <div>
                <p className="text-xs font-semibold text-neutral-700 mb-2">Selected Items</p>
                <div className="max-h-40 overflow-y-auto space-y-1.5 border border-neutral-200 rounded-lg p-2 bg-neutral-50">
                  {selectedItems.map(item => (
                    <div key={item.id} className="flex items-center justify-between px-2 py-1.5 bg-white rounded border border-neutral-100">
                      <div>
                        <p className="text-xs font-mono font-semibold text-neutral-800">{item.id}</p>
                        {item.sku && <p className="text-[10px] text-neutral-500">{item.sku}{item.desc ? ` · ${item.desc}` : ''}</p>}
                      </div>
                      {item.qty != null && <Badge variant="outline" className="text-xs">{item.qty} units</Badge>}
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Operation-specific form */}
              {(type === 'bulk-putaway' || type === 'bulk-receive') && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Target Zone *</Label>
                    <Select value={form.targetZone} onValueChange={v => setForm({ ...form, targetZone: v })}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select zone" /></SelectTrigger>
                      <SelectContent>
                        {['ZN-A (Pick Face)', 'ZN-B (Reserve)', 'ZN-C (Bulk)', 'ZN-D (Overflow)', 'QC Hold Zone'].map(z =>
                          <SelectItem key={z} value={z} className="text-xs">{z}</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Putaway Strategy</Label>
                    <Select value={form.strategy} onValueChange={v => setForm({ ...form, strategy: v })}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nearest-empty">Nearest Empty Location</SelectItem>
                        <SelectItem value="fixed-location">Fixed Location (Rule-Based)</SelectItem>
                        <SelectItem value="velocity">Velocity-Based Slotting</SelectItem>
                        <SelectItem value="manual">Manual Override</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {form.strategy === 'manual' && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Target Location (for all)</Label>
                      <Input value={form.targetLocation} onChange={e => setForm({ ...form, targetLocation: e.target.value })}
                        className="h-8 text-sm font-mono" placeholder="e.g. ZN-A/A-02/B-04" />
                    </div>
                  )}
                </div>
              )}

              {type === 'bulk-picking' && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Assign Picker</Label>
                    <Select value={form.picker} onValueChange={v => setForm({ ...form, picker: v })}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select picker" /></SelectTrigger>
                      <SelectContent>
                        {['Raj Kumar', 'Priya Nair', 'James Hartwell', 'Auto-assign'].map(p =>
                          <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Pick Strategy</Label>
                    <Select value={form.strategy} onValueChange={v => setForm({ ...form, strategy: v })}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fifo">FIFO</SelectItem>
                        <SelectItem value="fefo">FEFO (Expiry-Based)</SelectItem>
                        <SelectItem value="zone-pick">Zone Pick</SelectItem>
                        <SelectItem value="wave-pick">Wave Picking</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {type === 'bulk-allocation' && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Allocation Rule</Label>
                    <Select value={form.strategy} onValueChange={v => setForm({ ...form, strategy: v })}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fifo">FIFO</SelectItem>
                        <SelectItem value="fefo">FEFO</SelectItem>
                        <SelectItem value="lot-controlled">Lot-Controlled</SelectItem>
                        <SelectItem value="priority-order">Priority Order First</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {type === 'bulk-status-update' && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">New Status</Label>
                    <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['Received', 'In Progress', 'Completed', 'On Hold', 'Cancelled'].map(s =>
                          <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Notes (optional)</Label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="w-full border border-neutral-200 rounded-lg p-2 text-xs text-neutral-700 resize-none focus:outline-none focus:border-[#009FE3]" rows={2} />
              </div>

              {errors.length > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  {errors.map((e, i) => <p key={i} className="text-xs text-red-700 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{e}</p>)}
                </div>
              )}
            </div>
          )}

          {/* Confirm Step */}
          {step === 'confirm' && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-amber-800">Please review before executing</p>
                    <p className="text-xs text-amber-700 mt-0.5">This operation will affect {selectedItems.length} records. This action cannot be undone.</p>
                  </div>
                </div>
              </div>
              <Card className="border border-neutral-200 shadow-none">
                <CardContent className="p-4 space-y-2">
                  <div className="flex justify-between text-xs"><span className="text-neutral-500">Operation</span><span className="font-semibold text-neutral-900">{config.title}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-neutral-500">Items Affected</span><span className="font-semibold text-neutral-900">{selectedItems.length}</span></div>
                  {form.targetZone && <div className="flex justify-between text-xs"><span className="text-neutral-500">Target Zone</span><span className="font-semibold text-neutral-900">{form.targetZone}</span></div>}
                  {form.strategy && <div className="flex justify-between text-xs"><span className="text-neutral-500">Strategy</span><span className="font-semibold text-neutral-900 capitalize">{form.strategy.replace(/-/g, ' ')}</span></div>}
                  {form.picker && <div className="flex justify-between text-xs"><span className="text-neutral-500">Picker</span><span className="font-semibold text-neutral-900">{form.picker}</span></div>}
                  {form.status && type === 'bulk-status-update' && <div className="flex justify-between text-xs"><span className="text-neutral-500">New Status</span><span className="font-semibold text-neutral-900">{form.status}</span></div>}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Executing Step */}
          {step === 'executing' && (
            <div className="flex flex-col items-center justify-center h-48 gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center">
                <config.icon className="w-6 h-6 text-blue-600 animate-pulse" />
              </div>
              <div className="w-full space-y-2">
                <div className="flex justify-between text-xs text-neutral-600">
                  <span>Processing {doneCount} of {selectedItems.length}…</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
              <p className="text-xs text-neutral-400">Please wait, do not close this panel</p>
            </div>
          )}

          {/* Done Step */}
          {step === 'done' && (
            <div className="flex flex-col items-center justify-center gap-4 py-8">
              <div className="w-14 h-14 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center">
                <CheckCircle className="w-7 h-7 text-emerald-600" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-neutral-900">Operation Complete!</p>
                <p className="text-xs text-neutral-500 mt-1">{config.title} executed for {selectedItems.length} item(s) successfully.</p>
              </div>
              <div className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-xl space-y-1.5">
                <div className="flex justify-between text-xs"><span className="text-neutral-500">Processed</span><span className="font-semibold text-emerald-600">{selectedItems.length}</span></div>
                <div className="flex justify-between text-xs"><span className="text-neutral-500">Failed</span><span className="font-semibold text-neutral-700">0</span></div>
                <div className="flex justify-between text-xs"><span className="text-neutral-500">Skipped</span><span className="font-semibold text-neutral-700">0</span></div>
              </div>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs"><Download className="w-3.5 h-3.5" />Download Operation Report</Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-200 flex justify-end gap-2 flex-shrink-0">
          {step === 'configure' && (
            <>
              <Button variant="outline" size="sm" onClick={onClose}><X className="w-3.5 h-3.5 mr-1" />Cancel</Button>
              <Button size="sm" className="bg-neutral-900 hover:bg-neutral-800 text-white" onClick={handleConfirm}>Review & Confirm →</Button>
            </>
          )}
          {step === 'confirm' && (
            <>
              <Button variant="outline" size="sm" onClick={() => setStep('configure')}>← Back</Button>
              <Button size="sm" className="bg-neutral-900 hover:bg-neutral-800 text-white" onClick={handleExecute}>
                <Zap className="w-3.5 h-3.5 mr-1" />Execute {config.title}
              </Button>
            </>
          )}
          {step === 'done' && (
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => { onComplete?.(); onClose(); }}>
              <CheckCircle className="w-3.5 h-3.5 mr-1" />Done
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}