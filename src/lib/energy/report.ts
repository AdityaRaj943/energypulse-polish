import type { Kpis } from "./stats";
import { deviationOf, fmtDate, fmtDateTime, fmtKwh, fmtPct, fmtW, round, summarizeServers } from "./stats";
import type { GlobalFilters, ServerRecord } from "./types";

export interface ReportInput {
  records: ServerRecord[];
  kpis: Kpis;
  filters: GlobalFilters;
  sourceName: string;
  anomalySource: "dataset" | "ml";
}

const rangeLabel: Record<GlobalFilters["range"], string> = { "1d": "Last 1 day", "7d": "Last 7 days", "30d": "Last 30 days", all: "All data", custom: "Custom range" };

export function reportSummaryRows({ records, kpis, filters, sourceName, anomalySource }: ReportInput): [string, string][] {
  const dateRange = kpis.start && kpis.end ? `${fmtDate(kpis.start)} → ${fmtDate(kpis.end)}` : "—";
  return [
    ["Dataset", sourceName],
    ["Anomaly source", anomalySource === "ml" ? "ML (Isolation Forest)" : "Dataset columns"],
    ["Date range", `${dateRange} (${rangeLabel[filters.range]})`],
    ["Servers", String(kpis.servers)],
    ["Records", String(records.length)],
    ["Average estimated power", fmtW(kpis.avgPower)],
    ["Peak estimated power", fmtW(kpis.peakPower)],
    ["Minimum estimated power", fmtW(kpis.minPower)],
    ["Total energy", fmtKwh(kpis.totalEnergy)],
    ["Anomaly count", String(kpis.anomalies)],
    ["Anomaly rate", fmtPct(kpis.anomalyRate)],
    ["Top power-consuming server", kpis.topServer ? `${kpis.topServer.serverId} (${fmtW(kpis.topServer.avgPower)} avg)` : "—"],
    ["Average CPU", fmtPct(kpis.avgCpu)],
    ["Average memory", fmtPct(kpis.avgMemory)],
    ["Average disk", fmtPct(kpis.avgDisk)],
    ["Average network", `${round(kpis.avgNetwork)} Mbps`],
  ];
}

const csvCell = (v: unknown) => `"${String(v ?? "").replaceAll('"', '""')}"`;

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

const stamp = () => new Date().toISOString().slice(0, 10);

export function exportCsv(input: ReportInput) {
  const headers = [
    "Timestamp", "Server_ID", "Department", "Environment", "CPU_Usage_%", "Memory_Usage_%", "Disk_Usage_%", "Network_Usage_Mbps",
    "Estimated_Power_W", "Predicted_Power_W", "Power_Deviation_W", "Energy_kWh_Approx", "Anomaly_Score", "Anomaly_Status", "Alert",
  ];
  const summary = reportSummaryRows(input).map(([k, v]) => `${csvCell(k)},${csvCell(v)}`);
  const lines = input.records.map((r) =>
    [r.timestamp.toISOString(), r.serverId, r.department, r.environment, r.cpu, r.memory, r.disk, r.network, r.power, r.predictedPower, deviationOf(r), r.energyKwh, r.anomalyScore, r.anomalyStatus, r.alert]
      .map(csvCell)
      .join(","),
  );
  const csv = ["# EnergyPulse report", ...summary, "", headers.join(","), ...lines].join("\n");
  download(new Blob([csv], { type: "text/csv;charset=utf-8" }), `energypulse-report-${stamp()}.csv`);
}

export async function exportPdf(input: ReportInput) {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const green: [number, number, number] = [22, 92, 62];

  doc.setFillColor(...green);
  doc.rect(0, 0, 595, 70, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text("EnergyPulse — Server Energy Report", 40, 42);
  doc.setFontSize(10);
  doc.text(`Generated ${fmtDateTime(new Date())} · Estimated (software-derived) power, not metered electrical power`, 40, 58);

  doc.setTextColor(30, 30, 30);
  autoTable(doc, {
    startY: 90,
    head: [["Summary", "Value"]],
    body: reportSummaryRows(input),
    theme: "grid",
    headStyles: { fillColor: green },
    styles: { fontSize: 9, cellPadding: 5 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 200 } },
  });

  const servers = summarizeServers(input.records);
  autoTable(doc, {
    startY: (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20,
    head: [["Server", "Dept", "Env", "Avg CPU", "Avg Mem", "Avg Power", "Peak", "Energy", "Anomalies", "Status"]],
    body: servers.map((s) => [s.serverId, s.department, s.environment, fmtPct(s.avgCpu), fmtPct(s.avgMemory), fmtW(s.avgPower), fmtW(s.peakPower), fmtKwh(s.energy), s.anomalies, s.status]),
    theme: "striped",
    headStyles: { fillColor: green },
    styles: { fontSize: 8, cellPadding: 4 },
  });

  const anomalies = input.records.filter((r) => r.anomalyStatus === "Anomaly").sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 40);
  if (anomalies.length) {
    autoTable(doc, {
      startY: (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20,
      head: [["Timestamp", "Server", "Est. power", "Predicted", "Deviation", "Score", "Alert"]],
      body: anomalies.map((r) => [fmtDateTime(r.timestamp), r.serverId, fmtW(r.power), r.predictedPower === null ? "—" : fmtW(r.predictedPower), deviationOf(r) === null ? "—" : `${round(deviationOf(r)!)} W`, r.anomalyScore ?? "—", r.alert || "—"]),
      theme: "striped",
      headStyles: { fillColor: [180, 50, 40] },
      styles: { fontSize: 8, cellPadding: 4 },
    });
  }

  doc.save(`energypulse-report-${stamp()}.pdf`);
}
