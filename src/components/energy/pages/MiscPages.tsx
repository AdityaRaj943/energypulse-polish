import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { Activity, BrainCircuit, Database, FileSpreadsheet, Info, Radio, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useEnergy } from "@/lib/energy/store";
import { fmtDateTime, fmtPct, fmtW, round } from "@/lib/energy/stats";
import { OPTIONAL_COLUMNS, REQUIRED_COLUMNS } from "@/lib/energy/types";
import { ChartCard, FilteredPage, MiniStat, SeverityBadge, TableShell, td, th } from "../shared";
import { severityOf } from "@/lib/energy/stats";

export function MonitoringPage() {
  const { records, kpis, source } = useEnergy();
  const latest = useMemo(() => [...records].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 20), [records]);
  const newest = latest[0];
  return (
    <FilteredPage>
      <div className="space-y-6">
        <section className="card-surface flex flex-wrap items-center gap-4 p-5">
          <span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary"><Radio /></span>
          <div className="min-w-0 flex-1">
            <h2 className="font-bold">Data source: {source.fileName ?? source.label}</h2>
            <p className="text-xs text-muted-foreground">
              Readings come from the imported Excel dataset. Live collection (Python psutil → Flask API) is planned; the store already accepts any record source with the same schema.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-semibold"><span className="size-2 rounded-full bg-warning" /> Offline dataset mode</span>
        </section>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          <MiniStat label="Latest reading" value={newest ? fmtDateTime(newest.timestamp) : "—"} />
          <MiniStat label="Readings in view" value={String(kpis.records)} />
          <MiniStat label="Average power" value={fmtW(kpis.avgPower)} />
          <MiniStat label="Active anomalies" value={String(kpis.anomalies)} />
        </div>
        <ChartCard title="Latest readings" subtitle="Newest 20 readings across the selected servers">
          <TableShell minWidth={860}>
            <thead className="border-b border-border"><tr><th className={th}>Time</th><th className={th}>Server</th><th className={th}>CPU</th><th className={th}>Memory</th><th className={th}>Disk</th><th className={th}>Network</th><th className={th}>Power</th><th className={th}>Status</th></tr></thead>
            <tbody>
              {latest.map((r) => (
                <tr key={r.id} className="border-b border-border/60 last:border-0 hover:bg-accent/50">
                  <td className={`${td} text-muted-foreground`}>{fmtDateTime(r.timestamp)}</td>
                  <td className={`${td} font-semibold`}><Link className="hover:text-primary" to="/servers/$serverId" params={{ serverId: r.serverId }}>{r.serverId}</Link></td>
                  <td className={td}>{fmtPct(r.cpu)}</td><td className={td}>{fmtPct(r.memory)}</td><td className={td}>{fmtPct(r.disk)}</td><td className={td}>{round(r.network)} Mbps</td>
                  <td className={`${td} font-semibold`}>{fmtW(r.power)}</td>
                  <td className={td}>{r.anomalyStatus === "Anomaly" ? <SeverityBadge severity={severityOf(r)} /> : <SeverityBadge severity="normal" />}</td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        </ChartCard>
      </div>
    </FilteredPage>
  );
}

export function SettingsPage() {
  const { datasetRecords, source, loadDemo, clearData, setImportOpen, rfModel, ifModel } = useEnergy();
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <ChartCard title="Dataset" subtitle="Data is stored in this browser (localStorage) so it survives a reload.">
        <div className="grid gap-3 sm:grid-cols-2">
          <MiniStat label="Source" value={source.fileName ?? source.label} />
          <MiniStat label="Records stored" value={String(datasetRecords.length)} />
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button variant="deep" onClick={() => setImportOpen(true)}><FileSpreadsheet /> Import Excel Data</Button>
          <Button variant="outline" onClick={() => { loadDemo(); toast.success("Demo dataset restored"); }}><Database /> Restore demo data</Button>
          <Button variant="destructive" onClick={() => { clearData(); toast("Data cleared", { description: "The dashboard now shows the empty state." }); }}><Trash2 /> Clear Data</Button>
        </div>
      </ChartCard>
      <ChartCard title="Models" subtitle="Browser-trained models are reset whenever a new dataset is loaded.">
        <div className="grid gap-3 sm:grid-cols-2">
          <MiniStat label="Random Forest" value={rfModel ? "Trained" : "Model not trained"} hint={rfModel ? `R² ${round(rfModel.metrics.r2, 3)} · ${fmtDateTime(rfModel.trainedAt)}` : "Train it on the Power Prediction page"} />
          <MiniStat label="Isolation Forest" value={ifModel ? "Trained" : "Model not trained"} hint={ifModel ? `${ifModel.trees.length} trees · threshold ${round(ifModel.threshold, 3)}` : "Trained together with the Random Forest"} />
        </div>
        <p className="mt-4 text-xs text-muted-foreground">EnergyPulse is a software-based estimated power monitoring prototype. It does not measure physical electrical power.</p>
      </ChartCard>
    </div>
  );
}

export function HelpPage() {
  const cards: [typeof Info, string, string][] = [
    [Info, "Estimated power", "Estimated_Power_W is a software estimate derived from resource usage — not a physical electrical measurement."],
    [Activity, "Global filters", "Date range, server, department, environment, and status filters apply to every KPI, chart, table, alert, and report."],
    [BrainCircuit, "Predictions", "Dataset predictions (Predicted_Power_W) are shown separately from the browser-trained Random Forest. Metrics (R², MAE, RMSE) are measured on a hold-out split."],
    [ShieldAlert, "Anomalies", "Dataset detection uses Anomaly_Status / Anomaly_Score from the workbook. ML detection uses a trained Isolation Forest, and every view labels its source."],
  ];
  return (
    <div className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2">
        {cards.map(([Icon, title, copy]) => (
          <div key={title} className="card-surface p-5">
            <Icon className="text-primary" />
            <h2 className="mt-4 font-bold">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy}</p>
          </div>
        ))}
      </div>
      <ChartCard title="Import format" subtitle="Excel (.xlsx, .xls) or CSV. The first sheet containing the required columns is used.">
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Required columns</p>
            <ul className="mt-2 space-y-1 font-mono text-sm">{REQUIRED_COLUMNS.map((c) => <li key={c}>{c}</li>)}</ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Optional columns</p>
            <ul className="mt-2 space-y-1 font-mono text-sm">{OPTIONAL_COLUMNS.map((c) => <li key={c}>{c}</li>)}</ul>
          </div>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">Workflow: Excel → Import → Validation → Parsing → Data store → Statistics → Power analytics → Prediction → Anomaly detection → Alerts → Dashboard → Reports.</p>
      </ChartCard>
    </div>
  );
}
