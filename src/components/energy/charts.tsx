import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { ChartCard, Segmented } from "./shared";
import { useEnergy } from "@/lib/energy/store";
import {
  RESOURCES,
  correlation,
  energyOverTime,
  fmtDateTime,
  fmtKwh,
  fmtW,
  powerByServer,
  round,
  scatterPoints,
  timeline,
  type ResourceKey,
  type ScatterPoint,
} from "@/lib/energy/stats";
import type { ServerRecord } from "@/lib/energy/types";

const axis = { tickLine: false, axisLine: false, fontSize: 11, stroke: "var(--muted-foreground)" } as const;
const grid = <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" />;

function TipBox({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div className="rounded-xl border border-border bg-popover px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold">{title}</p>
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-4">
          <span className="text-muted-foreground">{k}</span>
          <span className="font-semibold">{v}</span>
        </div>
      ))}
    </div>
  );
}

type TimelinePoint = ReturnType<typeof timeline>[number];

/** Estimated vs predicted power over time (aggregated per timestamp). */
export function PowerTrendChart({ records, height = 288, area = true }: { records: ServerRecord[]; height?: number; area?: boolean }) {
  const { filters } = useEnergy();
  const points = useMemo(() => timeline(records), [records]);
  const serverLabel = filters.server !== "all" ? filters.server : "All servers (average)";
  const content = ({ active, payload }: { active?: boolean | undefined; payload?: readonly { payload?: unknown }[] | undefined }) => {
    if (!active || !payload?.length) return null;
    const p = payload[0]!.payload as TimelinePoint;
    const dev = p.predicted === null ? null : round(p.power - p.predicted);
    return (
      <TipBox
        title={fmtDateTime(new Date(p.t))}
        rows={[
          ["Server", serverLabel],
          ["Estimated power", fmtW(p.power)],
          ["Predicted power", p.predicted === null ? "—" : fmtW(p.predicted)],
          ["Power deviation", dev === null ? "—" : `${dev > 0 ? "+" : ""}${dev} W`],
        ]}
      />
    );
  };
  const Chart = area ? AreaChart : LineChart;
  return (
    <div style={{ height }} className="min-h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <Chart data={points} margin={{ top: 8, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="powerFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          {grid}
          <XAxis dataKey="label" {...axis} minTickGap={24} />
          <YAxis {...axis} unit=" W" width={58} domain={["auto", "auto"]} />
          <Tooltip content={content} />
          <Legend iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
          {area ? (
            <Area type="monotone" dataKey="power" name="Estimated power" stroke="var(--primary)" strokeWidth={2.5} fill="url(#powerFill)" />
          ) : (
            <Line type="monotone" dataKey="power" name="Estimated power" stroke="var(--primary)" strokeWidth={2.5} dot={false} />
          )}
          <Line type="monotone" dataKey="predicted" name="Predicted power" stroke="var(--foreground)" strokeWidth={1.8} strokeDasharray="5 5" dot={false} connectNulls />
        </Chart>
      </ResponsiveContainer>
    </div>
  );
}

type ServerMetric = "avgPower" | "peakPower" | "energy";
const serverMetricOpts: { value: ServerMetric; label: string }[] = [
  { value: "avgPower", label: "Average Power" },
  { value: "peakPower", label: "Peak Power" },
  { value: "energy", label: "Total Energy" },
];

export function ServerComparisonChart({ records, height = 300 }: { records: ServerRecord[]; height?: number }) {
  const [metric, setMetric] = useState<ServerMetric>("avgPower");
  const data = useMemo(() => powerByServer(records).sort((a, b) => b[metric] - a[metric]), [records, metric]);
  const isEnergy = metric === "energy";
  type Row = (typeof data)[number];
  const content = ({ active, payload }: { active?: boolean | undefined; payload?: readonly { payload?: unknown }[] | undefined }) => {
    if (!active || !payload?.length) return null;
    const s = payload[0]!.payload as Row;
    return (
      <TipBox
        title={s.serverId}
        rows={[
          ["Average power", fmtW(s.avgPower)],
          ["Peak power", fmtW(s.peakPower)],
          ["Total energy", fmtKwh(s.energy)],
          ["Anomalies", String(s.anomalies)],
        ]}
      />
    );
  };
  return (
    <ChartCard
      title="Estimated power by server"
      subtitle="Ranked from the currently filtered records"
      actions={<Segmented value={metric} onChange={setMetric} options={serverMetricOpts} />}
    >
      <div style={{ height }} className="min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 10, left: -10, bottom: 0 }} barCategoryGap="30%">
            {grid}
            <XAxis dataKey="serverId" {...axis} interval={0} angle={data.length > 6 ? -25 : 0} height={data.length > 6 ? 56 : 30} textAnchor={data.length > 6 ? "end" : "middle"} />
            <YAxis {...axis} unit={isEnergy ? " kWh" : " W"} width={64} />
            <Tooltip content={content} cursor={{ fill: "var(--muted)" }} />
            <Bar dataKey={metric} radius={[8, 8, 0, 0]} maxBarSize={48}>
              {data.map((d) => (
                <Cell key={d.serverId} fill={d.anomalies > 0 ? "var(--primary-deep)" : "var(--primary)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

const resourceOpts = RESOURCES.map((r) => ({ value: r.key, label: r.label }));

export function ResourceChart({ records, height = 280 }: { records: ServerRecord[]; height?: number }) {
  const [metric, setMetric] = useState<ResourceKey>("cpu");
  const points = useMemo(() => timeline(records), [records]);
  const res = RESOURCES.find((r) => r.key === metric)!;
  return (
    <ChartCard title="Resource utilization" subtitle={`${res.label} over time, averaged per timestamp`} actions={<Segmented value={metric} onChange={setMetric} options={resourceOpts} />}>
      <div style={{ height }} className="min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 8, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="resFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
              </linearGradient>
            </defs>
            {grid}
            <XAxis dataKey="label" {...axis} minTickGap={24} />
            <YAxis {...axis} unit={res.unit === "%" ? "%" : ""} width={50} />
            <Tooltip formatter={(v: number) => [`${v} ${res.unit}`, res.label]} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
            <Area type="monotone" dataKey={metric} name={res.label} stroke="var(--chart-2)" strokeWidth={2.5} fill="url(#resFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

export function ResourceScatterGrid({ records }: { records: ServerRecord[] }) {
  const pts = useMemo(() => scatterPoints(records), [records]);
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {RESOURCES.map((res) => {
        const r = correlation(pts.map((p) => p[res.key]), pts.map((p) => p.power));
        return (
          <ChartCard key={res.key} title={`${res.label} vs estimated power`} subtitle={`Pearson r = ${round(r, 2)} · correlation, not causation`}>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 8, right: 10, left: -10, bottom: 0 }}>
                  {grid}
                  <XAxis type="number" dataKey={res.key} name={res.label} unit={res.unit === "%" ? "%" : ""} {...axis} />
                  <YAxis type="number" dataKey="power" name="Power" unit=" W" {...axis} width={58} domain={["auto", "auto"]} />
                  <ZAxis range={[28, 28]} />
                  <Tooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const p = payload[0]!.payload as ScatterPoint;
                      return <TipBox title={p.serverId} rows={[[res.label, `${p[res.key]} ${res.unit}`], ["Estimated power", fmtW(p.power)], ["Status", p.anomaly ? "Anomaly" : "Normal"]]} />;
                    }}
                  />
                  <Scatter data={pts} fillOpacity={0.75}>
                    {pts.map((p) => (
                      <Cell key={p.id} fill={p.anomaly ? "var(--destructive)" : "var(--primary)"} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        );
      })}
    </div>
  );
}

export function AnomalyScatterChart({ records, onSelect, height = 320 }: { records: ServerRecord[]; onSelect: (r: ServerRecord) => void; height?: number }) {
  const pts = useMemo(() => scatterPoints(records), [records]);
  const normal = pts.filter((p) => !p.anomaly);
  const anomalous = pts.filter((p) => p.anomaly);
  const byId = useMemo(() => new Map(records.map((r) => [r.id, r])), [records]);
  const pick = (p: ScatterPoint) => {
    const r = byId.get(p.id);
    if (r) onSelect(r);
  };
  return (
    <div style={{ height }} className="min-h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 8, right: 10, left: -10, bottom: 0 }}>
          {grid}
          <XAxis type="number" dataKey="t" domain={["dataMin", "dataMax"]} tickFormatter={(t: number) => new Date(t).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} {...axis} />
          <YAxis type="number" dataKey="power" unit=" W" {...axis} width={58} domain={["auto", "auto"]} />
          <ZAxis range={[30, 30]} />
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0]!.payload as ScatterPoint;
              return (
                <TipBox
                  title={`${p.serverId} · ${fmtDateTime(new Date(p.t))}`}
                  rows={[
                    ["Estimated power", fmtW(p.power)],
                    ["Predicted power", p.predicted === null ? "—" : fmtW(p.predicted)],
                    ["Deviation", p.deviation === null ? "—" : `${p.deviation} W`],
                    ["Anomaly score", p.score === null ? "—" : String(p.score)],
                    ["Status", p.anomaly ? "Anomaly — click for details" : "Normal"],
                  ]}
                />
              );
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Scatter name="Normal readings" data={normal} fill="var(--primary)" fillOpacity={0.45} onClick={(p) => pick(p as unknown as ScatterPoint)} />
          <Scatter name="Anomalous readings" data={anomalous} fill="var(--destructive)" shape="diamond" onClick={(p) => pick(p as unknown as ScatterPoint)} className="cursor-pointer" />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

export function EnergyChart({ records, height = 260 }: { records: ServerRecord[]; height?: number }) {
  const data = useMemo(() => energyOverTime(records), [records]);
  return (
    <div style={{ height }} className="min-h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="energyFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-4)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--chart-4)" stopOpacity={0} />
            </linearGradient>
          </defs>
          {grid}
          <XAxis dataKey="label" {...axis} minTickGap={24} />
          <YAxis {...axis} unit=" kWh" width={64} />
          <Tooltip formatter={(v: number, name: string) => [`${v} kWh`, name]} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area type="monotone" dataKey="cumulative" name="Cumulative energy" stroke="var(--chart-4)" strokeWidth={2.5} fill="url(#energyFill)" />
          <Line type="monotone" dataKey="energy" name="Energy per interval" stroke="var(--primary)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Single-metric trend for server detail pages. */
export function TrendChart({ records, dataKey, label, unit, color = "var(--primary)", height = 200 }: { records: ServerRecord[]; dataKey: "power" | ResourceKey; label: string; unit: string; color?: string; height?: number }) {
  const data = useMemo(() => records.map((r) => ({ t: r.timestamp.getTime(), label: fmtDateTime(r.timestamp), value: round(r[dataKey]), anomaly: r.anomalyStatus === "Anomaly" })), [records, dataKey]);
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 10, left: -10, bottom: 0 }}>
          {grid}
          <XAxis dataKey="t" type="number" domain={["dataMin", "dataMax"]} tickFormatter={(t: number) => new Date(t).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} {...axis} minTickGap={24} />
          <YAxis {...axis} unit={unit === "%" ? "%" : ""} width={50} domain={["auto", "auto"]} />
          <Tooltip labelFormatter={(t: number) => fmtDateTime(new Date(t))} formatter={(v: number) => [`${v} ${unit}`, label]} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
          <Line type="monotone" dataKey="value" name={label} stroke={color} strokeWidth={2.2} dot={(p: { cx?: number; cy?: number; payload?: { anomaly: boolean }; index?: number }) => (p.payload?.anomaly ? <circle key={p.index} cx={p.cx} cy={p.cy} r={4} fill="var(--destructive)" /> : <g key={p.index} />)} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
