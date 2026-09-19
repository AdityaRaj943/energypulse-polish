import { RotateCcw, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEnergy } from "@/lib/energy/store";
import type { DateRange } from "@/lib/energy/types";

const RANGES: { value: DateRange; label: string }[] = [
  { value: "1d", label: "Today" },
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "all", label: "All Data" },
];

export function GlobalFilterBar() {
  const { filters, setFilters, resetFilters, servers, departments, environments, records, allRecords } = useEnergy();
  const dirty = filters.range !== "all" || filters.server !== "all" || filters.department !== "all" || filters.environment !== "all" || filters.status !== "all";
  const triggerCls = "h-9 w-auto min-w-[140px] rounded-full border-border bg-card text-xs font-semibold shadow-none";
  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      <span className="mr-1 hidden items-center gap-1.5 text-xs font-semibold text-muted-foreground sm:flex">
        <SlidersHorizontal className="size-3.5" /> Filters
      </span>
      <Select value={filters.range} onValueChange={(v) => setFilters({ range: v as DateRange })}>
        <SelectTrigger className={triggerCls}><SelectValue /></SelectTrigger>
         <SelectContent>{[...RANGES, { value: "custom" as const, label: "Custom Range" }].map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
      </Select>
       <Select value={filters.environment} onValueChange={(v) => setFilters({ environment: v })}>
         <SelectTrigger className={triggerCls}><SelectValue /></SelectTrigger>
         <SelectContent>
           <SelectItem value="all">All Environments</SelectItem>
           {environments.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
         </SelectContent>
       </Select>
      <Select value={filters.server} onValueChange={(v) => setFilters({ server: v })}>
        <SelectTrigger className={triggerCls}><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Servers</SelectItem>
          {servers.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
        </SelectContent>
      </Select>
       {filters.range === "custom" && (
         <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5">
           <input aria-label="Start date" type="date" value={filters.dateFrom} onChange={(e) => setFilters({ dateFrom: e.target.value })} className="bg-transparent text-xs outline-none" />
           <span className="text-xs text-muted-foreground">to</span>
           <input aria-label="End date" type="date" value={filters.dateTo} onChange={(e) => setFilters({ dateTo: e.target.value })} className="bg-transparent text-xs outline-none" />
         </div>
       )}
      <Select value={filters.department} onValueChange={(v) => setFilters({ department: v })}>
        <SelectTrigger className={triggerCls}><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Departments</SelectItem>
          {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={filters.status} onValueChange={(v) => setFilters({ status: v as typeof filters.status })}>
        <SelectTrigger className={triggerCls}><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="normal">Normal</SelectItem>
          <SelectItem value="anomaly">Anomaly</SelectItem>
        </SelectContent>
      </Select>
      {dirty && (
        <Button variant="ghost" size="sm" onClick={resetFilters}>
          <RotateCcw /> Reset
        </Button>
      )}
      <span className="ml-auto text-xs text-muted-foreground">
        {records.length} of {allRecords.length} records
      </span>
    </div>
  );
}
