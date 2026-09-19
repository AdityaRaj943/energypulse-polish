import type { ReactNode } from "react";
import { FilterX, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/data/EmptyState";
import { GlobalFilterBar } from "@/components/data/GlobalFilters";
import { useEnergy } from "@/lib/energy/store";
import type { Severity, ServerSummary } from "@/lib/energy/stats";
import { cn } from "@/lib/utils";

export function Metric({
  icon: Icon,
  label,
  value,
  detail,
  tone = "text-primary",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail?: string;
  tone?: string;
}) {
  return (
    <div className="card-surface p-5 transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className={cn("grid size-9 place-items-center rounded-xl bg-primary-soft", tone)}>
          <Icon className="size-[18px]" />
        </span>
      </div>
      <p className="mt-4 text-2xl font-bold tracking-tight">{value}</p>
      {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
    </div>
  );
}

export function MiniStat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl bg-muted p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1.5 text-xl font-bold tracking-tight">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function ChartCard({
  title,
  subtitle,
  actions,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("card-surface p-5", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-bold">{title}</h2>
          {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

/** Small pill group used for metric switching inside chart cards. */
export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div role="tablist" className="inline-flex rounded-full bg-muted p-1 text-xs font-semibold">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-full px-3 py-1.5 transition-colors",
            value === o.value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const severityCls: Record<Severity, string> = {
  critical: "bg-danger-soft text-destructive",
  warning: "bg-warning-soft text-warning-foreground",
  normal: "bg-success-soft text-primary",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize", severityCls[severity])}>{severity}</span>;
}

const statusCls: Record<ServerSummary["status"], string> = {
  Anomaly: "bg-danger-soft text-destructive",
  Warning: "bg-warning-soft text-warning-foreground",
  Online: "bg-success-soft text-primary",
};

export function StatusBadge({ status }: { status: ServerSummary["status"] }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold", statusCls[status])}>
      <span className="size-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

export function SourceBadge({ source }: { source: "dataset" | "ml" }) {
  return (
    <span className="inline-flex rounded-full border border-border bg-card px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
      Source: {source === "ml" ? "ML (Isolation Forest)" : "Dataset columns"}
    </span>
  );
}

export function NoMatch() {
  const { resetFilters } = useEnergy();
  return (
    <div className="card-surface flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="grid size-14 place-items-center rounded-full bg-muted text-muted-foreground">
        <FilterX className="size-7" />
      </div>
      <h2 className="mt-4 text-lg font-bold">No records match the selected filters.</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">Try widening the date range or clearing one of the active filters.</p>
      <Button className="mt-5" variant="outline" onClick={resetFilters}>
        Clear Filters
      </Button>
    </div>
  );
}

/**
 * Wraps page content with the global filter bar and the shared empty states:
 * no dataset → import prompt, dataset but zero filtered rows → clear-filters prompt.
 */
export function FilteredPage({ children, filters = true }: { children: ReactNode; filters?: boolean }) {
  const { allRecords, records } = useEnergy();
  return (
    <>
      {filters && allRecords.length > 0 && <GlobalFilterBar />}
      {!allRecords.length ? <EmptyState /> : !records.length ? <NoMatch /> : children}
    </>
  );
}

export function TableShell({ children, minWidth = 900 }: { children: ReactNode; minWidth?: number }) {
  return (
    <div className="-mx-5 overflow-x-auto px-5">
      <table className="w-full text-left text-sm" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

export const th = "px-3 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground";
export const td = "px-3 py-3 align-middle";
