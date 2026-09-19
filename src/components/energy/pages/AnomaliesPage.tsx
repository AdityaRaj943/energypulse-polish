import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpDown, CheckCircle2, ShieldAlert, Sigma, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEnergy } from "@/lib/energy/store";
import { anomalies, deviationOf, fmtDateTime, fmtPct, fmtW, round, severityOf } from "@/lib/energy/stats";
import type { ServerRecord } from "@/lib/energy/types";
import { AnomalyDetail } from "../AnomalyDetail";
import { AnomalyScatterChart } from "../charts";
import { ChartCard, FilteredPage, Metric, Segmented, SeverityBadge, SourceBadge, TableShell, td, th } from "../shared";

type SortKey = "timestamp" | "power" | "deviation" | "score" | "server";

export function AnomaliesPage() {
  const { records, kpis, anomalyMode, anomalySource, setAnomalyMode, ifModel, training, trainModels, datasetRecords } = useEnergy();
  const [selected, setSelected] = useState<ServerRecord | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "timestamp", dir: -1 });

  const rows = useMemo(() => {
    const list = anomalies(records);
    const val = (r: ServerRecord) =>
      sort.key === "timestamp" ? r.timestamp.getTime() : sort.key === "power" ? r.power : sort.key === "deviation" ? deviationOf(r) ?? 0 : sort.key === "score" ? r.anomalyScore ?? 0 : r.serverId;
    return list.sort((a, b) => {
      const x = val(a), y = val(b);
      return (typeof x === "string" && typeof y === "string" ? x.localeCompare(y) : (x as number) - (y as number)) * sort.dir;
    });
  }, [records, sort]);

  const toggle = (key: SortKey) => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : -1 }));
  const Th = ({ k, label }: { k: SortKey; label: string }) => (
    <th className={th}><button className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => toggle(k)}>{label} <ArrowUpDown className="size-3" /></button></th>
  );

  return (
    <FilteredPage>
      <div className="space-y-6">
        <section className="card-surface flex flex-wrap items-center justify-between gap-4 p-4">
          <div>
            <p className="text-sm font-semibold">Detection mode</p>
            <p className="text-xs text-muted-foreground">
              {anomalySource === "ml"
                ? `Isolation Forest trained on ${datasetRecords.length} records · threshold ${round(ifModel!.threshold, 3)} · contamination ${ifModel!.contamination * 100}%`
                : "Using Anomaly_Status and Anomaly_Score from the imported dataset"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Segmented value={anomalyMode} onChange={setAnomalyMode} options={[{ value: "dataset", label: "Dataset Detection" }, { value: "ml", label: "ML Detection" }]} />
            {anomalyMode === "ml" && !ifModel && (
              <Button size="sm" variant="deep" onClick={() => void trainModels()} disabled={training || datasetRecords.length < 10}>
                {training ? <Loader2 className="animate-spin" /> : null} {training ? "Training..." : "Train Isolation Forest"}
              </Button>
            )}
            <SourceBadge source={anomalySource} />
          </div>
          {anomalyMode === "ml" && !ifModel && !training && (
            <p className="w-full rounded-xl bg-warning-soft p-3 text-xs text-warning-foreground">ML model not trained — dataset detection is shown until the Isolation Forest is trained.</p>
          )}
        </section>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric icon={Sigma} label="Total records" value={String(kpis.records)} />
          <Metric icon={CheckCircle2} label="Normal records" value={String(kpis.records - kpis.anomalies)} />
          <Metric icon={ShieldAlert} label="Anomalous records" value={String(kpis.anomalies)} tone="text-destructive" />
          <Metric icon={ShieldAlert} label="Anomaly rate" value={fmtPct(kpis.anomalyRate)} detail={`${kpis.anomalies} / ${kpis.records} × 100`} tone="text-destructive" />
        </div>

        <ChartCard title="Estimated power with anomalies" subtitle="Diamonds are anomalous readings — click one for details" actions={<SourceBadge source={anomalySource} />}>
          <AnomalyScatterChart records={records} onSelect={setSelected} />
        </ChartCard>

        <ChartCard title="Anomaly table" subtitle={`${rows.length} anomalies · click a row for details`}>
          {rows.length ? (
            <TableShell minWidth={980}>
              <thead className="border-b border-border">
                <tr><Th k="server" label="Server" /><Th k="timestamp" label="Timestamp" /><Th k="power" label="Power" /><th className={th}>Predicted</th><Th k="deviation" label="Deviation" /><Th k="score" label="Score" /><th className={th}>Alert</th><th className={th}>Severity</th></tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const dev = deviationOf(r);
                  return (
                    <tr key={r.id} onClick={() => setSelected(r)} className="cursor-pointer border-b border-border/60 last:border-0 hover:bg-accent/50">
                      <td className={`${td} font-semibold`}><Link className="hover:text-primary" to="/servers/$serverId" params={{ serverId: r.serverId }} onClick={(e) => e.stopPropagation()}>{r.serverId}</Link></td>
                      <td className={`${td} text-muted-foreground`}>{fmtDateTime(r.timestamp)}</td>
                      <td className={`${td} font-semibold`}>{fmtW(r.power)}</td>
                      <td className={td}>{r.predictedPower === null ? "—" : fmtW(r.predictedPower)}</td>
                      <td className={td}>{dev === null ? "—" : `${dev > 0 ? "+" : ""}${round(dev)} W`}</td>
                      <td className={td}>{r.anomalyScore ?? "—"}</td>
                      <td className={`${td} max-w-[260px] truncate text-muted-foreground`}>{r.alert || "—"}</td>
                      <td className={td}><SeverityBadge severity={severityOf(r)} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </TableShell>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">No anomalies in the current view.</p>
          )}
        </ChartCard>
      </div>
      <AnomalyDetail record={selected} onClose={() => setSelected(null)} />
    </FilteredPage>
  );
}
