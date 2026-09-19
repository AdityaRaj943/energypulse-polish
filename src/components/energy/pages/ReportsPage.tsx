import { useMemo, useState } from "react";
import { FileDown, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useEnergy } from "@/lib/energy/store";
import { exportCsv, exportPdf, reportSummaryRows } from "@/lib/energy/report";
import { fmtPct, fmtW, summarizeServers } from "@/lib/energy/stats";
import { ChartCard, FilteredPage, StatusBadge, TableShell, td, th } from "../shared";

export function ReportsPage() {
  const { records, kpis, filters, source, anomalySource, filtersActive } = useEnergy();
  const [busy, setBusy] = useState(false);
  const input = useMemo(() => ({ records, kpis, filters, sourceName: source.fileName ?? source.label, anomalySource }), [records, kpis, filters, source, anomalySource]);
  const rows = useMemo(() => reportSummaryRows(input), [input]);
  const servers = useMemo(() => summarizeServers(records).sort((a, b) => b.avgPower - a.avgPower), [records]);

  const onCsv = () => {
    exportCsv(input);
    toast.success(`CSV exported (${records.length} records)`);
  };
  const onPdf = async () => {
    setBusy(true);
    try {
      await exportPdf(input);
      toast.success("PDF report generated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "PDF generation failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <FilteredPage>
      <div className="space-y-6">
        <ChartCard
          title="Energy report"
          subtitle={filtersActive ? "Built from the currently filtered dataset" : "Built from the full dataset (no filters active)"}
          actions={
            <>
              <Button variant="outline" onClick={onCsv}><FileDown /> Export CSV</Button>
              <Button variant="deep" onClick={() => void onPdf()} disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <FileText />} Generate PDF</Button>
            </>
          }
        >
          <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {rows.map(([k, v]) => (
              <div key={k} className="rounded-xl bg-muted p-4">
                <dt className="text-xs text-muted-foreground">{k}</dt>
                <dd className="mt-1 break-words font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
        </ChartCard>

        <ChartCard title="Servers in this report" subtitle="Ranked by average estimated power">
          <TableShell minWidth={760}>
            <thead className="border-b border-border"><tr><th className={th}>Server</th><th className={th}>Department</th><th className={th}>Environment</th><th className={th}>Readings</th><th className={th}>Avg power</th><th className={th}>Peak</th><th className={th}>Avg CPU</th><th className={th}>Anomalies</th><th className={th}>Status</th></tr></thead>
            <tbody>
              {servers.map((s) => (
                <tr key={s.serverId} className="border-b border-border/60 last:border-0">
                  <td className={`${td} font-semibold`}>{s.serverId}</td><td className={td}>{s.department}</td><td className={td}>{s.environment}</td><td className={td}>{s.records}</td>
                  <td className={td}>{fmtW(s.avgPower)}</td><td className={td}>{fmtW(s.peakPower)}</td><td className={td}>{fmtPct(s.avgCpu)}</td><td className={td}>{s.anomalies}</td><td className={td}><StatusBadge status={s.status} /></td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        </ChartCard>
      </div>
    </FilteredPage>
  );
}
