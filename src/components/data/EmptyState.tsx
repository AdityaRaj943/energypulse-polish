import { Database, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEnergy } from "@/lib/energy/store";

export function EmptyState() {
  const { setImportOpen, loadDemo } = useEnergy();
  return (
    <div className="card-surface flex flex-col items-center justify-center px-6 py-20 text-center">
      <div className="grid size-16 place-items-center rounded-full bg-primary-soft text-primary">
        <Database className="size-8" />
      </div>
      <h2 className="mt-5 text-xl font-bold">No server data available</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Import an Excel or CSV export of your server monitoring data to populate the dashboard.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button variant="deep" onClick={() => setImportOpen(true)}>
          <UploadCloud /> Import Excel Data
        </Button>
        <Button variant="outline" onClick={loadDemo}>
          Load demo dataset
        </Button>
      </div>
    </div>
  );
}
