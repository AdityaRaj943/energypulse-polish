import { createFileRoute } from "@tanstack/react-router";
import { EnergyDashboard } from "@/components/energy/EnergyDashboard";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Energy overview | EnergyPulse" }, { name: "description", content: "Monitor smart server energy, power prediction, and anomaly alerts." }, { property: "og:title", content: "Energy overview | EnergyPulse" }, { property: "og:description", content: "Monitor smart server energy, power prediction, and anomaly alerts." }] }),
  component: EnergyDashboard,
});
