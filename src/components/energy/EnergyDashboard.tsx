import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight, Cpu, Gauge, HardDrive, MemoryStick, Network, Server, TrendingUp, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { useEnergy } from "@/lib/energy/store";
import { fmtKwh, fmtPct, fmtW, round, summarizeServers } from "@/lib/energy/stats";
import type { ServerRecord } from "@/lib/energy/types";
import { AlertsList } from "./AlertsList";
import { AnomalyDetail } from "./AnomalyDetail";
import { PowerTrendChart, ResourceChart, ServerComparisonChart } from "./charts";
import { ChartCard, FilteredPage, Metric, MiniStat, StatusBadge } from "./shared";

export function EnergyDashboard() {
  const { records, kpis, setImportOpen, source } = useEnergy();
  const [selected, setSelected] = useState<ServerRecord | null>(null);
  const topServers = useMemo(() => summarizeServers(records).sort((a, b) => b.avgPower - a.avgPower).slice(0, 5), [records]);

  return (
    <AppShell>
      <PageHeader
        title="Energy overview"
        subtitle={`Estimated server power, utilization, and anomaly signals${source.fileName ? ` · ${source.fileName}` : ""}`}
        actions={<Button variant="deep" onClick={() => setImportOpen(true)}>Import data</Button>}
      />
      <FilteredPage>
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric icon={Server} label="Total servers" value={String(kpis.servers)} detail={`${kpis.records} readings in view`} />
            <Metric icon={Zap} label="Average power" value={fmtW(kpis.avgPower)} detail="Estimated power across selected readings" />
            <Metric icon={TrendingUp} label="Peak power" value={fmtW(kpis.peakPower)} detail={`Minimum ${fmtW(kpis.minPower)}`} />
            <Metric icon={AlertTriangle} label="Anomalies" value={String(kpis.anomalies)} detail={`${fmtPct(kpis.anomalyRate)} anomaly rate`} tone="text-destructive" />
          </div>

          <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
            <MiniStat label="Average CPU" value={fmtPct(kpis.avgCpu)} />
            <MiniStat label="Average memory" value={fmtPct(kpis.avgMemory)} />
            <MiniStat label="Average disk" value={fmtPct(kpis.avgDisk)} />
            <MiniStat label="Average network" value={`${round(kpis.avgNetwork)} Mbps`} />
            <MiniStat label="Total energy" value={fmtKwh(kpis.totalEnergy)} />
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(340px,1fr)]">
            <ChartCard title="Power consumption" subtitle="Estimated vs predicted power over time" actions={<span className="text-sm font-semibold text-primary">{fmtKwh(kpis.totalEnergy)} total</span>}>
              <PowerTrendChart records={records} />
            </ChartCard>
            <ChartCard title="Recent alerts" subtitle="Newest anomalies in the current view" actions={<Button asChild variant="ghost" size="sm"><Link to="/anomalies">View all <ArrowRight /></Link></Button>}>
              <AlertsList records={records} limit={6} compact onSelect={setSelected} />
            </ChartCard>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <ServerComparisonChart records={records} />
            <ResourceChart records={records} />
          </div>

          <ChartCard title="Top power-consuming servers" subtitle="Ranked by average estimated power" actions={<Button asChild variant="ghost" size="sm"><Link to="/servers">All servers <ArrowRight /></Link></Button>}>
            <div className="-mx-5 overflow-x-auto px-5">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Server</th><th className="px-3 py-2">Environment</th><th className="px-3 py-2"><span className="inline-flex items-center gap-1"><Cpu className="size-3" /> CPU</span></th>
                    <th className="px-3 py-2"><span className="inline-flex items-center gap-1"><MemoryStick className="size-3" /> Memory</span></th><th className="px-3 py-2"><span className="inline-flex items-center gap-1"><HardDrive className="size-3" /> Disk</span></th>
                    <th className="px-3 py-2"><span className="inline-flex items-center gap-1"><Network className="size-3" /> Network</span></th><th className="px-3 py-2"><span className="inline-flex items-center gap-1"><Gauge className="size-3" /> Avg power</span></th><th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {topServers.map((s) => (
                    <tr key={s.serverId} className="border-b border-border/60 last:border-0 hover:bg-accent/50">
                      <td className="px-3 py-3 font-semibold"><Link className="hover:text-primary" to="/servers/$serverId" params={{ serverId: s.serverId }}>{s.serverId}</Link></td>
                      <td className="px-3 py-3 text-muted-foreground">{s.environment}</td>
                      <td className="px-3 py-3">{fmtPct(s.avgCpu)}</td><td className="px-3 py-3">{fmtPct(s.avgMemory)}</td><td className="px-3 py-3">{fmtPct(s.avgDisk)}</td>
                      <td className="px-3 py-3">{round(s.avgNetwork)} Mbps</td><td className="px-3 py-3 font-semibold">{fmtW(s.avgPower)}</td>
                      <td className="px-3 py-3"><StatusBadge status={s.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartCard>
        </div>
      </FilteredPage>
      <AnomalyDetail record={selected} onClose={() => setSelected(null)} />
    </AppShell>
  );
}
