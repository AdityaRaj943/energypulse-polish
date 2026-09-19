import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import demoRows from "@/data/demo-dataset.json";
import { rowsToRecords, parseWorkbookFile } from "./parse";
import { applyFilters, computeKpis, uniq, type Kpis } from "./stats";
import {
  anomalyScore,
  predictPower,
  trainIsolationForest,
  trainRandomForest,
  type IsolationForestModel,
  type RandomForestModel,
} from "./ml";
import type { AnomalySource, DataSourceInfo, GlobalFilters, ImportSummary, ServerRecord } from "./types";

const STORAGE_KEY = "energypulse.dataset.v1";

interface StoredDataset {
  source: DataSourceInfo;
  rows: Record<string, unknown>[];
}

export type AnomalyMode = AnomalySource;

interface EnergyState {
  /** Records exactly as imported (dataset anomaly columns). */
  datasetRecords: ServerRecord[];
  /** Records with anomaly flags from the active anomaly source (dataset or ML). */
  allRecords: ServerRecord[];
  /** Filtered view of allRecords — every page, chart and KPI reads from this. */
  records: ServerRecord[];
  kpis: Kpis;
  filters: GlobalFilters;
  setFilters: (patch: Partial<GlobalFilters>) => void;
  resetFilters: () => void;
  filtersActive: boolean;
  servers: string[];
  departments: string[];
  environments: string[];
  source: DataSourceInfo;
  importFile: (file: File) => Promise<ImportSummary>;
  clearData: () => void;
  loadDemo: () => void;
  importing: boolean;
  hydrated: boolean;
  // ML
  rfModel: RandomForestModel | null;
  ifModel: IsolationForestModel | null;
  training: boolean;
  trainError: string | null;
  trainModels: () => Promise<void>;
  /** Predict estimated power for a record with the trained Random Forest (null if untrained). */
  mlPredict: (r: ServerRecord) => number | null;
  anomalyMode: AnomalyMode;
  /** The source actually in effect (falls back to dataset when no ML model exists). */
  anomalySource: AnomalySource;
  setAnomalyMode: (m: AnomalyMode) => void;
  importOpen: boolean;
  setImportOpen: (v: boolean) => void;
}

const DEFAULT_FILTERS: GlobalFilters = {
  range: "all",
  server: "all",
  department: "all",
  environment: "all",
  status: "all",
  dateFrom: "",
  dateTo: "",
};

const demoSource: DataSourceInfo = {
  kind: "excel",
  label: "Excel dataset",
  fileName: "Smart_Server_Energy_Demo_Data.xlsx",
};

const EnergyContext = createContext<EnergyState | null>(null);

let demoCache: ServerRecord[] | null = null;
function demoRecords() {
  if (!demoCache) demoCache = rowsToRecords(demoRows as Record<string, unknown>[]);
  return demoCache;
}

function summarize(records: ServerRecord[], fileName: string): ImportSummary {
  const times = records.map((r) => r.timestamp.getTime());
  return {
    records: records.length,
    servers: uniq(records.map((r) => r.serverId)).length,
    start: new Date(Math.min(...times)),
    end: new Date(Math.max(...times)),
    fileName,
    anomalies: records.filter((r) => r.anomalyStatus === "Anomaly").length,
  };
}

/** Re-label records with Isolation Forest results so downstream stats stay source-agnostic. */
function applyMlAnomalies(records: ServerRecord[], model: IsolationForestModel): ServerRecord[] {
  return records.map((r) => {
    const score = anomalyScore(model, r);
    const isAnomaly = score >= model.threshold;
    return {
      ...r,
      anomalyScore: Math.round(score * 1000) / 1000,
      anomalyStatus: isAnomaly ? "Anomaly" : "Normal",
      alert: isAnomaly ? "Isolation Forest flagged unusual resource/power pattern" : "",
    };
  });
}

export function EnergyProvider({ children }: { children: ReactNode }) {
  const [datasetRecords, setDatasetRecords] = useState<ServerRecord[]>(demoRecords);
  const [source, setSource] = useState<DataSourceInfo>(demoSource);
  const [filters, setFiltersState] = useState<GlobalFilters>(DEFAULT_FILTERS);
  const [importing, setImporting] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [rfModel, setRf] = useState<RandomForestModel | null>(null);
  const [ifModel, setIf] = useState<IsolationForestModel | null>(null);
  const [training, setTraining] = useState(false);
  const [trainError, setTrainError] = useState<string | null>(null);
  const [anomalyMode, setAnomalyMode] = useState<AnomalyMode>("dataset");
  const [importOpen, setImportOpen] = useState(false);

  // Restore a previously imported dataset (client only, after hydration).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const stored = JSON.parse(raw) as StoredDataset;
        if (stored.source.kind === "none") {
          setDatasetRecords([]);
          setSource(stored.source);
        } else if (stored.rows?.length) {
          setDatasetRecords(rowsToRecords(stored.rows));
          setSource(stored.source.importedAt ? { ...stored.source, importedAt: new Date(stored.source.importedAt) } : stored.source);
        }
      }
    } catch {
      /* ignore corrupt storage */
    }
    setHydrated(true);
  }, []);

  const persist = (rows: Record<string, unknown>[], src: DataSourceInfo) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ source: src, rows } satisfies StoredDataset));
    } catch {
      /* storage full — keep in memory only */
    }
  };

  const resetModels = () => {
    setRf(null);
    setIf(null);
    setTrainError(null);
    setAnomalyMode("dataset");
  };

  const importFile = useCallback(async (file: File) => {
    setImporting(true);
    try {
      const recs = await parseWorkbookFile(file);
      const src: DataSourceInfo = { kind: "excel", label: "Excel dataset", fileName: file.name, importedAt: new Date() };
      setDatasetRecords(recs);
      setSource(src);
      resetModels();
      setFiltersState(DEFAULT_FILTERS);
      persist(recs.map(toRow), src);
      return summarize(recs, file.name);
    } finally {
      setImporting(false);
    }
  }, []);

  const clearData = useCallback(() => {
    setDatasetRecords([]);
    resetModels();
    setFiltersState(DEFAULT_FILTERS);
    const src: DataSourceInfo = { kind: "none", label: "No data" };
    setSource(src);
    persist([], src);
  }, []);

  const loadDemo = useCallback(() => {
    setDatasetRecords(demoRecords());
    setSource(demoSource);
    resetModels();
    setFiltersState(DEFAULT_FILTERS);
    window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  const trainModels = useCallback(async () => {
    setTraining(true);
    setTrainError(null);
    // Yield to the UI so the loading state paints before the CPU-heavy work.
    await new Promise((r) => setTimeout(r, 60));
    try {
      const rf = trainRandomForest(datasetRecords);
      const iso = trainIsolationForest(datasetRecords);
      setRf(rf);
      setIf(iso);
    } catch (e) {
      setTrainError(e instanceof Error ? e.message : "Training failed.");
    } finally {
      setTraining(false);
    }
  }, [datasetRecords]);

  const mlPredict = useCallback((r: ServerRecord) => (rfModel ? predictPower(rfModel, r) : null), [rfModel]);

  const setFilters = useCallback((patch: Partial<GlobalFilters>) => setFiltersState((f) => ({ ...f, ...patch })), []);
  const resetFilters = useCallback(() => setFiltersState(DEFAULT_FILTERS), []);

  const anomalySource: AnomalySource = anomalyMode === "ml" && ifModel ? "ml" : "dataset";
  const allRecords = useMemo(
    () => (anomalySource === "ml" && ifModel ? applyMlAnomalies(datasetRecords, ifModel) : datasetRecords),
    [datasetRecords, ifModel, anomalySource],
  );
  const records = useMemo(() => applyFilters(allRecords, filters), [allRecords, filters]);
  const kpis = useMemo(() => computeKpis(records), [records]);
  const servers = useMemo(() => uniq(datasetRecords.map((r) => r.serverId)).sort(), [datasetRecords]);
  const departments = useMemo(() => uniq(datasetRecords.map((r) => r.department)).sort(), [datasetRecords]);
  const environments = useMemo(() => uniq(datasetRecords.map((r) => r.environment)).sort(), [datasetRecords]);
  const filtersActive =
    filters.range !== "all" || filters.server !== "all" || filters.department !== "all" || filters.environment !== "all" || filters.status !== "all";

  const value: EnergyState = {
    datasetRecords,
    allRecords,
    records,
    kpis,
    filters,
    setFilters,
    resetFilters,
    filtersActive,
    servers,
    departments,
    environments,
    source,
    importFile,
    clearData,
    loadDemo,
    importing,
    hydrated,
    rfModel,
    ifModel,
    training,
    trainError,
    trainModels,
    mlPredict,
    anomalyMode,
    anomalySource,
    setAnomalyMode,
    importOpen,
    setImportOpen,
  };

  return <EnergyContext.Provider value={value}>{children}</EnergyContext.Provider>;
}

export function useEnergy() {
  const ctx = useContext(EnergyContext);
  if (!ctx) throw new Error("useEnergy must be used inside EnergyProvider");
  return ctx;
}

function toRow(r: ServerRecord): Record<string, unknown> {
  return {
    Timestamp: r.timestamp.toISOString(),
    Server_ID: r.serverId,
    Department: r.department,
    Environment: r.environment,
    "CPU_Usage_%": r.cpu,
    "Memory_Usage_%": r.memory,
    "Disk_Usage_%": r.disk,
    Network_Usage_Mbps: r.network,
    Estimated_Power_W: r.power,
    Anomaly_Score: r.anomalyScore,
    Anomaly_Status: r.anomalyStatus,
    Alert: r.alert,
    Predicted_Power_W: r.predictedPower,
    Power_Deviation_W: r.deviation,
    Energy_kWh_Approx: r.energyKwh,
  };
}
