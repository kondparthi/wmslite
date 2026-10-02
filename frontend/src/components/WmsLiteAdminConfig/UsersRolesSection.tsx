import { useState } from 'react';
import {
  Users, Plus, Pencil, Trash2, X, Check, Search, Eye,
  ShieldCheck, Clock, Upload, LogIn, Key, AlertCircle, CheckCircle,
  ChevronLeft, ChevronRight, FileDown, Lock, Unlock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  useAdminUsers, useCreateAdminUser, useUpdateAdminUser, useToggleUserLock, useDeleteAdminUser,
  useRoles, useCreateRole, useUpdateRole, useDeleteRole,
  useShifts, useCreateShift, useUpdateShift, useDeleteShift,
  useLoginHistory, useWarehouses,
} from '@/hooks/useAdminConfigApi';

const BRAND = "#009FE3";
type SubView = 'users' | 'roles' | 'shifts' | 'loginhistory';

const allModules = ['Dashboard', 'Master Data', 'Inbound', 'Inventory', 'Outbound', 'Labor Management', '3PL Billing', 'Yard Management', 'Dynamic Slotting', 'Cross Docking', 'Returns/RMA', 'Replenishment', 'Shipping Execution', 'Admin Config', 'Reports'];

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function UsersRolesSection() {
  const [activeView, setActiveView] = useState<SubView>('users');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<number | string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [saved, setSaved] = useState(false);
  const [filterStatus, setFilterStatus] = useState('All');

  const { data: users = [] } = useAdminUsers();
  const { data: roles = [] } = useRoles();
  const { data: shifts = [] } = useShifts();
  const { data: loginHistory = [] } = useLoginHistory();
  const { data: warehouses = [] } = useWarehouses();

  const createUser = useCreateAdminUser();
  const updateUser = useUpdateAdminUser();
  const toggleLock = useToggleUserLock();
  const deleteUser = useDeleteAdminUser();

  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const deleteRole = useDeleteRole();

  const createShift = useCreateShift();
  const updateShift = useUpdateShift();
  const deleteShift = useDeleteShift();

  const [userForm, setUserForm] = useState({ full_name: '', email: '', role: 'Inbound Operator', warehouse_id: undefined as number | undefined, shift_id: undefined as number | undefined, mfa_enabled: false, status: 'Active' });
  const [roleForm, setRoleForm] = useState({ name: '', code: '', description: '', level: 'Operator', modules: [] as string[] });
  const [shiftForm, setShiftForm] = useState({ name: '', code: '', start_time: '08:00', end_time: '16:00', break_minutes: 30, status: 'Active' });

  const notify = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };
  const closeForm = () => { setShowForm(false); setEditTarget(null); };

  const views: { id: SubView; label: string; icon: any }[] = [
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'roles', label: 'Roles & Permissions', icon: ShieldCheck },
    { id: 'shifts', label: 'Shift Schedule', icon: Clock },
    { id: 'loginhistory', label: 'Login History', icon: LogIn },
  ];

  const loginStatusColor: Record<string, string> = {
    'Success': 'bg-emerald-50 text-emerald-700',
    'Failed': 'bg-red-50 text-red-700',
    'Locked': 'bg-amber-50 text-amber-700',
    'Blocked': 'bg-red-100 text-red-800',
  };

  const filteredUsers = users.filter(u => (filterStatus === 'All' || u.status === filterStatus) &&
    (u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">Users, Roles & Security</h2>
          <p className="text-sm text-neutral-500 mt-0.5">Manage user accounts, role-based access control, shift schedules and login audits</p>
        </div>
        {saved && <div className="flex items-center gap-1.5 text-emerald-600 text-sm"><CheckCircle className="w-4 h-4" />Saved</div>}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Active Users', value: users.filter(u => u.status === 'Active').length, color: BRAND },
          { label: 'Roles Configured', value: roles.length, color: '#10B981' },
          { label: 'Shifts Active', value: shifts.filter(s => s.status === 'Active').length, color: '#F59E0B' },
          { label: 'Locked Accounts', value: users.filter(u => u.locked).length, color: '#EF4444' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-neutral-200 px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}18` }}>
              <span className="text-sm font-bold" style={{ color }}>{value}</span>
            </div>
            <p className="text-xs text-neutral-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Sub-view tabs */}
      <div className="flex gap-1 flex-wrap">
        {views.map(v => {
          const Icon = v.icon;
          return (
            <button key={v.id} onClick={() => { setActiveView(v.id); setShowForm(false); setSelected(null); setSearch(''); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${activeView === v.id ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'}`}>
              <Icon size={13} />{v.label}
            </button>
          );
        })}
      </div>

      {/* ── USERS ── */}
      {activeView === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white rounded-xl border border-neutral-200">
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-2"><Users size={14} style={{ color: BRAND }} /> User Accounts</h3>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 border border-neutral-200 rounded-lg px-3 py-1.5 bg-neutral-50">
                  <Search size={12} className="text-neutral-400" />
                  <input className="bg-transparent text-xs focus:outline-none w-28" placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-8 text-xs w-28"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="All" className="text-xs">All Status</SelectItem><SelectItem value="Active" className="text-xs">Active</SelectItem><SelectItem value="Inactive" className="text-xs">Inactive</SelectItem></SelectContent>
                </Select>
                <Button size="sm" className="bg-neutral-900 hover:bg-neutral-800 text-white gap-1.5 text-xs h-8" onClick={() => { setEditTarget(null); setUserForm({ full_name: '', email: '', role: 'Inbound Operator', warehouse_id: warehouses[0]?.id, shift_id: shifts[0]?.id, mfa_enabled: false, status: 'Active' }); setShowForm(true); }}><Plus size={12} /> Add User</Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-100">
                    {['Name', 'Email', 'Role', 'Warehouse', 'Shift', 'MFA', 'Last Login', 'Status', 'Actions'].map(h => (
                      <th key={h} className="text-left py-2.5 px-3 text-neutral-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {filteredUsers.map(u => (
                    <tr key={u.id} className={`hover:bg-blue-50/20 cursor-pointer transition-colors ${selected === u.id ? 'bg-blue-50/40' : ''}`}
                      style={selected === u.id ? { borderLeft: `3px solid ${BRAND}` } : {}} onClick={() => setSelected(u.id)}>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0" style={{ background: BRAND }}>
                            {u.full_name?.charAt(0) || '?'}
                          </div>
                          <span className="font-medium text-neutral-900">{u.full_name}</span>
                          {u.locked && <Lock size={10} className="text-red-500" />}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-neutral-600">{u.email}</td>
                      <td className="py-2.5 px-3"><Badge variant="outline" className="text-xs">{u.role}</Badge></td>
                      <td className="py-2.5 px-3 text-neutral-600">{u.warehouse_code || '—'}</td>
                      <td className="py-2.5 px-3 text-neutral-600">{u.shift_name || '—'}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${u.mfa_enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-400'}`}>{u.mfa_enabled ? 'On' : 'Off'}</span>
                      </td>
                      <td className="py-2.5 px-3 text-neutral-500">{fmtDate(u.last_login_at)}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-500'}`}>{u.status}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex gap-1.5">
                          <button onClick={e => { e.stopPropagation(); setEditTarget(u); setUserForm({ full_name: u.full_name || '', email: u.email, role: u.role, warehouse_id: u.warehouse_id ?? undefined, shift_id: u.shift_id ?? undefined, mfa_enabled: u.mfa_enabled, status: u.status }); setShowForm(true); }} className="text-neutral-400 hover:text-amber-500 transition-colors"><Pencil size={12} /></button>
                          <button onClick={e => { e.stopPropagation(); toggleLock.mutate({ id: u.id, locked: u.locked }); }} title={u.locked ? 'Unlock' : 'Lock'}
                            className={`transition-colors ${u.locked ? 'text-red-400 hover:text-emerald-600' : 'text-neutral-400 hover:text-red-500'}`}>{u.locked ? <Unlock size={12} /> : <Lock size={12} />}</button>
                          <button onClick={e => { e.stopPropagation(); deleteUser.mutate(u.id); }} className="text-neutral-400 hover:text-red-500 transition-colors"><Trash2 size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            {showForm ? (
              <Card className="border border-neutral-200 shadow-none">
                <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm font-semibold">{editTarget ? 'Edit User' : 'New User'}</CardTitle>
                  <button onClick={closeForm} className="text-neutral-400 hover:text-neutral-700"><X size={14} /></button>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1"><Label className="text-xs">Full Name *</Label><Input className="h-8 text-xs" value={userForm.full_name} onChange={e => setUserForm(f => ({ ...f, full_name: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Email *</Label><Input className="h-8 text-xs" type="email" value={userForm.email} onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Role</Label>
                    <Select value={userForm.role} onValueChange={v => setUserForm(f => ({ ...f, role: v }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{roles.map(r => <SelectItem key={r.code} value={r.name} className="text-xs">{r.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1"><Label className="text-xs">Warehouse</Label>
                      <Select value={String(userForm.warehouse_id ?? '')} onValueChange={v => setUserForm(f => ({ ...f, warehouse_id: v ? Number(v) : undefined }))}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{warehouses.map(w => <SelectItem key={w.id} value={String(w.id)} className="text-xs">{w.code}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1"><Label className="text-xs">Shift</Label>
                      <Select value={String(userForm.shift_id ?? '')} onValueChange={v => setUserForm(f => ({ ...f, shift_id: v ? Number(v) : undefined }))}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{shifts.map(s => <SelectItem key={s.id} value={String(s.id)} className="text-xs">{s.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-0.5">
                    <Label className="text-xs">Require MFA</Label>
                    <Switch checked={userForm.mfa_enabled} onCheckedChange={v => setUserForm(f => ({ ...f, mfa_enabled: v }))} />
                  </div>
                  <div className="space-y-1"><Label className="text-xs">Status</Label>
                    <Select value={userForm.status} onValueChange={v => setUserForm(f => ({ ...f, status: v }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="Active" className="text-xs">Active</SelectItem><SelectItem value="Inactive" className="text-xs">Inactive</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-white gap-1 text-xs" onClick={() => {
                      if (!userForm.full_name || !userForm.email) return;
                      if (editTarget) { updateUser.mutate({ id: editTarget.id, payload: userForm }); }
                      else { createUser.mutate(userForm); }
                      notify(); closeForm();
                    }}><Check size={11} /> {editTarget ? 'Save' : 'Create'}</Button>
                    <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={closeForm}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            ) : selected ? (
              (() => {
                const u = users.find(x => x.id === selected);
                return u ? (
                  <Card className="border border-neutral-200 shadow-none">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold" style={{ background: BRAND }}>{u.full_name?.charAt(0)}</div>
                        <div><CardTitle className="text-sm font-semibold">{u.full_name}</CardTitle><CardDescription className="text-xs">{u.email}</CardDescription></div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {[['Username', u.username], ['Role', u.role], ['Warehouse', u.warehouse_code || '—'], ['Shift', u.shift_name || '—'], ['MFA', u.mfa_enabled ? 'Enabled' : 'Disabled'], ['Last Login', fmtDate(u.last_login_at)], ['Status', u.status]].map(([k, v]) => (
                        <div key={k as string} className="flex justify-between text-xs">
                          <span className="text-neutral-500">{k as string}</span>
                          <span className="font-medium text-neutral-900">{v as string}</span>
                        </div>
                      ))}
                      {u.locked && (
                        <div className="p-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                          <Lock size={12} className="text-red-500" />
                          <p className="text-xs text-red-700">Account is locked. Click unlock to restore access.</p>
                        </div>
                      )}
                      <div className="flex gap-2 pt-2">
                        <Button size="sm" className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-white text-xs gap-1" onClick={() => { setEditTarget(u); setUserForm({ full_name: u.full_name || '', email: u.email, role: u.role, warehouse_id: u.warehouse_id ?? undefined, shift_id: u.shift_id ?? undefined, mfa_enabled: u.mfa_enabled, status: u.status }); setShowForm(true); }}><Pencil size={10} /> Edit</Button>
                        <Button size="sm" variant="outline" className="flex-1 text-xs gap-1" onClick={() => toggleLock.mutate({ id: u.id, locked: u.locked })}>
                          {u.locked ? <><Unlock size={10} /> Unlock</> : <><Lock size={10} /> Lock</>}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : null;
              })()
            ) : (
              <Card className="border border-neutral-200 shadow-none p-8 text-center">
                <Users size={28} className="mx-auto mb-2 text-neutral-300" />
                <p className="text-xs text-neutral-400">Select a user to view their profile</p>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ── ROLES & PERMISSIONS ── */}
      {activeView === 'roles' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-2"><ShieldCheck size={14} style={{ color: BRAND }} /> Role Definitions</h3>
              <Button size="sm" className="bg-neutral-900 hover:bg-neutral-800 text-white gap-1.5 text-xs" onClick={() => { setEditTarget(null); setRoleForm({ name: '', code: '', description: '', level: 'Operator', modules: [] }); setShowForm(true); }}><Plus size={12} /> Add Role</Button>
            </div>
            {roles.map(role => (
              <Card key={role.id} className={`border shadow-none ${selected === role.id ? 'border-[#009FE3] bg-blue-50/10' : 'border-neutral-200'}`} onClick={() => setSelected(role.id)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#009FE318' }}>
                        <ShieldCheck size={14} style={{ color: BRAND }} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-neutral-900">{role.name}</p>
                        <code className="text-xs text-neutral-400 font-mono">{role.code}</code>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{role.level}</Badge>
                      <span className="text-xs text-neutral-500">{role.user_count} users</span>
                    </div>
                  </div>
                  <p className="text-xs text-neutral-500 mb-2">{role.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {role.modules.map(m => <span key={m} className="px-2 py-0.5 rounded text-xs bg-neutral-100 text-neutral-600">{m}</span>)}
                  </div>
                  <div className="flex gap-2 mt-3 pt-3 border-t border-neutral-100">
                    <Button size="sm" variant="outline" className="flex-1 text-xs h-7 gap-1" onClick={e => { e.stopPropagation(); setEditTarget(role); setRoleForm({ name: role.name, code: role.code, description: role.description || '', level: role.level, modules: role.modules }); setShowForm(true); }}><Pencil size={10} /> Edit</Button>
                    <Button size="sm" variant="outline" className="text-xs h-7 text-red-600 border-red-200 hover:bg-red-50" onClick={e => { e.stopPropagation(); deleteRole.mutate(role.id); }}><Trash2 size={10} /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div>
            {showForm ? (
              <Card className="border border-neutral-200 shadow-none sticky top-4">
                <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm font-semibold">{editTarget ? 'Edit Role' : 'New Role'}</CardTitle>
                  <button onClick={closeForm} className="text-neutral-400 hover:text-neutral-700"><X size={14} /></button>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1"><Label className="text-xs">Role Name *</Label><Input className="h-8 text-xs" value={roleForm.name} onChange={e => setRoleForm(f => ({ ...f, name: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Role Code *</Label><Input className="h-8 text-xs font-mono" placeholder="e.g. OPS_MGR" value={roleForm.code} onChange={e => setRoleForm(f => ({ ...f, code: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Description</Label><Input className="h-8 text-xs" value={roleForm.description} onChange={e => setRoleForm(f => ({ ...f, description: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Level</Label>
                    <Select value={roleForm.level} onValueChange={v => setRoleForm(f => ({ ...f, level: v }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{['Super', 'Admin', 'Manager', 'Supervisor', 'Analyst', 'Operator', 'Viewer'].map(l => <SelectItem key={l} value={l} className="text-xs">{l}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Module Access</Label>
                    <div className="max-h-48 overflow-y-auto space-y-1.5 border border-neutral-200 rounded-lg p-3">
                      {allModules.map(mod => (
                        <div key={mod} className="flex items-center gap-2">
                          <Checkbox id={`mod-${mod}`} checked={roleForm.modules.includes(mod)}
                            onCheckedChange={checked => setRoleForm(f => ({ ...f, modules: checked ? [...f.modules, mod] : f.modules.filter(m => m !== mod) }))} />
                          <label htmlFor={`mod-${mod}`} className="text-xs text-neutral-700 cursor-pointer">{mod}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-white gap-1 text-xs" onClick={() => {
                      if (!roleForm.name || !roleForm.code) return;
                      if (editTarget) { updateRole.mutate({ id: editTarget.id, payload: roleForm }); }
                      else { createRole.mutate(roleForm); }
                      notify(); closeForm();
                    }}><Check size={11} /> {editTarget ? 'Save' : 'Create'}</Button>
                    <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={closeForm}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border border-neutral-200 shadow-none p-8 text-center">
                <ShieldCheck size={28} className="mx-auto mb-2 text-neutral-300" />
                <p className="text-xs text-neutral-400">Select a role to view details or click Add Role</p>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ── SHIFTS ── */}
      {activeView === 'shifts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs text-neutral-500">Define shift timings, assign staff and manage shift schedules across all warehouses.</p>
            <Button size="sm" className="bg-neutral-900 hover:bg-neutral-800 text-white gap-1.5 text-xs" onClick={() => { setShowForm(true); setEditTarget(null); setShiftForm({ name: '', code: '', start_time: '08:00', end_time: '16:00', break_minutes: 30, status: 'Active' }); }}><Plus size={12} /> Add Shift</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {shifts.map(shift => (
              <Card key={shift.id} className={`border shadow-none ${shift.status === 'Inactive' ? 'opacity-60' : ''} ${selected === shift.id ? 'border-[#009FE3]' : 'border-neutral-200'}`}
                onClick={() => setSelected(shift.id)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold text-neutral-900">{shift.name}</p>
                      <code className="text-xs text-neutral-400 font-mono">{shift.code}</code>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${shift.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-500'}`}>{shift.status}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div><p className="text-neutral-400">Start</p><p className="font-semibold text-neutral-900 text-base">{shift.start_time}</p></div>
                    <div><p className="text-neutral-400">End</p><p className="font-semibold text-neutral-900 text-base">{shift.end_time}</p></div>
                    <div><p className="text-neutral-400">Break</p><p className="font-medium text-neutral-700">{shift.break_minutes} min</p></div>
                    <div><p className="text-neutral-400">Staff Assigned</p><p className="font-medium text-neutral-700">{shift.staff_count}</p></div>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                      <span key={d} className={`px-1.5 py-0.5 rounded text-xs font-medium ${shift.days_active.includes(d) ? 'text-white' : 'bg-neutral-100 text-neutral-400'}`}
                        style={shift.days_active.includes(d) ? { background: BRAND } : {}}>{d}</span>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-3 border-t border-neutral-100">
                    <Button size="sm" variant="outline" className="flex-1 text-xs h-7 gap-1" onClick={e => { e.stopPropagation(); setEditTarget(shift); setShiftForm({ name: shift.name, code: shift.code, start_time: shift.start_time, end_time: shift.end_time, break_minutes: shift.break_minutes, status: shift.status }); setShowForm(true); }}><Pencil size={10} /> Edit</Button>
                    <Button size="sm" variant="outline" className="flex-1 text-xs h-7" onClick={e => { e.stopPropagation(); updateShift.mutate({ id: shift.id, payload: { status: shift.status === 'Active' ? 'Inactive' : 'Active' } }); }}>
                      {shift.status === 'Active' ? 'Disable' : 'Enable'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {showForm && (
              <Card className="border border-neutral-300 shadow-none">
                <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm font-semibold">{editTarget ? 'Edit Shift' : 'New Shift'}</CardTitle>
                  <button onClick={closeForm} className="text-neutral-400 hover:text-neutral-700"><X size={14} /></button>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1"><Label className="text-xs">Shift Name *</Label><Input className="h-8 text-xs" value={shiftForm.name} onChange={e => setShiftForm(f => ({ ...f, name: e.target.value }))} /></div>
                    <div className="space-y-1"><Label className="text-xs">Code</Label><Input className="h-8 text-xs font-mono" value={shiftForm.code} onChange={e => setShiftForm(f => ({ ...f, code: e.target.value }))} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1"><Label className="text-xs">Start Time</Label><Input className="h-8 text-xs" type="time" value={shiftForm.start_time} onChange={e => setShiftForm(f => ({ ...f, start_time: e.target.value }))} /></div>
                    <div className="space-y-1"><Label className="text-xs">End Time</Label><Input className="h-8 text-xs" type="time" value={shiftForm.end_time} onChange={e => setShiftForm(f => ({ ...f, end_time: e.target.value }))} /></div>
                  </div>
                  <div className="space-y-1"><Label className="text-xs">Break Duration (min)</Label>
                    <Select value={String(shiftForm.break_minutes)} onValueChange={v => setShiftForm(f => ({ ...f, break_minutes: Number(v) }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{[15, 30, 45, 60, 0].map(b => <SelectItem key={b} value={String(b)} className="text-xs">{b === 0 ? 'None' : `${b} min`}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-white gap-1 text-xs" onClick={() => {
                      if (!shiftForm.name || !shiftForm.code) return;
                      if (editTarget) { updateShift.mutate({ id: editTarget.id, payload: shiftForm }); }
                      else { createShift.mutate({ ...shiftForm, days_active: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] }); }
                      notify(); closeForm();
                    }}><Check size={11} /> {editTarget ? 'Save' : 'Create'}</Button>
                    <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={closeForm}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ── LOGIN HISTORY ── */}
      {activeView === 'loginhistory' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 border border-neutral-200 rounded-lg px-3 py-1.5 bg-white">
                <Search size={12} className="text-neutral-400" />
                <input className="bg-transparent text-xs focus:outline-none w-32" placeholder="Search user..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8"><FileDown size={12} /> Export Log</Button>
          </div>
          {loginHistory.some(l => l.status === 'Failed' || l.status === 'Blocked') && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-700"><strong>{loginHistory.filter(l => l.status === 'Failed' || l.status === 'Blocked').length} suspicious login attempt(s)</strong> detected. Review blocked entries.</p>
            </div>
          )}
          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-100">
                  {['User', 'Role', 'IP Address', 'Device / Browser', 'Timestamp', 'MFA', 'Status'].map(h => (
                    <th key={h} className="text-left py-2.5 px-3 text-neutral-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {loginHistory.filter(l => l.username_attempted.toLowerCase().includes(search.toLowerCase())).map(l => (
                  <tr key={l.id} className="hover:bg-blue-50/10 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-neutral-900">{l.username_attempted}</td>
                    <td className="py-2.5 px-3 text-neutral-500">{l.role || '—'}</td>
                    <td className="py-2.5 px-3"><code className="font-mono text-neutral-700 bg-neutral-100 px-1.5 rounded">{l.ip_address || '—'}</code></td>
                    <td className="py-2.5 px-3 text-neutral-600">{l.device || '—'}</td>
                    <td className="py-2.5 px-3 text-neutral-500">{fmtDate(l.created_at)}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${l.mfa_verified ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-400'}`}>{l.mfa_verified ? 'Verified' : '—'}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${loginStatusColor[l.status] || 'bg-neutral-100 text-neutral-600'}`}>{l.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-5 py-3 border-t border-neutral-100 flex items-center justify-between">
              <span className="text-xs text-neutral-400">Showing recent {loginHistory.length} entries · Full log retained for 90 days</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
