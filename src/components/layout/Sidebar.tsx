import { Link } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  FileText,
  HelpCircle,
  LayoutDashboard,
  Server,
  Settings,
  Sparkles,
  Zap,
} from "lucide-react";
import { useEnergy } from "@/lib/energy/store";
import { cn } from "@/lib/utils";

export const NAV_MAIN = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/live-monitoring", label: "Live Monitoring", icon: Activity },
  { to: "/power-analytics", label: "Power Analytics", icon: BarChart3 },
  { to: "/power-prediction", label: "Power Prediction", icon: Sparkles },
  { to: "/anomalies", label: "Anomalies", icon: AlertTriangle },
  { to: "/servers", label: "Servers", icon: Server },
  { to: "/reports", label: "Reports", icon: FileText },
] as const;

export const NAV_GENERAL = [
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/help", label: "Help", icon: HelpCircle },
] as const;

function NavItem({
  to,
  label,
  icon: Icon,
  badge,
  onNavigate,
}: {
  to: (typeof NAV_MAIN)[number]["to"] | (typeof NAV_GENERAL)[number]["to"];
  label: string;
  icon: typeof Zap;
  badge?: number | undefined;
  onNavigate?: (() => void) | undefined;
}) {
  return (
    <Link
      to={to}
      onClick={onNavigate}
      activeOptions={{ exact: to === "/" }}
      className="group relative flex items-center gap-3 rounded-r-xl py-2.5 pl-6 pr-3 text-[15px] font-medium text-sidebar-foreground transition-colors hover:text-foreground data-[status=active]:bg-sidebar-accent data-[status=active]:font-semibold data-[status=active]:text-foreground"
    >
      <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-primary opacity-0 transition-opacity group-data-[status=active]:opacity-100" />
      <Icon className="size-[18px] shrink-0" />
      <span className="flex-1 truncate">{label}</span>
      {badge ? (
        <span className="rounded-md bg-primary-deep px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}

export function SidebarContent({ onNavigate }: { onNavigate?: (() => void) | undefined }) {
  const { kpis, allRecords } = useEnergy();
  const anomalyCount = allRecords.filter((r) => r.anomalyStatus === "Anomaly").length;
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-6 pt-6 pb-2">
        <div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
          <Zap className="size-5" strokeWidth={2.4} />
        </div>
        <div className="min-w-0">
          <div className="text-lg font-bold leading-tight tracking-tight text-foreground">EnergyPulse</div>
          <div className="text-[11px] font-medium text-muted-foreground">Smart Server Monitor</div>
        </div>
      </div>

      <nav className="mt-6 flex-1 overflow-y-auto scrollbar-thin">
        <p className="px-6 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Menu</p>
        <div className="space-y-0.5 pr-4">
          {NAV_MAIN.map((n) => (
            <NavItem
              key={n.to}
              {...n}
              onNavigate={onNavigate}
              badge={n.to === "/anomalies" && anomalyCount ? anomalyCount : undefined}
            />
          ))}
        </div>
        <p className="mt-7 px-6 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">General</p>
        <div className="space-y-0.5 pr-4">
          {NAV_GENERAL.map((n) => (
            <NavItem key={n.to} {...n} onNavigate={onNavigate} />
          ))}
        </div>
      </nav>

      <div className="p-4">
        <div className="card-deep p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-primary-foreground/60">System Status</p>
          <div className="mt-2 flex items-center gap-2 text-sm font-semibold">
            <span className="relative flex size-2.5">
              <span className={cn("absolute inline-flex size-full animate-ping rounded-full bg-mint opacity-70", !kpis.records && "hidden")} />
              <span className={cn("relative inline-flex size-2.5 rounded-full", kpis.records ? "bg-mint" : "bg-warning")} />
            </span>
            {kpis.records ? "Monitoring Active" : "Awaiting Data"}
          </div>
          <p className="mt-1 text-xs text-primary-foreground/60">
            {kpis.servers} servers · {allRecords.length} records
          </p>
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-sidebar-border bg-sidebar lg:block">
      <SidebarContent />
    </aside>
  );
}
