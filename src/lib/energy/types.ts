export type AnomalyStatus = "Normal" | "Anomaly";

export interface ServerRecord {
  id: number;
  timestamp: Date;
  serverId: string;
  department: string;
  environment: string;
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  power: number; // Estimated_Power_W
  anomalyScore: number | null;
  anomalyStatus: AnomalyStatus;
  alert: string;
  predictedPower: number | null; // Predicted_Power_W (demo prediction from dataset)
  deviation: number | null; // Power_Deviation_W
  energyKwh: number | null; // Energy_kWh_Approx
}

/**
 * Data sources supported by the app. Excel/CSV import is the current source;
 * "live" is reserved for a future psutil-backed collector that pushes the same
 * ServerRecord shape into the store.
 */
export type DataSourceKind = "excel" | "live" | "none";

export interface DataSourceInfo {
  kind: DataSourceKind;
  label: string;
  fileName?: string;
  importedAt?: Date;
}

export type DateRange = "1d" | "7d" | "30d" | "all" | "custom";

export interface GlobalFilters {
  range: DateRange;
  server: string; // "all" or Server_ID
  department: string; // "all" or Department
  environment: string; // "all" or Environment
  status: "all" | "normal" | "anomaly";
  dateFrom: string;
  dateTo: string;
}

/** Columns that must be present for an import to succeed. */
export const REQUIRED_COLUMNS = [
  "Timestamp",
  "Server_ID",
  "CPU_Usage_%",
  "Memory_Usage_%",
  "Disk_Usage_%",
  "Network_Usage_Mbps",
  "Estimated_Power_W",
] as const;

/** Columns that enrich the dashboard when present but are not mandatory. */
export const OPTIONAL_COLUMNS = [
  "Department",
  "Environment",
  "Anomaly_Score",
  "Anomaly_Status",
  "Alert",
  "Predicted_Power_W",
  "Power_Deviation_W",
  "Energy_kWh_Approx",
] as const;

/** Where anomaly flags/scores currently come from. */
export type AnomalySource = "dataset" | "ml";

export interface ImportSummary {
  records: number;
  servers: number;
  start: Date;
  end: Date;
  fileName: string;
  anomalies: number;
}
