import { useCallback, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2, FileSpreadsheet, Loader2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useEnergy } from "@/lib/energy/store";
import { ImportValidationError } from "@/lib/energy/parse";
import { fmtDate } from "@/lib/energy/stats";
import type { ImportSummary } from "@/lib/energy/types";
import { REQUIRED_COLUMNS } from "@/lib/energy/types";
import { cn } from "@/lib/utils";

const ACCEPT = ".xlsx,.xls,.csv";

export function ImportDialog() {
  const { importOpen, setImportOpen, importFile, importing } = useEnergy();
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handle = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      setError(null);
      setMissing([]);
      setSummary(null);
      if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
        setError("Unsupported file type. Please upload an .xlsx, .xls or .csv file.");
        return;
      }
      try {
        const s = await importFile(file);
        setSummary(s);
      } catch (e) {
        if (e instanceof ImportValidationError) {
          setMissing(e.missing);
          setError("The file is missing required columns.");
        } else {
          setError(e instanceof Error ? e.message : "Could not read this file.");
        }
      }
    },
    [importFile],
  );

  const close = (v: boolean) => {
    setImportOpen(v);
    if (!v) {
      setError(null);
      setMissing([]);
      setSummary(null);
    }
  };

  return (
    <Dialog open={importOpen} onOpenChange={close}>
      <DialogContent className="max-w-lg rounded-3xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl">Import Server Monitoring Data</DialogTitle>
          <DialogDescription>
            Upload Excel or CSV file. Required columns: {REQUIRED_COLUMNS.join(", ")}.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6">
          {summary ? (
            <div className="rounded-2xl bg-success-soft p-5">
              <div className="flex items-center gap-2 font-semibold text-primary">
                <CheckCircle2 className="size-5" /> File uploaded successfully
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">Records imported</dt>
                  <dd className="text-2xl font-bold">{summary.records}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Servers detected</dt>
                  <dd className="text-2xl font-bold">{summary.servers}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-muted-foreground">Date range</dt>
                  <dd className="font-semibold">
                    {fmtDate(summary.start)} – {fmtDate(summary.end)}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-muted-foreground">Anomalies flagged in dataset</dt>
                  <dd className="font-semibold">{summary.anomalies}</dd>
                </div>
              </dl>
              <Button
                className="mt-5 w-full"
                variant="deep"
                onClick={() => {
                  close(false);
                  navigate({ to: "/" });
                }}
              >
                View Dashboard
              </Button>
            </div>
          ) : (
            <>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDrag(true);
                }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDrag(false);
                  handle(e.dataTransfer.files?.[0]);
                }}
                onClick={() => inputRef.current?.click()}
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors",
                  drag ? "border-primary bg-primary-soft" : "border-border bg-muted/50 hover:bg-muted",
                )}
              >
                <input ref={inputRef} type="file" accept={ACCEPT} className="hidden" onChange={(e) => handle(e.target.files?.[0])} />
                {importing ? (
                  <>
                    <Loader2 className="size-10 animate-spin text-primary" />
                    <p className="mt-4 font-semibold">Processing server data...</p>
                    <p className="text-xs text-muted-foreground">Validating columns and parsing values</p>
                  </>
                ) : (
                  <>
                    <div className="grid size-14 place-items-center rounded-full bg-primary-soft text-primary">
                      <UploadCloud className="size-7" />
                    </div>
                    <p className="mt-4 font-semibold">Upload Excel or CSV file</p>
                    <p className="mt-1 text-xs text-muted-foreground">Drag and drop here, or click to browse · .xlsx .xls .csv</p>
                  </>
                )}
              </div>

              {error && (
                <div className="mt-4 rounded-2xl bg-danger-soft p-4 text-sm">
                  <div className="flex items-center gap-2 font-semibold text-destructive">
                    <AlertCircle className="size-4" /> {error}
                  </div>
                  {missing.length > 0 && (
                    <ul className="mt-2 list-inside list-disc text-destructive/80">
                      {missing.map((m) => (
                        <li key={m}>{m}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <FileSpreadsheet className="size-4" /> The first sheet containing the required columns is used.
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
