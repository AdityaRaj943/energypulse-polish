import type { ServerRecord } from "./types";
import { REQUIRED_COLUMNS } from "./types";

type RawRow = Record<string, unknown>;

export class ImportValidationError extends Error {
  missing: string[];
  constructor(missing: string[]) {
    super(`Missing required columns: ${missing.join(", ")}`);
    this.missing = missing;
  }
}

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, "").replace(/[^0-9.+-eE]/g, ""));
  return Number.isFinite(n) ? n : null;
};

const str = (v: unknown): string => (v === null || v === undefined ? "" : String(v).trim());

const parseDate = (v: unknown): Date | null => {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if (typeof v === "number") {
    // Excel serial date
    const ms = Math.round((v - 25569) * 86400 * 1000);
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const s = str(v);
  if (!s) return null;
  const d = new Date(s.replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? null : d;
};

/** Normalise header names so "CPU Usage %" and "cpu_usage_%" both match. */
const normKey = (k: string) => k.toLowerCase().replace(/[\s\-]+/g, "_").replace(/%/g, "%").trim();

function buildLookup(row: RawRow) {
  const map = new Map<string, string>();
  for (const k of Object.keys(row)) map.set(normKey(k), k);
  return (name: string) => {
    const k = map.get(normKey(name));
    return k === undefined ? undefined : row[k];
  };
}

export function rowsToRecords(rows: RawRow[]): ServerRecord[] {
  if (!rows.length) throw new Error("The file contains no data rows.");
  const firstRow = rows[0];
  if (!firstRow) throw new Error("The file contains no data rows.");
  const headers = new Set(Object.keys(firstRow).map(normKey));
  const missing = REQUIRED_COLUMNS.filter((c) => !headers.has(normKey(c)));
  if (missing.length) throw new ImportValidationError(missing);

  const out: ServerRecord[] = [];
  const invalidRows: string[] = [];
  rows.forEach((row, i) => {
    const get = buildLookup(row);
    const ts = parseDate(get("Timestamp"));
    const serverId = str(get("Server_ID"));
    const power = num(get("Estimated_Power_W"));
    const numericColumns = ["CPU_Usage_%", "Memory_Usage_%", "Disk_Usage_%", "Network_Usage_Mbps", "Anomaly_Score", "Predicted_Power_W", "Power_Deviation_W", "Energy_kWh_Approx"];
    const hasInvalidNumeric = numericColumns.some((key) => {
      const value = get(key);
      return value !== undefined && value !== null && value !== "" && num(value) === null;
    });
    if (!ts || !serverId || power === null || hasInvalidNumeric) {
      invalidRows.push(`Row ${i + 2}`);
      return;
    }
    const statusRaw = str(get("Anomaly_Status")).toLowerCase();
    out.push({
      id: i,
      timestamp: ts,
      serverId,
      department: str(get("Department")) || "Unassigned",
      environment: str(get("Environment")) || "Unknown",
      cpu: num(get("CPU_Usage_%")) ?? 0,
      memory: num(get("Memory_Usage_%")) ?? 0,
      disk: num(get("Disk_Usage_%")) ?? 0,
      network: num(get("Network_Usage_Mbps")) ?? 0,
      power,
      anomalyScore: num(get("Anomaly_Score")),
      anomalyStatus: statusRaw.startsWith("anom") ? "Anomaly" : "Normal",
      alert: str(get("Alert")),
      predictedPower: num(get("Predicted_Power_W")),
      deviation: num(get("Power_Deviation_W")),
      energyKwh: num(get("Energy_kWh_Approx")),
    });
  });
  if (!out.length) throw new Error("No valid rows could be parsed. Check timestamps, server IDs, and numeric values.");
  return out.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

/** Parse an uploaded .xlsx/.xls/.csv file in the browser using SheetJS. */
export async function parseWorkbookFile(file: File): Promise<ServerRecord[]> {
  const XLSX = await import("xlsx");
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  // Prefer a sheet that has the required columns; fall back to the first non-empty sheet.
  let rows: RawRow[] = [];
  for (const name of wb.SheetNames) {
    const candidate = XLSX.utils.sheet_to_json<RawRow>(wb.Sheets[name]!, { defval: "" });
    if (!candidate.length) continue;
    const headers = new Set(Object.keys(candidate[0]!).map(normKey));
    if (REQUIRED_COLUMNS.every((c) => headers.has(normKey(c)))) {
      rows = candidate;
      break;
    }
    if (!rows.length) rows = candidate;
  }
  if (!rows.length) throw new Error("The workbook contains no data rows on any sheet.");
  return rowsToRecords(rows);
}
