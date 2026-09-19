import { Activity, AlertTriangle, ArrowDown, Gauge, TrendingUp, Zap } from "lucide-react";
import { useEnergy } from "@/lib/energy/store";
import { fmtKwh, fmtPct, fmtW, predictionStats, round } from "@/lib/energy/stats";
import { EnergyChart, PowerTrendChart, ResourceChart, ResourceScatterGrid, ServerComparisonChart } from "../charts";
import { ChartCard, FilteredPage, Metric } from "../shared";

export function PowerAnalyticsPage() {
  const { records, kpis } = useEnergy();
  const pred = predictionStats(records);
  return (
    <FilteredPage>
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <Metric icon={Zap} label="Average power" value={fmtW(kpis.avgPower)} />
          <Metric icon={TrendingUp} label="Peak power" value={fmtW(kpis.peakPower)} />
          <Metric icon={ArrowDown} label="Minimum power" value={fmtW(kpis.minPower)} />
          <Metric icon={Gauge} label="Total energy" value={fmtKwh(kpis.totalEnergy)} />
          <Metric icon={Activity} label="Power deviation" value={pred ? `${pred.diff > 0 ? "+" : ""}${round(pred.diff)} W` : "—"} detail={pred ? `MAE ${round(pred.mae)} W vs dataset prediction` : "No predicted values"} />
          <Metric icon={AlertTriangle} label="Anomaly count" value={String(kpis.anomalies)} detail={fmtPct(kpis.anomalyRate)} tone="text-destructive" />
        </div>

        <ChartCard title="Estimated power over time" subtitle="Estimated vs predicted power, averaged per timestamp">
          <PowerTrendChart records={records} height={320} area={false} />
        </ChartCard>

        <div className="grid gap-6 xl:grid-cols-2">
          <ServerComparisonChart records={records} />
          <ChartCard title="Energy consumption over time" subtitle="Energy per interval and cumulative kWh (Energy_kWh_Approx)">
            <EnergyChart records={records} height={300} />
          </ChartCard>
        </div>

        <ResourceChart records={records} height={300} />

        <div>
          <h2 className="mb-1 text-lg font-bold">Resource vs estimated power</h2>
          <p className="mb-4 text-sm text-muted-foreground">Each point is one reading. Pearson r describes linear correlation only — it is not evidence of causation.</p>
          <ResourceScatterGrid records={records} />
        </div>
      </div>
    </FilteredPage>
  );
}
