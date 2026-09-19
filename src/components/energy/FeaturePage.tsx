import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { AnomaliesPage } from "./pages/AnomaliesPage";
import { HelpPage, MonitoringPage, SettingsPage } from "./pages/MiscPages";
import { PowerAnalyticsPage } from "./pages/PowerAnalyticsPage";
import { PredictionPage } from "./pages/PredictionPage";
import { ReportsPage } from "./pages/ReportsPage";
import { ServersPage } from "./pages/ServersPage";

export { ServerDetailPage as ServerDetail } from "./pages/ServerDetailPage";

type FeatureKind = "monitoring" | "analytics" | "prediction" | "anomalies" | "servers" | "reports" | "settings" | "help";

const titles: Record<FeatureKind, [string, string]> = {
  monitoring: ["Live monitoring", "Track the latest readings and system status across your servers."],
  analytics: ["Power analytics", "Compare estimated power, utilization, and energy trends over time."],
  prediction: ["Power prediction", "Evaluate the dataset predictions or train a model on the current dataset."],
  anomalies: ["Anomaly detection", "Review unusual power behavior and prioritize the readings that need attention."],
  servers: ["Servers", "Compare health, utilization, estimated power, and alerts by server."],
  reports: ["Reports", "Export a concise snapshot of the currently filtered energy data."],
  settings: ["Settings", "Manage the active dataset and model settings for this workspace."],
  help: ["Help", "Understand the energy fields and the monitoring workflow."],
};

const bodies: Record<FeatureKind, () => React.ReactElement> = {
  monitoring: MonitoringPage,
  analytics: PowerAnalyticsPage,
  prediction: PredictionPage,
  anomalies: AnomaliesPage,
  servers: ServersPage,
  reports: ReportsPage,
  settings: SettingsPage,
  help: HelpPage,
};

export function FeaturePage({ kind }: { kind: FeatureKind }) {
  const [title, subtitle] = titles[kind];
  const Body = bodies[kind];
  return (
    <AppShell>
      <PageHeader title={title} subtitle={subtitle} />
      <Body />
    </AppShell>
  );
}
