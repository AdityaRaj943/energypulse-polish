import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, Cpu, Gauge, HardDrive, MemoryStick, Network, TrendingUp, Zap } from "lucide-react";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { useEnergy } from "@/lib/energy/store";
import { fmtKwh, fmtPct, fmtW, round, summarizeServers } from "@/lib/energy/stats";
import type { ServerRecord } from "@/lib/energy/types";
import { AlertsList } from "../AlertsList";
import { AnomalyDetail } from "../AnomalyDetail";
import { TrendChart } from "../charts";
import { ChartCard, Metric, MiniStat, StatusBadge } from "../shared";

export function ServerDetailPage({ serverId }: { serverId: string }) {
  const { allRecords, records, filtersActive, setFilters, resetFilters } = useEnergy();
  const [selected, setSelected] = useState<ServerRecord | null>(null);
  const rows = useMemo(() => records.filter((r) => r.serverId === serverId), [records, serverId]);
  const existsUnfiltered = useMemo(() => allRecords.some((r) => r.serverId === serverId), [allRecords, serverId]);
  const s = useMemo(() => summarizeServers(rows)[0], [rows]);

  return (
    <AppShell>
      <PageHeader
        title={serverId}
        subtitle={s ? `${s.department} · ${s.environment} · ${s.records} readings in view` : "Server detail"}
        actions={
          <div className="flex items-center gap-2">
            {s && <StatusBadge status={s.status} />}
            <Button asChild variant="outline"><Link to="/servers">Back to servers</Link></Button>
          </div>
        }
      />
      {!s ? (
        <section className="card-surface p-12 text-center text-muted-foreground">
          {existsUnfiltered ? (
            <>
              <p>No readings for this server match the selected filters.</p>
              <Button className="mt-4" variant="outline" onClick={resetFilters}>Clear Filters</Button>
            </>
          ) : (
            <p>Server not found in the active dataset.</p>
          )}
        </section>
      ) : (
        <div className="space-y-6">
          {filtersActive && (
            <p className="rounded-xl bg-warning-soft px-4 py-2 text-xs text-warning-foreground">Global filters are active — statistics below reflect the filtered readings only.</p>
          )}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric icon={Zap} label="Average power" value={fmtW(s.avgPower)} detail={s.avgPredicted ? `Predicted ${fmtW(s.avgPredicted)} avg` : "No dataset prediction"} />
            <Metric icon={TrendingUp} label="Peak power" value={fmtW(s.peakPower)} />
            <Metric icon={Gauge} label="Total energy" value={fmtKwh(s.energy)} />
            <Metric icon={AlertTriangle} label="Anomaly count" value={String(s.anomalies)} detail={`${fmtPct(s.records ? (s.anomalies / s.records) * 100 : 0)} of readings`} tone="text-destructive" />
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <MiniStat label="Average CPU" value={fmtPct(s.avgCpu)} />
            <MiniStat label="Average memory" value={fmtPct(s.avgMemory)} />
            <MiniStat label="Average disk" value={fmtPct(s.avgDisk)} />
            <MiniStat label="Average network" value={`${round(s.avgNetwork)} Mbps`} />
          </div>

          <ChartCard title="Estimated power trend" subtitle="Per reading, in time order">
            <TrendChart records={rows} dataKey="power" label="Estimated power" unit=" W" height={260} />
          </ChartCard>
          <div className="grid gap-6 md:grid-cols-2">
            <ChartCard title="CPU trend" subtitle="CPU_Usage_%"><TrendChart records={rows} dataKey="cpu" label="CPU" unit="%" color="var(--chart-2)" /></ChartCard>
            <ChartCard title="Memory trend" subtitle="Memory_Usage_%"><TrendChart records={rows} dataKey="memory" label="Memory" unit="%" color="var(--chart-3)" /></ChartCard>
            <ChartCard title="Disk trend" subtitle="Disk_Usage_%"><TrendChart records={rows} dataKey="disk" label="Disk" unit="%" color="var(--chart-4)" /></ChartCard>
            <ChartCard title="Network trend" subtitle="Network_Usage_Mbps"><TrendChart records={rows} dataKey="network" label="Network" unit=" Mbps" color="var(--chart-5)" /></ChartCard>
          </div>

          <ChartCard title="Recent alerts" subtitle="Anomalous readings for this server, newest first" actions={<Button variant="ghost" size="sm" onClick={() => setFilters({ server: serverId })}><span className="inline-flex items-center gap-1"><Cpu className="size-3" /> Filter dashboard to this server</span></Button>}>
            <AlertsList records={rows} limit={10} onSelect={setSelected} />
          </ChartCard>
          <p className="flex flex-wrap gap-4 text-[11px] text-muted-foreground"><span className="inline-flex items-center gap-1"><MemoryStick className="size-3" /> Values are software estimates from the dataset</span><span className="inline-flex items-center gap-1"><HardDrive className="size-3" /> Energy from Energy_kWh_Approx</span><span className="inline-flex items-center gap-1"><Network className="size-3" /> Deviation = Estimated − Predicted</span></p>
        </div>
      )}
      <AnomalyDetail record={selected} onClose={() => setSelected(null)} />
    </AppShell>
  );
}
