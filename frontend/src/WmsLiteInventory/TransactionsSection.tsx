import React, { useMemo, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";
import { useMasterDataList } from "@/hooks/useMasterDataApi";
import { useInventoryTransactions } from "@/hooks/useInventoryOpsApi";

const MATERIALS_RESOURCE = "/master-data/materials";

interface MaterialRecord { id: number; sku: string; }

const TransactionsSection = () => {
  const { data: transactions = [], isLoading } = useInventoryTransactions();
  const { data: materials = [] } = useMasterDataList<MaterialRecord>(MATERIALS_RESOURCE);
  const materialById = useMemo(() => new Map(materials.map(m => [m.id, m.sku])), [materials]);
  const [search, setSearch] = useState("");

  const filtered = transactions.filter(t =>
    (materialById.get(t.material_id) || "").toLowerCase().includes(search.toLowerCase()) ||
    (t.reference || "").toLowerCase().includes(search.toLowerCase()) ||
    t.txn_type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <Input placeholder="Search transaction ID, SKU or reference..." className="pl-9 bg-white" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <Table>
          <TableHeader className="bg-neutral-50">
            <TableRow>
              <TableHead className="font-semibold">TXN ID</TableHead>
              <TableHead className="font-semibold">Type</TableHead>
              <TableHead className="font-semibold">SKU</TableHead>
              <TableHead className="text-right font-semibold">Quantity</TableHead>
              <TableHead className="font-semibold">Reference</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Date & Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-neutral-400"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Loading transactions...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-neutral-400">No transactions yet.</TableCell></TableRow>
            ) : filtered.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-mono text-xs">TXN-{String(item.id).padStart(4, "0")}</TableCell>
                <TableCell>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase ${
                    item.txn_type === 'Receipt' ? 'bg-blue-100 text-blue-700' :
                    item.txn_type === 'Adjustment' ? 'bg-orange-100 text-orange-700' :
                    item.txn_type === 'Shipment' ? 'bg-red-100 text-red-700' :
                    'bg-neutral-100 text-neutral-700'
                  }`}>
                    {item.txn_type}
                  </span>
                </TableCell>
                <TableCell className="font-medium">{materialById.get(item.material_id) || `#${item.material_id}`}</TableCell>
                <TableCell className={`text-right font-bold ${item.qty < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {item.qty > 0 ? `+${item.qty}` : item.qty}
                </TableCell>
                <TableCell>{item.reference || "—"}</TableCell>
                <TableCell className="text-xs text-neutral-500">{item.status}</TableCell>
                <TableCell className="text-neutral-500 text-xs">{new Date(item.created_at).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default TransactionsSection;
