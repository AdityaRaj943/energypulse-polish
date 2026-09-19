# EnergyPulse: restore and finish in one pass

## Key finding

This workspace is a blank starter. The full EnergyPulse app lives in the uploaded `energypulse-dashboard-main.zip`, and after reading its source it is already largely complete: central store with localStorage persistence and demo data, SheetJS importer (xlsx/xls/csv, Excel serial dates), real Random Forest (R², MAE, RMSE) and Isolation Forest, Dataset/ML anomaly mode, dashboard, filters, servers table with search/sort/pagination, server detail, anomalies page with severity and sorting, reports with CSV and PDF (jspdf), empty states, all routes.

So the job is: restore it here, verify it in the browser, and apply a handful of small fixes. No rebuilding, no redesign, no new packages.

## Steps

1. Restore the project
   - Copy the zip's source into the workspace (excluding git metadata and node_modules), install its existing dependencies, confirm the app boots on the demo dataset.

2. Import hardening (parse.ts / types.ts / ImportDialog only)
   - Accept `Date` as an alias for `Timestamp`, and `Anomaly` / `Status` as aliases for `Anomaly_Status` (yes/1/true/anomaly = Anomaly).
   - Confirm optional columns (Predicted_Power_W, Anomaly_Score, Anomaly, Department, Environment, Status) never block import.
   - Show the success toast exactly as: "Successfully imported X records from Y servers."

3. Verification pass in the browser (fix only what breaks)
   - Demo data loads; import a generated .xlsx and a .csv; record count matches; dashboard KPIs, charts, server list, server detail, anomalies, reports and filter dropdowns all change to the new dataset; refresh keeps the imported data.
   - Filters (date, server, department, environment, status) update every page; Clear Filters resets; empty filter result shows "No records match the selected filters."
   - Train Model shows real R²/MAE/RMSE and actual vs predicted chart; Isolation Forest mode works on the anomalies page.
   - CSV export contains the filtered dataset with the listed fields; PDF export runs.
   - Head metadata check on each route, no build/console errors.

## Technical notes

- Files touched beyond the restore: `src/lib/energy/parse.ts`, `src/lib/energy/types.ts`, `src/components/data/ImportDialog.tsx`, plus any single-line fixes found during verification.
- No backend, no auth, no new dependencies; state remains React context + localStorage.
- Remaining limitation to expect: very large workbooks (tens of thousands of rows) train the models in the main thread, so training may take a few seconds.
