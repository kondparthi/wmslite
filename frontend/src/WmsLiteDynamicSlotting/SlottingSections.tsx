import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, Play, ArrowUpRight, TrendingUp, TrendingDown, Activity, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import {
  useSlottingStrategies, useCreateSlottingStrategy,
  useSimulations, useRunSimulation, useApplySimulation,
  useVelocitySummary, useVelocityMaterials,
  useZoneUtilization, useHoneycombing,
  useReslottingTasks, useAssignReslottingTask, useReleaseBatch, useCompleteReslottingTask,
  useOptimizationImpact,
} from '@/hooks/useSlottingOpsApi';

const CLASS_COLORS: Record<string, string> = { A: '#ef4444', B: '#f59e0b', C: '#3b82f6', 'Dead Stock': '#94a3b8' };

interface SlottingSectionsProps {
  activeTab: string;
}

const SlottingSections: React.FC<SlottingSectionsProps> = ({ activeTab }) => {
  const [isNewStrategyOpen, setIsNewStrategyOpen] = useState(false);
  const [stratName, setStratName] = useState("");
  const [baseLogic, setBaseLogic] = useState("Velocity-Based");
  const [lookback, setLookback] = useState("90");
  const [targetZones, setTargetZones] = useState("");

  const { data: strategies = [] } = useSlottingStrategies();
  const { data: simulations = [] } = useSimulations();
  const createStrategy = useCreateSlottingStrategy();
  const runSimulation = useRunSimulation();
  const applySimulation = useApplySimulation();

  const renderStrategies = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold tracking-tight">Slotting Strategies</h3>
          <p className="text-sm text-muted-foreground">Define business rules for automated inventory placement.</p>
        </div>
        <Dialog open={isNewStrategyOpen} onOpenChange={setIsNewStrategyOpen}>
          <DialogTrigger asChild>
            <Button className="bg-neutral-900 text-white hover:bg-neutral-800">
              <Plus className="h-4 w-4 mr-2" /> New Strategy
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create Slotting Strategy</DialogTitle>
              <DialogDescription>Define the parameters for a new warehouse optimization logic.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="stratName">Strategy Name</Label>
                <Input id="stratName" placeholder="e.g., Seasonal Peak Optimization" value={stratName} onChange={(e) => setStratName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="baseLogic">Base Logic</Label>
                <Select value={baseLogic} onValueChange={setBaseLogic}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select logic type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Velocity-Based">Velocity-Based (Frequency)</SelectItem>
                    <SelectItem value="Volume-Based">Volume-Based (Cubic Movement)</SelectItem>
                    <SelectItem value="Product Affinity">Product Affinity (Co-picking)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lookback">Lookback Period</Label>
                  <Select value={lookback} onValueChange={setLookback}>
                    <SelectTrigger><SelectValue placeholder="Select range" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">Last 30 Days</SelectItem>
                      <SelectItem value="90">Last 90 Days</SelectItem>
                      <SelectItem value="180">Current Season</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="targetZone">Target Zones</Label>
                  <Input id="targetZone" placeholder="ZONE-A, ZONE-B" value={targetZones} onChange={(e) => setTargetZones(e.target.value)} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsNewStrategyOpen(false)}>Cancel</Button>
              <Button
                disabled={!stratName.trim() || createStrategy.isPending}
                onClick={() => createStrategy.mutate(
                  { name: stratName, base_logic: baseLogic, lookback_days: Number(lookback), target_zones: targetZones || null, status: "Active" },
                  { onSuccess: () => { setIsNewStrategyOpen(false); setStratName(""); setTargetZones(""); } }
                )}
              >Create Strategy</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {strategies.map((strat) => (
          <Card key={strat.id} className={`${strat.status === 'Active' ? "border-primary/50 bg-primary/5" : ""} relative overflow-hidden`}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-base font-bold">{strat.name}</CardTitle>
                <Badge variant={strat.status === 'Active' ? "default" : "outline"} className="text-[10px]">
                  {strat.status.toUpperCase()}
                </Badge>
              </div>
              <CardDescription className="text-xs">{strat.base_logic} · lookback {strat.lookback_days}d{strat.target_zones ? ` · ${strat.target_zones}` : ''}</CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline" size="sm" className="h-7 text-xs" disabled={strat.status !== 'Active' || runSimulation.isPending}
                  onClick={() => runSimulation.mutate(strat.id)}
                >Simulate</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-sm border-neutral-200">
        <CardHeader className="pb-3 border-b bg-neutral-50/50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-md font-bold">Recent Strategy Simulations</CardTitle>
              <CardDescription className="text-xs">History of slotting optimization runs.</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search simulation runs..." className="pl-8" disabled />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-neutral-50/50">
              <TableRow>
                <TableHead className="w-[120px]">Simulation ID</TableHead>
                <TableHead>Strategy</TableHead>
                <TableHead>Misplaced SKUs</TableHead>
                <TableHead>Efficiency Gain</TableHead>
                <TableHead>Labor Saving</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {simulations.map((sim) => (
                <TableRow key={sim.id} className="hover:bg-neutral-50/30 transition-colors">
                  <TableCell className="font-mono text-xs font-bold text-blue-600">{sim.sim_number}</TableCell>
                  <TableCell className="font-medium">{sim.strategy_name}</TableCell>
                  <TableCell className="text-xs font-medium">{sim.misplaced_count}</TableCell>
                  <TableCell className="text-green-600 font-bold text-xs">+{sim.efficiency_gain_pct}%</TableCell>
                  <TableCell className="text-xs font-medium">{sim.labor_saving_hours}h/day</TableCell>
                  <TableCell>
                    <Badge variant={sim.status === "Applied" ? "default" : "secondary"} className="text-[10px]">
                      {sim.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {sim.status !== 'Applied' && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => applySimulation.mutate(sim.id)} title="Apply — generate re-slotting tasks">
                        <Play className="h-4 w-4 text-green-600" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {simulations.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-6">No simulations yet — run a strategy above.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  const VelocityTab = () => {
    const { data: buckets = [] } = useVelocitySummary();
    const chartData = buckets.map((b) => ({ name: b.classification === 'Dead Stock' ? 'Dead Stock' : `${b.classification}-Items`, count: b.count, fill: CLASS_COLORS[b.classification] }));
    const totalPicks = buckets.reduce((sum, b) => sum + b.pick_count, 0);

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {buckets.map((b) => (
            <Card key={b.classification} className="border-none shadow-sm">
              <CardContent className="pt-6 rounded-xl" style={{ backgroundColor: `${CLASS_COLORS[b.classification]}12` }}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{b.classification === 'Dead Stock' ? 'Dead Stock' : `${b.classification}-Items`}</span>
                  {b.pick_count > 0 ? <TrendingUp className="h-4 w-4 text-green-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />}
                </div>
                <div className="text-3xl font-bold" style={{ color: CLASS_COLORS[b.classification] }}>{b.count}</div>
                <p className="text-[10px] text-gray-400 mt-2 font-medium">{b.pick_count} PICKS RECORDED</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-md font-bold">Velocity Distribution</CardTitle>
                <CardDescription className="text-xs">SKU count breakdown by velocity classification.</CardDescription>
              </div>
              <Button variant="outline" size="sm" disabled><Activity className="h-3 w-3 mr-2" /> Recalculate ABC</Button>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} style={{ fontSize: '12px' }} />
                  <YAxis axisLine={false} tickLine={false} style={{ fontSize: '12px' }} allowDecimals={false} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Share of Picking</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={buckets.filter((b) => b.pick_count > 0)} dataKey="pick_count" nameKey="classification" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                      {buckets.filter((b) => b.pick_count > 0).map((b, i) => <Cell key={i} fill={CLASS_COLORS[b.classification]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full space-y-3 mt-4">
                {buckets.map((b) => (
                  <div key={b.classification} className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CLASS_COLORS[b.classification] }} />
                      <span className="font-medium text-gray-600">{b.classification} ({totalPicks ? Math.round(b.pick_count / totalPicks * 100) : 0}% Picks)</span>
                    </div>
                    <span className="font-bold">{b.count} SKUs</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const UtilizationTab = () => {
    const { data: zones = [] } = useZoneUtilization();
    const { data: honeycomb } = useHoneycombing();
    const zoneColors = ['bg-red-500', 'bg-blue-500', 'bg-cyan-500', 'bg-orange-500'];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="shadow-sm border-neutral-200">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Cubic Utilization by Zone</CardTitle>
              <CardDescription className="text-xs">Real on-hand units vs. zone capacity.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {zones.map((z, i) => (
                <div key={z.zone} className="space-y-2">
                  <div className="flex justify-between text-xs font-bold uppercase">
                    <span>{z.zone}</span>
                    <span>{z.utilization_pct}% FULL</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 shadow-inner overflow-hidden">
                    <div className={`${zoneColors[i % zoneColors.length]} h-2 rounded-full transition-all duration-1000`} style={{ width: `${z.utilization_pct}%` }}></div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{z.on_hand_units} / {z.capacity_units} units</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="shadow-sm border-neutral-200 flex flex-col">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Honeycombing Analysis</CardTitle>
              <CardDescription className="text-xs">Detection of inefficiently used storage slots.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col items-center justify-center py-6">
              <div className="text-center relative">
                <div className="w-40 h-40 rounded-full border-8 border-orange-100 flex items-center justify-center mb-4">
                  <div className="text-center">
                    <p className="text-4xl font-extrabold text-orange-600">{honeycomb?.honeycombing_pct ?? 0}%</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Honeycombing</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div className="bg-orange-50 p-2 rounded-lg border border-orange-100 text-center">
                    <p className="text-xs font-bold text-orange-700">{honeycomb?.partial_pallets ?? 0}</p>
                    <p className="text-[9px] text-orange-600">Partial Pallets</p>
                  </div>
                  <div className="bg-blue-50 p-2 rounded-lg border border-blue-100 text-center">
                    <p className="text-xs font-bold text-blue-700">{honeycomb?.consolidatable ?? 0}</p>
                    <p className="text-[9px] text-blue-600">Consolidatable</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const ReslottingTab = () => {
    const { data: tasks = [] } = useReslottingTasks();
    const assignTask = useAssignReslottingTask();
    const completeTask = useCompleteReslottingTask();
    const releaseBatch = useReleaseBatch();
    const readyCount = tasks.filter((t) => t.status === 'Ready').length;

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold tracking-tight">Re-slotting Task Management</h3>
            <p className="text-sm text-muted-foreground">Execute physical movements to optimize layout.</p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm" className="bg-neutral-900 text-white font-bold" disabled={readyCount === 0 || releaseBatch.isPending}
              onClick={() => releaseBatch.mutate()}
            >Release Batch ({readyCount} Tasks)</Button>
          </div>
        </div>
        <Card className="shadow-sm border-neutral-200">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-neutral-50/50">
                <TableRow>
                  <TableHead className="w-[100px]">Task ID</TableHead>
                  <TableHead>SKU Details</TableHead>
                  <TableHead>Path (From → To)</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow key={task.id} className="hover:bg-neutral-50/30 transition-colors">
                    <TableCell className="font-mono text-xs font-bold text-blue-600">{task.task_number}</TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{task.sku}</div>
                      <div className="text-[10px] text-muted-foreground">{task.description}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 font-mono text-xs">
                        <span className="bg-gray-100 px-1.5 py-0.5 rounded">{task.from_location_code}</span>
                        <ArrowUpRight className="h-3 w-3 text-neutral-400 rotate-45" />
                        <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100">{task.to_location_code}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs italic text-muted-foreground">{task.reason}</TableCell>
                    <TableCell>
                      <Badge variant={task.priority === 'High' ? 'destructive' : task.priority === 'Med' ? 'default' : 'secondary'} className="text-[9px] font-extrabold">
                        {task.priority.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{task.status}{task.assignee ? ` · ${task.assignee}` : ''}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {task.status === 'Ready' && (
                        <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => assignTask.mutate({ id: task.id, assignee: 'W. Chen' })}>Assign</Button>
                      )}
                      {task.status === 'Assigned' && (
                        <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => completeTask.mutate(task.id)}>
                          <Check className="h-3 w-3 mr-1 text-green-600" /> Complete
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {tasks.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-6">No re-slotting tasks yet — apply a simulation on the Strategies tab.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  };

  const OptimizationTab = () => {
    const { data: impact } = useOptimizationImpact();
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold tracking-tight">Impact Reports</h3>
        </div>
        <Card className="border-none shadow-sm overflow-hidden">
          <CardHeader className="bg-neutral-900 text-white">
            <CardTitle>Optimization ROI Impact Report</CardTitle>
            <CardDescription className="text-neutral-400">
              {impact ? `${impact.applied_simulations} applied simulation(s), ${impact.completed_tasks} completed re-slotting task(s).` : 'Measuring results of dynamic slotting activities.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
            <div className="p-6 border rounded-xl bg-white shadow-sm flex flex-col">
              <p className="text-xs font-bold text-neutral-500 uppercase mb-2 tracking-widest">Travel Time Reduced</p>
              <p className="text-4xl font-extrabold text-green-600">{impact ? `-${impact.travel_time_reduction_pct}%` : '—'}</p>
              <div className="mt-auto pt-4 flex items-center text-[10px] text-green-600 font-bold gap-1">
                <TrendingDown className="h-3 w-3" /> AVG ACROSS APPLIED SIMULATIONS
              </div>
            </div>
            <div className="p-6 border rounded-xl bg-white shadow-sm flex flex-col">
              <p className="text-xs font-bold text-neutral-500 uppercase mb-2 tracking-widest">Storage Slots Recovered</p>
              <p className="text-4xl font-extrabold text-blue-600">{impact ? impact.space_recovered_units : '—'}</p>
              <p className="text-xs font-bold text-neutral-500 mt-1 uppercase">LOCATIONS FULLY VACATED</p>
              <div className="mt-auto pt-4 flex items-center text-[10px] text-blue-600 font-bold gap-1">
                <TrendingUp className="h-3 w-3" /> FROM COMPLETED RE-SLOTTING
              </div>
            </div>
            <div className="p-6 border rounded-xl bg-white shadow-sm flex flex-col">
              <p className="text-xs font-bold text-neutral-500 uppercase mb-2 tracking-widest">Labor Efficiency</p>
              <p className="text-4xl font-extrabold text-purple-600">{impact ? `+${impact.labor_efficiency_pct}%` : '—'}</p>
              <div className="mt-auto pt-4 flex items-center text-[10px] text-purple-600 font-bold gap-1">
                <TrendingUp className="h-3 w-3" /> LABOR HOURS SAVED / 8H SHIFT
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  switch (activeTab) {
    case 'strategies': return renderStrategies();
    case 'velocity': return <VelocityTab />;
    case 'utilization': return <UtilizationTab />;
    case 'reslotting': return <ReslottingTab />;
    case 'optimization': return <OptimizationTab />;
    default: return renderStrategies();
  }
};

export default SlottingSections;
