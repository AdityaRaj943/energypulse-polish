import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, Menu, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useEnergy } from "@/lib/energy/store";
import { anomalies, fmtDateTime } from "@/lib/energy/stats";
import { SidebarContent, NAV_MAIN } from "./Sidebar";

export function Header() {
  const { allRecords, servers, kpis } = useEnergy();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const alerts = anomalies(allRecords).slice(0, 5);
  const activeAnomalies = anomalies(allRecords).length;

  const query = q.trim().toLowerCase();
  const results = query
    ? [
        ...servers.filter((s) => s.toLowerCase().includes(query)).slice(0, 5).map((s) => ({ type: "Server", label: s, to: "/servers/$serverId" as const, params: { serverId: s } })),
        ...NAV_MAIN.filter((n) => n.label.toLowerCase().includes(query)).map((n) => ({ type: "Page", label: n.label, to: n.to, params: undefined })),
        ...(("anomaly".includes(query) || "alert".includes(query)) ? [{ type: "Alerts", label: `${activeAnomalies} energy alerts`, to: "/anomalies" as const, params: undefined }] : []),
      ]
    : [];

  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-[72px] max-w-[1600px] items-center gap-3 px-4 sm:px-6">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
          <Menu />
        </Button>

        <div className="relative min-w-0 flex-1 max-w-xl">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search servers, metrics, alerts..."
            className="h-11 w-full rounded-full border border-border bg-card pl-11 pr-10 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/30"
          />
          {q && (
            <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-label="Clear search">
              <X className="size-4" />
            </button>
          )}
          {results.length > 0 && (
            <div className="absolute left-0 right-0 top-12 z-40 overflow-hidden rounded-2xl border border-border bg-popover shadow-lg">
              {results.map((r, i) => (
                <button
                  key={i}
                  className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-accent"
                  onClick={() => {
                    setQ("");
                    if (r.params) navigate({ to: r.to, params: r.params });
                    else navigate({ to: r.to });
                  }}
                >
                  <span className="font-medium">{r.label}</span>
                  <span className="text-xs text-muted-foreground">{r.type}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold md:flex">
            <span className={`size-2 rounded-full ${kpis.records ? "bg-success" : "bg-warning"}`} />
            {kpis.records ? "All systems monitored" : "No data source"}
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <button className="relative grid size-11 place-items-center rounded-full border border-border bg-card text-foreground hover:bg-accent" aria-label="Notifications">
                <Bell className="size-[18px]" />
                {activeAnomalies > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground ring-2 ring-background">
                    {activeAnomalies}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 rounded-2xl p-2">
              <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Energy alerts</p>
              {alerts.length === 0 ? (
                <p className="px-2 py-4 text-sm text-muted-foreground">No active anomalies.</p>
              ) : (
                alerts.map((a) => (
                  <Link
                    key={a.id}
                    to="/anomalies"
                    className="block rounded-xl px-2 py-2 hover:bg-accent"
                  >
                    <div className="flex items-center justify-between text-sm font-semibold">
                      <span>{a.serverId}</span>
                      <span className="text-destructive">{Math.round(a.power)} W</span>
                    </div>
                    <div className="text-xs text-muted-foreground">{a.alert || "Anomaly detected"} · {fmtDateTime(a.timestamp)}</div>
                  </Link>
                ))
              )}
            </PopoverContent>
          </Popover>

          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-full bg-primary-deep text-sm font-bold text-primary-foreground">SA</div>
            <div className="hidden leading-tight sm:block">
              <div className="text-sm font-semibold">System Administrator</div>
              <div className="text-xs text-muted-foreground">Administrator</div>
            </div>
          </div>
        </div>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarContent onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </header>
  );
}
