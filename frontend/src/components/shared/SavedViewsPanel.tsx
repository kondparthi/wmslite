import { useState } from 'react';
import { Bookmark, Plus, X, Check, Pencil, Trash2, Star, Eye, Lock, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SavedView {
  id: string;
  name: string;
  module: string;
  filters: string;
  columns: string;
  sortBy: string;
  visibility: 'private' | 'team' | 'public';
  isDefault: boolean;
  createdBy: string;
  createdOn: string;
}

interface SavedViewsPanelProps {
  module: string;
  onClose: () => void;
  onApplyView: (view: SavedView) => void;
}

const defaultViews: SavedView[] = [
  { id: 'SV-001', name: 'My Active Tasks', module: 'Inbound', filters: 'Status=Open, Assigned=Me', columns: 'ID, SKU, Status, Due', sortBy: 'Due Date Asc', visibility: 'private', isDefault: true, createdBy: 'James Hartwell', createdOn: '01 Jul 2026' },
  { id: 'SV-002', name: 'Overdue Shipments', module: 'Outbound', filters: 'Status=Overdue', columns: 'ID, Customer, ETA, Carrier', sortBy: 'ETA Asc', visibility: 'team', isDefault: false, createdBy: 'James Hartwell', createdOn: '05 Jul 2026' },
  { id: 'SV-003', name: 'Low Stock Monitor', module: 'Inventory', filters: 'Qty < Min Level', columns: 'SKU, Location, Qty, Min, Max', sortBy: 'Qty Asc', visibility: 'team', isDefault: false, createdBy: 'Priya Nair', createdOn: '10 Jul 2026' },
  { id: 'SV-004', name: 'Today\'s Receipts', module: 'Inbound', filters: 'Date=Today', columns: 'ID, ASN, Supplier, Qty, Status', sortBy: 'Time Desc', visibility: 'public', isDefault: false, createdBy: 'Raj Kumar', createdOn: '12 Jul 2026' },
  { id: 'SV-005', name: 'Pending Approvals', module: 'All', filters: 'RequiresApproval=true', columns: 'ID, Type, Requestor, Date', sortBy: 'Date Asc', visibility: 'team', isDefault: false, createdBy: 'James Hartwell', createdOn: '13 Jul 2026' },
];

const visibilityConfig = {
  private: { icon: Lock, label: 'Private', color: 'bg-neutral-100 text-neutral-600' },
  team: { icon: Eye, label: 'Team', color: 'bg-blue-100 text-blue-700' },
  public: { icon: Globe, label: 'Public', color: 'bg-emerald-100 text-emerald-700' },
};

export default function SavedViewsPanel({ module, onClose, onApplyView }: SavedViewsPanelProps) {
  const [views, setViews] = useState<SavedView[]>(defaultViews);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newView, setNewView] = useState({ name: '', visibility: 'private' as 'private' | 'team' | 'public', isDefault: false });
  const [appliedId, setAppliedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const moduleViews = views.filter(v => v.module === module || v.module === 'All');
  const filtered = moduleViews.filter(v => v.name.toLowerCase().includes(search.toLowerCase()));

  const handleSaveNew = () => {
    if (!newView.name.trim()) return;
    const created: SavedView = {
      id: `SV-${Date.now()}`,
      name: newView.name,
      module,
      filters: 'Current active filters',
      columns: 'Current column selection',
      sortBy: 'Current sort order',
      visibility: newView.visibility,
      isDefault: newView.isDefault,
      createdBy: 'James Hartwell',
      createdOn: '14 Jul 2026',
    };
    setViews(prev => [created, ...prev]);
    setNewView({ name: '', visibility: 'private', isDefault: false });
    setShowCreate(false);
  };

  const handleSetDefault = (id: string) => {
    setViews(prev => prev.map(v => ({ ...v, isDefault: v.id === id })));
  };

  const handleDelete = (id: string) => {
    setViews(prev => prev.filter(v => v.id !== id));
  };

  const handleApply = (view: SavedView) => {
    setAppliedId(view.id);
    onApplyView(view);
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="w-[420px] bg-white h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#003A78,#005BAA)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
              <Bookmark className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Saved Views</p>
              <p className="text-blue-200 text-xs mt-0.5">{module} · {moduleViews.length} view(s)</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Search */}
          <div className="flex items-center gap-2 border border-neutral-200 rounded-lg px-3 py-2 bg-neutral-50">
            <Eye className="w-3.5 h-3.5 text-neutral-400" />
            <input className="bg-transparent text-xs text-neutral-700 placeholder-neutral-400 focus:outline-none w-full"
              placeholder="Search saved views..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {/* Create New */}
          {showCreate ? (
            <div className="border border-neutral-200 rounded-xl p-4 bg-neutral-50 space-y-3">
              <p className="text-xs font-semibold text-neutral-800">Save Current View</p>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">View Name</Label>
                <Input value={newView.name} onChange={e => setNewView({ ...newView, name: e.target.value })}
                  className="h-8 text-sm" placeholder="e.g. My Active Putaway Tasks" autoFocus />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Visibility</Label>
                <Select value={newView.visibility} onValueChange={(v: any) => setNewView({ ...newView, visibility: v })}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private (Only Me)</SelectItem>
                    <SelectItem value="team">Team (My Warehouse)</SelectItem>
                    <SelectItem value="public">Public (All Users)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="setDefault" checked={newView.isDefault}
                  onChange={e => setNewView({ ...newView, isDefault: e.target.checked })} />
                <label htmlFor="setDefault" className="text-xs text-neutral-700">Set as default view</label>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button size="sm" className="flex-1 text-xs bg-neutral-900 hover:bg-neutral-800 text-white" onClick={handleSaveNew}>Save View</Button>
              </div>
            </div>
          ) : (
            <Button size="sm" variant="outline" className="w-full gap-2 text-xs" onClick={() => setShowCreate(true)}>
              <Plus className="w-3.5 h-3.5" />Save Current View
            </Button>
          )}

          {/* Views list */}
          <div className="space-y-2">
            {filtered.length === 0 ? (
              <div className="text-center py-8 text-neutral-400">
                <Bookmark className="w-8 h-8 mx-auto mb-2 text-neutral-200" />
                <p className="text-xs">No saved views for this module</p>
              </div>
            ) : filtered.map(view => {
              const visConfig = visibilityConfig[view.visibility];
              const VisIcon = visConfig.icon;
              const isApplied = appliedId === view.id;
              return (
                <div key={view.id}
                  className={`border rounded-xl p-3.5 transition-all ${isApplied ? 'border-[#009FE3] bg-sky-50' : 'border-neutral-200 bg-white hover:border-neutral-300'}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-semibold text-neutral-900 truncate">{view.name}</p>
                        {view.isDefault && <Star className="w-3 h-3 text-amber-500 fill-amber-500 flex-shrink-0" />}
                        {isApplied && <Badge className="text-[10px] bg-sky-100 text-sky-700 border-sky-200">Active</Badge>}
                      </div>
                      <p className="text-[10px] text-neutral-500 mt-0.5">By {view.createdBy} · {view.createdOn}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Badge className={`text-[10px] ${visConfig.color}`}>
                        <VisIcon className="w-2.5 h-2.5 mr-0.5 inline" />{visConfig.label}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-1 mb-3">
                    <div className="text-[10px] text-neutral-500"><span className="font-medium text-neutral-700">Filters: </span>{view.filters}</div>
                    <div className="text-[10px] text-neutral-500"><span className="font-medium text-neutral-700">Columns: </span>{view.columns}</div>
                    <div className="text-[10px] text-neutral-500"><span className="font-medium text-neutral-700">Sort: </span>{view.sortBy}</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button size="sm" className={`flex-1 text-xs h-7 gap-1 ${isApplied ? 'bg-[#009FE3] hover:bg-[#0090d0] text-white' : 'bg-neutral-900 hover:bg-neutral-800 text-white'}`}
                      onClick={() => handleApply(view)}>
                      <Check className="w-3 h-3" />{isApplied ? 'Applied' : 'Apply View'}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleSetDefault(view.id)} title="Set as default">
                      <Star className={`w-3.5 h-3.5 ${view.isDefault ? 'text-amber-500 fill-amber-500' : 'text-neutral-400'}`} />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDelete(view.id)} title="Delete">
                      <Trash2 className="w-3.5 h-3.5 text-neutral-400 hover:text-red-500" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="px-5 py-3 border-t border-neutral-100 bg-neutral-50 flex-shrink-0">
          <p className="text-[10px] text-neutral-400 text-center">Views save current filters, column selections, sorting & grouping preferences</p>
        </div>
      </div>
    </div>
  );
}