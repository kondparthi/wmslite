import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Truck, LogIn, LogOut, ClipboardCheck, Filter, Clock, BarChart3 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useMasterDataList } from "@/hooks/useMasterDataApi";
import {
  useYardCheckIns, useGateSummary, useCheckInTrailer, useEnterYard, useInspectCheckIn, useCheckOutTrailer,
  useZoneSummary, useYardDoors, useAssignDoor, useReleaseDoor,
  useYardMoves, useCreateMove, useDispatchMove, useCompleteMove,
  useAgingReport, useCarrierPerformanceReport,
} from "@/hooks/useYardOpsApi";

interface CarrierOption { id: number; code: string; name: string; }

const AGING_COLORS: Record<string, string> = {
  '< 24h': '#10b981', '24-48h': '#3b82f6', '48-72h': '#f59e0b', '> 72h': '#ef4444',
};

const ZONE_LOCATIONS = ["Parking Zone A", "Parking Zone B", "Empty Pool", "Loaded Storage"];

export const GateManagement = () => {
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [trailerNum, setTrailerNum] = useState("");
  const [carrierId, setCarrierId] = useState<string>("");
  const [txnType, setTxnType] = useState("Inbound Load");
  const [seal, setSeal] = useState("");
  const [search, setSearch] = useState("");

  const { data: checkIns = [] } = useYardCheckIns();
  const { data: summary } = useGateSummary();
  const { data: carriers = [] } = useMasterDataList<CarrierOption>("/master-data/carriers");
  const checkInTrailer = useCheckInTrailer();
  const checkOutTrailer = useCheckOutTrailer();
  const inspectCheckIn = useInspectCheckIn();

  const carrierName = (id: number | null) => carriers.find((c) => c.id === id)?.name ?? "—";

  const filtered = useMemo(() => {
    if (!search.trim()) return checkIns;
    const q = search.toLowerCase();
    return checkIns.filter((c) =>
      c.trailer_number.toLowerCase().includes(q) || c.pass_id.toLowerCase().includes(q) || carrierName(c.carrier_id).toLowerCase().includes(q)
    );
  }, [checkIns, search, carriers]);

  const resetForm = () => { setTrailerNum(""); setCarrierId(""); setTxnType("Inbound Load"); setSeal(""); };

  const handleCheckIn = () => {
    if (!trailerNum.trim()) return;
    checkInTrailer.mutate(
      { trailer_number: trailerNum, carrier_id: carrierId ? Number(carrierId) : undefined, transaction_type: txnType, seal_number: seal || undefined },
      { onSuccess: () => { setIsCheckInOpen(false); resetForm(); } }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Gate Management</h2>
          <p className="text-sm text-muted-foreground">Arriving and departing trailer tracking.</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isCheckInOpen} onOpenChange={setIsCheckInOpen}>
            <DialogTrigger asChild>
              <Button className="bg-neutral-900 text-white hover:bg-neutral-800">
                <LogIn className="w-4 h-4 mr-2" /> Check-In Trailer
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Trailer Check-In</DialogTitle>
                <DialogDescription>Register a trailer arrival at the security gate.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="trailerNum">Trailer Number</Label>
                    <Input id="trailerNum" placeholder="TR-000" value={trailerNum} onChange={(e) => setTrailerNum(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="carrier">Carrier</Label>
                    <Select value={carrierId} onValueChange={setCarrierId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select carrier" />
                      </SelectTrigger>
                      <SelectContent>
                        {carriers.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Transaction Type</Label>
                    <Select value={txnType} onValueChange={setTxnType}>
                      <SelectTrigger>
                        <SelectValue placeholder="In/Out" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Inbound Load">Inbound Load</SelectItem>
                        <SelectItem value="Outbound Empty">Outbound Empty</SelectItem>
                        <SelectItem value="Drop Trailer">Drop Trailer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="seal">Seal Number</Label>
                    <Input id="seal" placeholder="S-99210" value={seal} onChange={(e) => setSeal(e.target.value)} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setIsCheckInOpen(false); resetForm(); }}>Cancel</Button>
                <Button onClick={handleCheckIn} disabled={checkInTrailer.isPending || !trailerNum.trim()}>
                  {checkInTrailer.isPending ? "Checking In..." : "Check-In & Print Pass"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Pending Entry", value: String(summary?.pending_entry ?? 0), sub: "At gate", icon: Clock, color: "text-blue-600" },
          { label: "Inside Yard", value: String(summary?.inside_yard ?? 0), sub: "Active units", icon: Truck, color: "text-green-600" },
          { label: "Avg Turnaround", value: `${summary?.avg_turnaround_minutes ?? 0}m`, sub: "Gate to Dock", icon: BarChart3, color: "text-amber-600" },
          { label: "Overdue Dwell", value: String(summary?.overdue_dwell ?? 0), sub: "> 72 hours", icon: Clock, color: "text-red-600" },
        ].map((s, i) => (
          <Card key={i}>
            <CardContent className="pt-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">{s.label}</p>
                  <h3 className="text-2xl font-bold mt-1">{s.value}</h3>
                  <p className="text-[10px] text-muted-foreground mt-1">{s.sub}</p>
                </div>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-sm border-neutral-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-bold">Live Gate Activity</CardTitle>
          <CardDescription>Real-time monitor of facility entry/exit</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by Trailer, Carrier or Pass ID..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Button variant="outline" size="icon"><Filter className="h-4 w-4" /></Button>
          </div>
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader className="bg-neutral-50">
                <TableRow>
                  <TableHead>Pass ID</TableHead>
                  <TableHead>Trailer</TableHead>
                  <TableHead>Carrier</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Dwell</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => (
                  <TableRow key={item.id} className="hover:bg-neutral-50/50 transition-colors">
                    <TableCell className="font-mono text-xs font-bold text-blue-600">{item.pass_id}</TableCell>
                    <TableCell className="font-medium">{item.trailer_number}</TableCell>
                    <TableCell>{carrierName(item.carrier_id)}</TableCell>
                    <TableCell>
                      <Badge variant={item.transaction_type === 'Inbound Load' ? 'default' : 'secondary'} className="text-[10px] font-bold">
                        {item.transaction_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100">
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{item.status === 'Departed' ? '—' : `${Math.floor(item.dwell_minutes / 60)}h ${item.dwell_minutes % 60}m`}</TableCell>
                    <TableCell className="text-right">
                      {item.status === 'At Gate' && (
                        <EnterYardButton checkinId={item.id} />
                      )}
                      {item.status === 'Checked In' && (
                        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => inspectCheckIn.mutate(item.id)}>
                          <ClipboardCheck className="w-4 h-4 mr-1 text-neutral-400" /> Inspect
                        </Button>
                      )}
                      {(item.status === 'Checked In' || item.status === 'Inspected') && (
                        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => checkOutTrailer.mutate(item.id)}>
                          <LogOut className="w-4 h-4 mr-1 text-neutral-400" /> Check-Out
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Small inline component so the "Enter Yard" action can pick a zone before submitting.
const EnterYardButton: React.FC<{ checkinId: number }> = ({ checkinId }) => {
  const [open, setOpen] = useState(false);
  const [zone, setZone] = useState(ZONE_LOCATIONS[0]);
  const enterYard = useEnterYard();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs"><LogIn className="w-4 h-4 mr-1 text-neutral-400" /> Enter Yard</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle>Assign Yard Zone</DialogTitle>
          <DialogDescription>Move this trailer from the gate into the yard.</DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <Select value={zone} onValueChange={setZone}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ZONE_LOCATIONS.map((z) => <SelectItem key={z} value={z}>{z}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => enterYard.mutate({ id: checkinId, zone }, { onSuccess: () => setOpen(false) })}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const TrailerTracking = () => {
  const { data: zones = [] } = useZoneSummary();
  const { data: checkIns = [] } = useYardCheckIns();
  const inYard = checkIns.filter((c) => c.status === 'Checked In' || c.status === 'Inspected');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Yard Inventory</h2>
          <p className="text-sm text-muted-foreground">Zone occupancy and current yard contents.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {zones.map((z) => (
          <Card key={z.zone} className="hover:border-blue-200 transition-colors">
            <CardHeader className="p-4 pb-0">
              <CardTitle className="text-xs font-bold uppercase text-muted-foreground">{z.zone}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <div className="text-2xl font-bold">{z.count}</div>
              <div className="w-full bg-slate-100 h-1 mt-2 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full" style={{ width: `${Math.min(z.utilization_pct, 100)}%` }}></div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">{z.utilization_pct}% Capacity utilized ({z.capacity} slots)</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Trailers Currently in Yard</CardTitle>
          <CardDescription>{inYard.length} trailer(s) parked or on a dock, by zone</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader className="bg-neutral-50">
                <TableRow>
                  <TableHead>Trailer</TableHead>
                  <TableHead>Pass ID</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Dwell</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inYard.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.trailer_number}</TableCell>
                    <TableCell className="font-mono text-xs text-blue-600">{c.pass_id}</TableCell>
                    <TableCell className="text-xs">{c.zone ?? '—'}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{c.status}</Badge></TableCell>
                    <TableCell className="text-xs">{Math.floor(c.dwell_minutes / 60)}h {c.dwell_minutes % 60}m</TableCell>
                  </TableRow>
                ))}
                {inYard.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-6">No trailers currently in the yard.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const DockManagement = () => {
  const { data: doors = [] } = useYardDoors();
  const { data: checkIns = [] } = useYardCheckIns();
  const releaseDoor = useReleaseDoor();
  const assignDoor = useAssignDoor();
  const [assigningDoor, setAssigningDoor] = useState<number | null>(null);
  const [selectedCheckin, setSelectedCheckin] = useState<string>("");
  const [taskType, setTaskType] = useState("Unloading");

  const availableCheckins = checkIns.filter((c) => c.status === 'Checked In' || c.status === 'Inspected');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Dock & Door Management</h2>
          <p className="text-sm text-muted-foreground">Active dock status and loading progress.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {doors.map((d) => (
          <Card key={d.id} className={`${d.status === 'Occupied' ? 'border-orange-200 bg-orange-50/10' : ''} hover:shadow-md transition-shadow`}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <div className="w-10 h-10 rounded-lg bg-neutral-900 text-white flex items-center justify-center font-bold text-lg">
                  {d.door_code}
                </div>
                <Badge variant={d.status === 'Empty' ? 'secondary' : d.status === 'Occupied' ? 'destructive' : 'default'} className="text-[10px]">
                  {d.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 mt-2">
                <div className="flex justify-between text-xs">
                   <span className="text-muted-foreground font-medium uppercase">Trailer</span>
                   <span className="font-bold">{d.trailer_number ?? '-'}</span>
                </div>
                <div className="flex justify-between text-xs">
                   <span className="text-muted-foreground font-medium uppercase">Task</span>
                   <span className="font-bold text-blue-600">{d.task_type ?? 'None'}</span>
                </div>
                {d.status === 'Occupied' ? (
                   <div className="space-y-1.5">
                     <div className="flex justify-between text-[10px] font-bold">
                       <span>Progress</span>
                       <span>{d.progress}%</span>
                     </div>
                     <div className="w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden">
                       <div className="bg-orange-500 h-full transition-all" style={{ width: `${d.progress}%` }}></div>
                     </div>
                     <Button variant="outline" size="sm" className="w-full text-[10px] h-7" onClick={() => releaseDoor.mutate(d.id)}>Release Door</Button>
                   </div>
                ) : (
                  <div className="pt-4">
                    <Dialog open={assigningDoor === d.id} onOpenChange={(o) => setAssigningDoor(o ? d.id : null)}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full text-[10px] h-7">Assign Trailer</Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[380px]">
                        <DialogHeader>
                          <DialogTitle>Assign Trailer to {d.door_code}</DialogTitle>
                          <DialogDescription>Pick a trailer currently in the yard and the task to perform.</DialogDescription>
                        </DialogHeader>
                        <div className="py-2 space-y-3">
                          <div className="space-y-2">
                            <Label>Trailer</Label>
                            <Select value={selectedCheckin} onValueChange={setSelectedCheckin}>
                              <SelectTrigger><SelectValue placeholder="Select trailer" /></SelectTrigger>
                              <SelectContent>
                                {availableCheckins.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.trailer_number} ({c.pass_id})</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Task</Label>
                            <Select value={taskType} onValueChange={setTaskType}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Unloading">Unloading</SelectItem>
                                <SelectItem value="Outbound Load">Outbound Load</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setAssigningDoor(null)}>Cancel</Button>
                          <Button
                            disabled={!selectedCheckin}
                            onClick={() => assignDoor.mutate(
                              { id: d.id, checkin_id: Number(selectedCheckin), task_type: taskType },
                              { onSuccess: () => { setAssigningDoor(null); setSelectedCheckin(""); } }
                            )}
                          >Assign</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export const ShunterTasks = () => {
  const { data: moves = [] } = useYardMoves();
  const { data: checkIns = [] } = useYardCheckIns();
  const createMove = useCreateMove();
  const dispatchMove = useDispatchMove();
  const completeMove = useCompleteMove();

  const [isOpen, setIsOpen] = useState(false);
  const [checkinId, setCheckinId] = useState("");
  const [fromLoc, setFromLoc] = useState("");
  const [toLoc, setToLoc] = useState("");
  const [priority, setPriority] = useState("Normal");

  const handleCreate = () => {
    if (!checkinId || !fromLoc.trim() || !toLoc.trim()) return;
    createMove.mutate(
      { checkin_id: Number(checkinId), from_location: fromLoc, to_location: toLoc, priority },
      { onSuccess: () => { setIsOpen(false); setCheckinId(""); setFromLoc(""); setToLoc(""); setPriority("Normal"); } }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Shunter Workflows</h2>
          <p className="text-sm text-muted-foreground">Internal yard moves and spotter dispatching.</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="bg-neutral-900 text-white"><Plus className="w-4 h-4 mr-2" /> New Move Request</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle>New Move Request</DialogTitle>
              <DialogDescription>Dispatch a shunter to move a trailer within the yard.</DialogDescription>
            </DialogHeader>
            <div className="py-2 space-y-3">
              <div className="space-y-2">
                <Label>Trailer</Label>
                <Select value={checkinId} onValueChange={setCheckinId}>
                  <SelectTrigger><SelectValue placeholder="Select trailer" /></SelectTrigger>
                  <SelectContent>
                    {checkIns.filter((c) => c.status !== 'Departed').map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.trailer_number} ({c.pass_id})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>From</Label>
                  <Input placeholder="Zone A-12" value={fromLoc} onChange={(e) => setFromLoc(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>To</Label>
                  <Input placeholder="Dock D-04" value={toLoc} onChange={(e) => setToLoc(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Urgent">Urgent</SelectItem>
                    <SelectItem value="Normal">Normal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={createMove.isPending}>Create Request</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Card className="shadow-sm border-neutral-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Active Move Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader className="bg-neutral-50">
              <TableRow>
                <TableHead>Priority</TableHead>
                <TableHead>Trailer</TableHead>
                <TableHead>From</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {moves.map((mv) => (
                <TableRow key={mv.id} className="hover:bg-neutral-50/50 transition-colors">
                  <TableCell>
                    <Badge className={mv.priority === 'Urgent' ? "bg-red-100 text-red-700 border-none text-[10px] font-bold" : "text-[10px] font-bold"} variant={mv.priority === 'Urgent' ? undefined : 'secondary'}>
                      {mv.priority.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-bold">{mv.trailer_number ?? '—'}</TableCell>
                  <TableCell className="text-xs font-medium">{mv.from_location}</TableCell>
                  <TableCell className="text-xs font-bold text-blue-600">{mv.to_location}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={mv.status === 'In Route' ? "bg-yellow-50 text-yellow-700 border-yellow-100 text-[10px]" : "text-[10px]"}>
                      {mv.status === 'Pending' ? 'PENDING' : mv.status === 'In Route' ? 'IN ROUTE' : 'COMPLETED'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {mv.status === 'Pending' && (
                      <Button size="sm" className="h-8" onClick={() => dispatchMove.mutate(mv.id)}>Dispatch</Button>
                    )}
                    {mv.status === 'In Route' && (
                      <Button size="sm" variant="outline" className="h-8" onClick={() => completeMove.mutate(mv.id)}>Complete</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {moves.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-6">No move requests yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export const YardReports = () => {
  const { data: aging = [] } = useAgingReport();
  const { data: carrierPerf = [] } = useCarrierPerformanceReport();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Yard Analytics</h2>
          <p className="text-sm text-muted-foreground">Trailer aging and carrier performance metrics.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-sm border-neutral-200">
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Trailer Aging (Dwell Time)</CardTitle>
          </CardHeader>
          <CardContent className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={aging}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="range" axisLine={false} tickLine={false} style={{ fontSize: '12px' }} />
                <YAxis axisLine={false} tickLine={false} style={{ fontSize: '12px' }} allowDecimals={false} />
                <Tooltip cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {aging.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={AGING_COLORS[entry.range] ?? '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-neutral-200">
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Carrier On-Time Performance (%)</CardTitle>
          </CardHeader>
          <CardContent className="h-[250px]">
            {carrierPerf.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={carrierPerf} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis dataKey="carrier_name" type="category" axisLine={false} tickLine={false} style={{ fontSize: '12px' }} />
                  <Tooltip />
                  <Bar dataKey="on_time_pct" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">No departed trailers yet to score.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
