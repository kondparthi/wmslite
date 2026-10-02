import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Loader2 } from "lucide-react";
import { useMasterDataList } from "@/hooks/useMasterDataApi";
import { useInventoryHolds } from "@/hooks/useInventoryOpsApi";

const BALANCES_RESOURCE = "/operations/inventory-balances";
const MATERIALS_RESOURCE = "/master-data/materials";

interface BalanceRecord { material_id: number; on_hand: number; allocated: number; on_hold: number; }
interface MaterialRecord { id: number; category: string | null; }

const COLORS = ['#10b981', '#f59e0b', '#ef4444'];

const InventoryReportSection = () => {
  const { data: balances = [], isLoading: loadingBalances } = useMasterDataList<BalanceRecord>(BALANCES_RESOURCE);
  const { data: materials = [], isLoading: loadingMaterials } = useMasterDataList<MaterialRecord>(MATERIALS_RESOURCE);
  const { data: holds = [] } = useInventoryHolds();

  const isLoading = loadingBalances || loadingMaterials;
  const materialCategoryById = useMemo(() => new Map(materials.map(m => [m.id, m.category || "Uncategorized"])), [materials]);

  const totals = useMemo(() => {
    const onHand = balances.reduce((s, b) => s + b.on_hand, 0);
    const allocated = balances.reduce((s, b) => s + b.allocated, 0);
    const onHold = balances.reduce((s, b) => s + (b.on_hold || 0), 0);
    const available = onHand - allocated - onHold;
    return { onHand, allocated, onHold, available };
  }, [balances]);

  const categoryData = useMemo(() => {
    const byCategory = new Map<string, number>();
    balances.forEach(b => {
      const cat = materialCategoryById.get(b.material_id) || "Uncategorized";
      byCategory.set(cat, (byCategory.get(cat) || 0) + b.on_hand);
    });
    return Array.from(byCategory.entries()).map(([name, value]) => ({ name, value }));
  }, [balances, materialCategoryById]);

  const pieData = [
    { name: 'Available', value: totals.available },
    { name: 'Allocated', value: totals.allocated },
    { name: 'On Hold', value: totals.onHold },
  ];
  const pieTotal = pieData.reduce((s, p) => s + p.value, 0) || 1;

  const stats = [
    { label: 'Total SKUs', value: materials.length.toLocaleString() },
    { label: 'Total Units On Hand', value: totals.onHand.toLocaleString() },
    { label: 'Active Holds', value: holds.filter(h => h.status === "Active").length.toLocaleString() },
    { label: 'Availability Rate', value: totals.onHand > 0 ? `${Math.round((totals.available / totals.onHand) * 100)}%` : "—" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <p className="text-sm text-neutral-500 font-medium">{stat.label}</p>
              <div className="flex items-baseline justify-between mt-1">
                <h3 className="text-2xl font-bold">{isLoading ? <Loader2 className="h-5 w-5 animate-spin text-neutral-300" /> : stat.value}</h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Inventory by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#262626" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Stock Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-2 mr-4">
                {pieData.map((entry, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }}></div>
                    <span className="text-xs text-neutral-600 font-medium">{entry.name} ({Math.round((entry.value / pieTotal) * 100)}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InventoryReportSection;
