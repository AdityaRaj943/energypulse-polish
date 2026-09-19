import { Link } from "@tanstack/react-router";
import { BellRing } from "lucide-react";
import { SeverityBadge, SourceBadge } from "./shared";
import { useEnergy } from "@/lib/energy/store";
import { anomalies, deviationOf, fmtDateTime, fmtW, round, severityOf } from "@/lib/energy/stats";
import type { ServerRecord } from "@/lib/energy/types";

export function AlertsList({ records, limit, onSelect, compact = false }: { records: ServerRecord[]; limit?: number; onSelect?: (r: ServerRecord) => void; compact?: boolean }) {
  const { anomalySource } = useEnergy();
  const rows = limit ? anomalies(records).slice(0, limit) : anomalies(records);
  if (!rows.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl bg-muted/60 py-10 text-center">
        <BellRing className="size-6 text-muted-foreground" />
        <p className="mt-2 text-sm font-semibold">No alerts in the current view</p>
        <p className="text-xs text-muted-foreground">All readings are within the expected range.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2.5">
      {!compact && (
        <div className="flex justify-end">
          <SourceBadge source={anomalySource} />
        </div>
      )}
      {rows.map((r) => {
        const sev = severityOf(r);
        const dev = deviationOf(r);
        return (
          <button
            key={r.id}
            onClick={() => onSelect?.(r)}
            className="flex w-full flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3.5 text-left transition-colors hover:bg-accent"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <SeverityBadge severity={sev} />
                <Link to="/servers/$serverId" params={{ serverId: r.serverId }} className="font-semibold hover:text-primary" onClick={(e) => e.stopPropagation()}>
                  {r.serverId}
                </Link>
                <span className="text-xs text-muted-foreground">{r.alert || "Unusual estimated power behavior"}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{fmtDateTime(r.timestamp)}</p>
            </div>
            {!compact && (
              <div className="grid grid-cols-4 gap-4 text-right text-xs">
                <div><p className="text-muted-foreground">Power</p><p className="font-semibold">{fmtW(r.power)}</p></div>
                <div><p className="text-muted-foreground">Predicted</p><p className="font-semibold">{r.predictedPower === null ? "—" : fmtW(r.predictedPower)}</p></div>
                <div><p className="text-muted-foreground">Deviation</p><p className="font-semibold">{dev === null ? "—" : `${dev > 0 ? "+" : ""}${round(dev)} W`}</p></div>
                <div><p className="text-muted-foreground">Score</p><p className="font-semibold">{r.anomalyScore ?? "—"}</p></div>
              </div>
            )}
            {compact && <span className="text-sm font-bold">{fmtW(r.power)}</span>}
          </button>
        );
      })}
    </div>
  );
}
