import { useMemo, useState } from "react";
import { BrainCircuit, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { useEnergy } from "@/lib/energy/store";
import { avg, fmtDateTime, fmtW, predictionStats, round } from "@/lib/energy/stats";
import { ChartCard, FilteredPage, MiniStat, Segmented, TableShell, td, th } from "../shared";

type View = "dataset" | "ml";

export function PredictionPage() {
  const { records, datasetRecords, rfModel, training, trainError, trainModels, mlPredict } = useEnergy();
  const [view, setView] = useState<View>("dataset");
  const showMl = view === "ml" && !!rfModel;

  const rows = useMemo(
    () =>
      records.map((r) => {
        const ml = mlPredict(r);
        return { r, ml, mlDiff: ml === null ? null : r.power - ml, dsDiff: r.predictedPower === null ? null : r.power - r.predictedPower };
      }),
    [records, mlPredict],
  );
  const ds = predictionStats(records);
  const mlStats = useMemo(() => {
    const pairs = rows.filter((x) => x.ml !== null) as { r: (typeof rows)[number]["r"]; ml: number }[];
    if (!pairs.length) return null;
    return {
      mae: avg(pairs.map((p) => Math.abs(p.r.power - p.ml))),
      rmse: Math.sqrt(avg(pairs.map((p) => (p.r.power - p.ml) ** 2))),
      predicted: avg(pairs.map((p) => p.ml)),
      actual: avg(pairs.map((p) => p.r.power)),
    };
  }, [rows]);

  const chart = useMemo(() => {
    const groups = new Map<number, { power: number[]; ds: number[]; ml: number[] }>();
    for (const x of rows) {
      const k = x.r.timestamp.getTime();
      const g = groups.get(k) ?? { power: [], ds: [], ml: [] };
      g.power.push(x.r.power);
      if (x.r.predictedPower !== null) g.ds.push(x.r.predictedPower);
      if (x.ml !== null) g.ml.push(x.ml);
      groups.set(k, g);
    }
    return [...groups.entries()].sort((a, b) => a[0] - b[0]).map(([t, g]) => ({ t, label: new Date(t).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }), actual: round(avg(g.power)), dataset: g.ds.length ? round(avg(g.ds)) : null, ml: g.ml.length ? round(avg(g.ml)) : null }));
  }, [rows]);

  const recent = useMemo(() => [...rows].sort((a, b) => b.r.timestamp.getTime() - a.r.timestamp.getTime()).slice(0, 25), [rows]);

  return (
    <FilteredPage>
      <div className="space-y-6">
        <section className="card-surface p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary"><BrainCircuit /></span>
              <div>
                <h2 className="font-bold">Random Forest Regression</h2>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                  Trained in the browser on all {datasetRecords.length} imported records. Features: CPU, memory, disk, network. Target: Estimated_Power_W. Metrics are measured on a 20% hold-out split and are never estimated.
                </p>
              </div>
            </div>
            <Button variant="deep" onClick={() => void trainModels()} disabled={training || datasetRecords.length < 10}>
              {training ? <Loader2 className="animate-spin" /> : <RefreshCw />} {training ? "Training model..." : rfModel ? "Retrain model" : "Train Model"}
            </Button>
          </div>
          {trainError && <p className="mt-4 rounded-xl bg-danger-soft p-3 text-sm text-destructive">{trainError}</p>}
          {training && <p className="mt-4 text-sm text-muted-foreground" aria-live="polite">Training model... building 60 trees and an Isolation Forest.</p>}
          {!training && !rfModel && !trainError && <p className="mt-4 rounded-xl bg-muted p-3 text-sm font-semibold text-muted-foreground">Model not trained</p>}
          {rfModel && !training && (
            <div className="mt-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-primary"><CheckCircle2 className="size-4" /> Model trained successfully</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
                <MiniStat label="Model" value="Random Forest" hint={`${rfModel.trees.length} trees`} />
                <MiniStat label="Training records" value={String(rfModel.metrics.trainSize)} hint={`${rfModel.metrics.testSize} held out`} />
                <MiniStat label="R²" value={round(rfModel.metrics.r2, 3).toString()} />
                <MiniStat label="MAE" value={`${round(rfModel.metrics.mae, 2)} W`} />
                <MiniStat label="RMSE" value={`${round(rfModel.metrics.rmse, 2)} W`} />
                <MiniStat label="Last trained" value={fmtDateTime(rfModel.trainedAt)} />
              </div>
            </div>
          )}
        </section>

        <div className="grid gap-4 sm:grid-cols-3">
          <MiniStat label="Actual power (avg)" value={fmtW(kpisActual(rows))} hint={`${records.length} readings`} />
          {showMl ? (
            <>
              <MiniStat label="ML predicted power (avg)" value={mlStats ? fmtW(mlStats.predicted) : "—"} hint="Random Forest" />
              <MiniStat label="Power difference (avg)" value={mlStats ? `${mlStats.actual - mlStats.predicted > 0 ? "+" : ""}${round(mlStats.actual - mlStats.predicted)} W` : "—"} hint={mlStats ? `MAE ${round(mlStats.mae, 1)} W · RMSE ${round(mlStats.rmse, 1)} W` : "—"} />
            </>
          ) : (
            <>
              <MiniStat label="Dataset predicted power (avg)" value={ds ? fmtW(ds.predicted) : "Not in dataset"} hint="Predicted_Power_W column" />
              <MiniStat label="Power difference (avg)" value={ds ? `${ds.diff > 0 ? "+" : ""}${round(ds.diff)} W` : "—"} hint={ds ? `MAE ${round(ds.mae, 1)} W · RMSE ${round(ds.rmse, 1)} W` : "—"} />
            </>
          )}
        </div>

        <ChartCard
          title="Actual vs predicted power"
          subtitle={showMl ? "Dataset prediction and ML prediction shown side by side" : "Dataset prediction from Predicted_Power_W"}
          actions={<Segmented value={view} onChange={setView} options={[{ value: "dataset", label: "Dataset Prediction" }, { value: "ml", label: rfModel ? "ML Prediction" : "ML (train first)" }]} />}
        >
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chart} margin={{ top: 8, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} minTickGap={24} />
                <YAxis tickLine={false} axisLine={false} fontSize={11} unit=" W" width={58} domain={["auto", "auto"]} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} formatter={(v: number, n: string) => [`${v} W`, n]} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="actual" name="Actual (estimated)" stroke="var(--primary)" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="dataset" name="Dataset prediction" stroke="var(--foreground)" strokeDasharray="5 5" dot={false} connectNulls />
                {showMl && <Line type="monotone" dataKey="ml" name="ML prediction (Random Forest)" stroke="var(--chart-4)" strokeWidth={2} dot={false} connectNulls />}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Recent readings" subtitle="Newest 25 readings in the current view">
          <TableShell minWidth={760}>
            <thead className="border-b border-border"><tr><th className={th}>Timestamp</th><th className={th}>Server</th><th className={th}>Actual</th><th className={th}>Dataset prediction</th><th className={th}>Difference</th>{rfModel && <><th className={th}>ML prediction</th><th className={th}>ML difference</th></>}</tr></thead>
            <tbody>
              {recent.map(({ r, ml, dsDiff, mlDiff }) => (
                <tr key={r.id} className="border-b border-border/60 last:border-0">
                  <td className={`${td} text-muted-foreground`}>{fmtDateTime(r.timestamp)}</td>
                  <td className={`${td} font-semibold`}>{r.serverId}</td>
                  <td className={td}>{fmtW(r.power)}</td>
                  <td className={td}>{r.predictedPower === null ? "—" : fmtW(r.predictedPower)}</td>
                  <td className={td}>{dsDiff === null ? "—" : `${dsDiff > 0 ? "+" : ""}${round(dsDiff)} W`}</td>
                  {rfModel && <><td className={td}>{ml === null ? "—" : fmtW(ml)}</td><td className={td}>{mlDiff === null ? "—" : `${mlDiff > 0 ? "+" : ""}${round(mlDiff)} W`}</td></>}
                </tr>
              ))}
            </tbody>
          </TableShell>
        </ChartCard>
      </div>
    </FilteredPage>
  );
}

function kpisActual(rows: { r: { power: number } }[]) {
  return avg(rows.map((x) => x.r.power));
}
