import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEnergy } from "@/lib/energy/store";
import { fmtPct, fmtW, round, summarizeServers, type ServerSummary } from "@/lib/energy/stats";
import { ChartCard, FilteredPage, Segmented, StatusBadge, TableShell, td, th } from "../shared";

type SortKey = keyof Pick<ServerSummary, "serverId" | "department" | "environment" | "avgCpu" | "avgMemory" | "avgDisk" | "avgNetwork" | "avgPower" | "avgPredicted" | "avgDeviation" | "anomalies" | "status">;
type StatusFilter = "all" | ServerSummary["status"];
const PAGE = 10;

const COLS: { key: SortKey; label: string }[] = [
  { key: "serverId", label: "Server ID" }, { key: "department", label: "Department" }, { key: "environment", label: "Environment" },
  { key: "avgCpu", label: "CPU" }, { key: "avgMemory", label: "Memory" }, { key: "avgDisk", label: "Disk" }, { key: "avgNetwork", label: "Network" },
  { key: "avgPower", label: "Power" }, { key: "avgPredicted", label: "Predicted" }, { key: "avgDeviation", label: "Deviation" }, { key: "status", label: "Status" },
];

export function ServersPage() {
  const { records } = useEnergy();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "avgPower", dir: -1 });
  const [page, setPage] = useState(0);

  const summaries = useMemo(() => summarizeServers(records), [records]);
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = summaries.filter((s) => (status === "all" || s.status === status) && (!needle || [s.serverId, s.department, s.environment].some((v) => v.toLowerCase().includes(needle))));
    return list.sort((a, b) => {
      const x = a[sort.key], y = b[sort.key];
      return (typeof x === "string" && typeof y === "string" ? x.localeCompare(y) : (x as number) - (y as number)) * sort.dir;
    });
  }, [summaries, q, status, sort]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const current = Math.min(page, pages - 1);
  const visible = rows.slice(current * PAGE, current * PAGE + PAGE);
  const toggle = (key: SortKey) => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : key === "serverId" || key === "department" || key === "environment" ? 1 : -1 }));
  const counts = { Online: summaries.filter((s) => s.status === "Online").length, Warning: summaries.filter((s) => s.status === "Warning").length, Anomaly: summaries.filter((s) => s.status === "Anomaly").length };

  return (
    <FilteredPage>
      <ChartCard
        title="Server monitoring"
        subtitle={`${summaries.length} servers · ${counts.Online} online, ${counts.Warning} warning, ${counts.Anomaly} with anomalies · values are averages of the filtered readings`}
        actions={
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Search server, department..." aria-label="Search servers" className="h-9 w-56 rounded-full border border-border bg-card pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring/30" />
            </div>
            <Segmented value={status} onChange={(v) => { setStatus(v); setPage(0); }} options={[{ value: "all", label: "All" }, { value: "Online", label: "Online" }, { value: "Warning", label: "Warning" }, { value: "Anomaly", label: "Anomaly" }]} />
          </>
        }
      >
        {visible.length ? (
          <TableShell minWidth={1100}>
            <thead className="border-b border-border">
              <tr>{COLS.map((c) => <th key={c.key} className={th}><button className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => toggle(c.key)}>{c.label} <ArrowUpDown className="size-3" /></button></th>)}</tr>
            </thead>
            <tbody>
              {visible.map((s) => (
                <tr key={s.serverId} className="border-b border-border/60 last:border-0 hover:bg-accent/50">
                  <td className={`${td} font-semibold`}><Link className="hover:text-primary" to="/servers/$serverId" params={{ serverId: s.serverId }}>{s.serverId}</Link></td>
                  <td className={td}>{s.department}</td><td className={td}>{s.environment}</td>
                  <td className={td}>{fmtPct(s.avgCpu)}</td><td className={td}>{fmtPct(s.avgMemory)}</td><td className={td}>{fmtPct(s.avgDisk)}</td><td className={td}>{round(s.avgNetwork)} Mbps</td>
                  <td className={`${td} font-semibold`}>{fmtW(s.avgPower)}</td>
                  <td className={td}>{s.avgPredicted ? fmtW(s.avgPredicted) : "—"}</td>
                  <td className={td}>{s.avgPredicted ? `${s.avgDeviation > 0 ? "+" : ""}${round(s.avgDeviation)} W` : "—"}</td>
                  <td className={td}><StatusBadge status={s.status} /></td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        ) : (
          <p className="py-10 text-center text-sm text-muted-foreground">No servers match this search.</p>
        )}
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>Showing {rows.length ? current * PAGE + 1 : 0}–{Math.min(rows.length, (current + 1) * PAGE)} of {rows.length}</span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="size-8" disabled={current === 0} onClick={() => setPage(current - 1)} aria-label="Previous page"><ChevronLeft /></Button>
            <span className="px-2 font-semibold">{current + 1} / {pages}</span>
            <Button variant="outline" size="icon" className="size-8" disabled={current >= pages - 1} onClick={() => setPage(current + 1)} aria-label="Next page"><ChevronRight /></Button>
          </div>
        </div>
      </ChartCard>
    </FilteredPage>
  );
}
