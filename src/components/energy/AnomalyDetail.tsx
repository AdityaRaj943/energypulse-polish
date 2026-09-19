import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SeverityBadge, SourceBadge } from "./shared";
import { useEnergy } from "@/lib/energy/store";
import { deviationOf, fmtDateTime, fmtPct, fmtW, round, severityOf } from "@/lib/energy/stats";
import type { ServerRecord } from "@/lib/energy/types";

export function AnomalyDetail({ record, onClose }: { record: ServerRecord | null; onClose: () => void }) {
  const { anomalySource } = useEnergy();
  const dev = record ? deviationOf(record) : null;
  return (
    <Sheet open={!!record} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        {record && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">Reading detail <SeverityBadge severity={severityOf(record)} /></SheetTitle>
              <SheetDescription>{fmtDateTime(record.timestamp)}</SheetDescription>
            </SheetHeader>
            <div className="mt-2 px-4 pb-6">
              <SourceBadge source={anomalySource} />
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                {(
                  [
                    ["Server ID", record.serverId],
                    ["Timestamp", fmtDateTime(record.timestamp)],
                    ["Department", record.department],
                    ["Environment", record.environment],
                    ["Estimated power", fmtW(record.power)],
                    ["Predicted power", record.predictedPower === null ? "—" : fmtW(record.predictedPower)],
                    ["Power deviation", dev === null ? "—" : `${dev > 0 ? "+" : ""}${round(dev)} W`],
                    ["Anomaly score", record.anomalyScore === null ? "—" : String(record.anomalyScore)],
                    ["CPU", fmtPct(record.cpu)],
                    ["Memory", fmtPct(record.memory)],
                    ["Disk", fmtPct(record.disk)],
                    ["Network", `${round(record.network)} Mbps`],
                  ] as [string, string][]
                ).map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-muted p-3">
                    <dt className="text-xs text-muted-foreground">{k}</dt>
                    <dd className="mt-0.5 font-semibold">{v}</dd>
                  </div>
                ))}
                <div className="col-span-2 rounded-xl bg-muted p-3">
                  <dt className="text-xs text-muted-foreground">Alert</dt>
                  <dd className="mt-0.5 font-semibold">{record.alert || "No alert text supplied"}</dd>
                </div>
              </dl>
              <Button asChild variant="deep" className="mt-5 w-full">
                <Link to="/servers/$serverId" params={{ serverId: record.serverId }}>Open server detail</Link>
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
