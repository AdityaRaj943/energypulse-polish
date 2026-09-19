import type { DateRange, GlobalFilters, ServerRecord } from "./types";

export const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
export const max = (xs: number[]) => (xs.length ? Math.max(...xs) : 0);
export const min = (xs: number[]) => (xs.length ? Math.min(...xs) : 0);
export const round = (n: number, d = 1) => Math.round(n * 10 ** d) / 10 ** d;

export const fmtW = (n: number) => `${Math.round(n)} W`;
export const fmtPct = (n: number) => `${round(n, 1)}%`;
export const fmtKwh = (n: number) => `${round(n, 2)} kWh`;
export const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
export const fmtDateTime = (d: Date) =>
  `${fmtDate(d)} ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
export const fmtShort = (d: Date) => d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });

const RANGE_DAYS: Record<DateRange, number | null> = { "1d": 1, "7d": 7, "30d": 30, all: null, custom: null };

/** Date-range filter is relative to the newest timestamp in the dataset. */
export function filterByRange(records: ServerRecord[], range: DateRange) {
  const days = RANGE_DAYS[range];
  if (days === null || !records.length) return records;
  const latest = Math.max(...records.map((r) => r.timestamp.getTime()));
  const from = latest - days * 86400 * 1000;
  return records.filter((r) => r.timestamp.getTime() > from);
}

export function applyFilters(records: ServerRecord[], f: GlobalFilters) {
  let out = filterByRange(records, f.range);
  if (f.range === "custom") {
    const from = f.dateFrom ? new Date(`${f.dateFrom}T00:00:00`).getTime() : Number.NEGATIVE_INFINITY;
    const to = f.dateTo ? new Date(`${f.dateTo}T23:59:59.999`).getTime() : Number.POSITIVE_INFINITY;
    out = out.filter((r) => r.timestamp.getTime() >= from && r.timestamp.getTime() <= to);
  }
  if (f.server !== "all") out = out.filter((r) => r.serverId === f.server);
  if (f.department !== "all") out = out.filter((r) => r.department === f.department);
  if (f.environment !== "all") out = out.filter((r) => r.environment === f.environment);
  if (f.status === "normal") out = out.filter((r) => r.anomalyStatus === "Normal");
  if (f.status === "anomaly") out = out.filter((r) => r.anomalyStatus === "Anomaly");
  return out;
}

export const uniq = <T,>(xs: T[]) => Array.from(new Set(xs));

export function energyOf(r: ServerRecord) {
  return r.energyKwh ?? r.power / 1000;
}

export interface Kpis {
  servers: number;
  records: number;
  avgPower: number;
  peakPower: number;
  minPower: number;
  anomalies: number;
  anomalyRate: number;
  totalEnergy: number;
  avgCpu: number;
  avgMemory: number;
  avgDisk: number;
  avgNetwork: number;
  avgPredicted: number;
  topServer: { serverId: string; avgPower: number } | null;
  start: Date | null;
  end: Date | null;
}

export function computeKpis(records: ServerRecord[]): Kpis {
  const powers = records.map((r) => r.power);
  const anomalies = records.filter((r) => r.anomalyStatus === "Anomaly").length;
  const byServer = powerByServer(records);
  const top = byServer.length ? byServer.reduce((a, b) => (b.avgPower > a.avgPower ? b : a)) : null;
  const times = records.map((r) => r.timestamp.getTime());
  return {
    servers: uniq(records.map((r) => r.serverId)).length,
    records: records.length,
    avgPower: avg(powers),
    peakPower: max(powers),
    minPower: min(powers),
    anomalies,
    anomalyRate: records.length ? (anomalies / records.length) * 100 : 0,
    totalEnergy: sum(records.map(energyOf)),
    avgCpu: avg(records.map((r) => r.cpu)),
    avgMemory: avg(records.map((r) => r.memory)),
    avgDisk: avg(records.map((r) => r.disk)),
    avgNetwork: avg(records.map((r) => r.network)),
    avgPredicted: avg(records.map((r) => r.predictedPower).filter((v): v is number => v !== null)),
    topServer: top ? { serverId: top.serverId, avgPower: top.avgPower } : null,
    start: times.length ? new Date(Math.min(...times)) : null,
    end: times.length ? new Date(Math.max(...times)) : null,
  };
}

export interface ServerSummary {
  serverId: string;
  department: string;
  environment: string;
  records: number;
  avgCpu: number;
  avgMemory: number;
  avgDisk: number;
  avgNetwork: number;
  avgPower: number;
  peakPower: number;
  avgPredicted: number;
  avgDeviation: number;
  anomalies: number;
  energy: number;
  latest: ServerRecord;
  status: "Online" | "Warning" | "Anomaly";
}

export function summarizeServers(records: ServerRecord[]): ServerSummary[] {
  const groups = new Map<string, ServerRecord[]>();
  for (const r of records) {
    const g = groups.get(r.serverId);
    if (g) g.push(r);
    else groups.set(r.serverId, [r]);
  }
  return Array.from(groups.entries())
    .map(([serverId, rs]) => {
      const latest = rs[rs.length - 1]!;
      const anomalies = rs.filter((r) => r.anomalyStatus === "Anomaly").length;
      const predicted = rs.map((r) => r.predictedPower).filter((v): v is number => v !== null);
      const devs = rs.map((r) => r.deviation ?? (r.predictedPower !== null ? r.power - r.predictedPower : 0));
      const status: ServerSummary["status"] =
        anomalies > 0 ? "Anomaly" : latest.cpu > 85 || latest.memory > 85 ? "Warning" : "Online";
      return {
        serverId,
        department: latest.department,
        environment: latest.environment,
        records: rs.length,
        avgCpu: avg(rs.map((r) => r.cpu)),
        avgMemory: avg(rs.map((r) => r.memory)),
        avgDisk: avg(rs.map((r) => r.disk)),
        avgNetwork: avg(rs.map((r) => r.network)),
        avgPower: avg(rs.map((r) => r.power)),
        peakPower: max(rs.map((r) => r.power)),
        avgPredicted: avg(predicted),
        avgDeviation: avg(devs),
        anomalies,
        energy: sum(rs.map(energyOf)),
        latest,
        status,
      };
    })
    .sort((a, b) => a.serverId.localeCompare(b.serverId));
}

export function powerByServer(records: ServerRecord[]) {
  return summarizeServers(records).map((s) => ({
    serverId: s.serverId,
    avgPower: round(s.avgPower),
    peakPower: round(s.peakPower),
    anomalies: s.anomalies,
    energy: round(s.energy, 2),
  }));
}

/** Aggregate all records per timestamp (mean across servers). */
export function timeline(records: ServerRecord[]) {
  const groups = new Map<number, ServerRecord[]>();
  for (const r of records) {
    const k = r.timestamp.getTime();
    const g = groups.get(k);
    if (g) g.push(r);
    else groups.set(k, [r]);
  }
  return Array.from(groups.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([t, rs]) => {
      const pred = rs.map((r) => r.predictedPower).filter((v): v is number => v !== null);
      return {
        t,
        label: fmtShort(new Date(t)),
        power: round(avg(rs.map((r) => r.power))),
        predicted: pred.length ? round(avg(pred)) : null,
        peak: round(max(rs.map((r) => r.power))),
        cpu: round(avg(rs.map((r) => r.cpu))),
        memory: round(avg(rs.map((r) => r.memory))),
        disk: round(avg(rs.map((r) => r.disk))),
        network: round(avg(rs.map((r) => r.network))),
        energy: round(sum(rs.map(energyOf)), 2),
        anomalies: rs.filter((r) => r.anomalyStatus === "Anomaly").length,
      };
    });
}

export function anomalies(records: ServerRecord[]) {
  return records
    .filter((r) => r.anomalyStatus === "Anomaly")
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

export type Severity = "critical" | "warning" | "normal";

export function severityOf(r: ServerRecord): Severity {
  if (r.anomalyStatus !== "Anomaly") return "normal";
  const dev = r.deviation ?? (r.predictedPower !== null ? r.power - r.predictedPower : 0);
  const score = r.anomalyScore ?? 0;
  return dev >= 100 || score >= 0.7 ? "critical" : "warning";
}

export function predictionStats(records: ServerRecord[]) {
  const pairs = records.filter((r) => r.predictedPower !== null) as (ServerRecord & { predictedPower: number })[];
  if (!pairs.length) return null;
  const actual = avg(pairs.map((r) => r.power));
  const predicted = avg(pairs.map((r) => r.predictedPower));
  const mae = avg(pairs.map((r) => Math.abs(r.power - r.predictedPower)));
  const rmse = Math.sqrt(avg(pairs.map((r) => (r.power - r.predictedPower) ** 2)));
  const mape = avg(pairs.map((r) => Math.abs(r.power - r.predictedPower) / Math.max(r.power, 1))) * 100;
  return { actual, predicted, diff: actual - predicted, mae, rmse, accuracy: Math.max(0, 100 - mape), n: pairs.length };
}

/** Deviation between estimated and predicted power for a record (W). */
export function deviationOf(r: ServerRecord): number | null {
  if (r.deviation !== null) return r.deviation;
  return r.predictedPower !== null ? r.power - r.predictedPower : null;
}

export type ResourceKey = "cpu" | "memory" | "disk" | "network";
export const RESOURCES: { key: ResourceKey; label: string; unit: string }[] = [
  { key: "cpu", label: "CPU", unit: "%" },
  { key: "memory", label: "Memory", unit: "%" },
  { key: "disk", label: "Disk", unit: "%" },
  { key: "network", label: "Network", unit: "Mbps" },
];

/** Pearson correlation coefficient between two equally sized series. */
export function correlation(xs: number[], ys: number[]) {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return 0;
  const mx = avg(xs), my = avg(ys);
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i]! - mx, b = ys[i]! - my;
    num += a * b; dx += a * a; dy += b * b;
  }
  const den = Math.sqrt(dx * dy);
  return den ? num / den : 0;
}

/** Cumulative energy over time (kWh), aggregated per timestamp. */
export function energyOverTime(records: ServerRecord[]) {
  let running = 0;
  return timeline(records).map((p) => {
    running += p.energy;
    return { t: p.t, label: p.label, energy: p.energy, cumulative: round(running, 2) };
  });
}

/** Points for scatter plots: one per record. */
export function scatterPoints(records: ServerRecord[]) {
  return records.map((r) => ({
    id: r.id,
    t: r.timestamp.getTime(),
    serverId: r.serverId,
    cpu: r.cpu,
    memory: r.memory,
    disk: r.disk,
    network: r.network,
    power: round(r.power),
    predicted: r.predictedPower === null ? null : round(r.predictedPower),
    deviation: deviationOf(r) === null ? null : round(deviationOf(r)!),
    score: r.anomalyScore,
    anomaly: r.anomalyStatus === "Anomaly",
  }));
}

export type ScatterPoint = ReturnType<typeof scatterPoints>[number];
