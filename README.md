# Server Power Insights

Continue developing my existing project.

IMPORTANT:

DO NOT rebuild the application from scratch.

DO NOT replace the existing UI unnecessarily.

DO NOT delete working components.

First inspect the existing codebase and understand what has already been implemented.

The project is:

"Smart Server Energy Monitoring, Power Prediction and Anomaly Detection System"

The existing project already contains components/modules for:

- Dashboard layout

- Sidebar

- Header

- Excel import

- Global filters

- Demo dataset

- Energy data parsing

- Statistics

- Data store

- ML utilities

- Energy types

- Charts/UI components

Continue from the current state and improve/complete the application.

====================================================

PHASE 1 — INSPECT CURRENT IMPLEMENTATION

====================================================

Before making changes, inspect:

src/components/

src/components/data/

src/components/layout/

src/data/

src/lib/energy/

src/routes/

src/styles.css

package.json

Pay particular attention to:

- ImportDialog

- GlobalFilters

- demo-dataset.json

- parse.ts

- stats.ts

- store.tsx

- ml.ts

- types.ts

- index.tsx

- AppShell

- Header

- Sidebar

Determine what is already functional and what is incomplete.

Do not duplicate existing functionality.

====================================================

PHASE 2 — EXCEL DATA IMPORT

====================================================

Make the Excel import fully functional.

The application should support:

.xlsx

.xls

.csv

The uploaded Excel should become the primary source of dashboard data.

The application must dynamically process the uploaded dataset.

Required fields include:

Timestamp

Server_ID

Department

Environment

CPU_Usage_%

Memory_Usage_%

Disk_Usage_%

Network_Usage_Mbps

Estimated_Power_W

Anomaly_Score

Anomaly_Status

Alert

Predicted_Power_W

Power_Deviation_W

Energy_kWh_Approx

Inspect the actual parser and adapt it rather than creating a second parser.

When Excel is imported:

1. Validate the file.

2. Parse the records.

3. Validate required fields.

4. Convert numeric fields to numbers.

5. Parse timestamps.

6. Detect unique servers.

7. Detect departments.

8. Detect environments.

9. Calculate statistics.

10. Replace/update the current dataset.

11. Refresh every dashboard component.

Do not hard-code statistics.

====================================================

PHASE 3 — DASHBOARD

====================================================

Keep the existing visual design.

The design should follow the uploaded reference screenshot:

- Clean SaaS dashboard

- White/light gray background

- Green energy theme

- Dark green primary card

- Rounded cards

- Soft shadows

- Spacious layout

- Left sidebar

- Top header

- KPI cards

- Large analytics charts

Do not redesign the whole application.

Only improve the existing UI where necessary.

====================================================

PHASE 4 — KPI CARDS

====================================================

Make sure the dashboard has these KPI cards:

1. Total Servers

2. Average Power

3. Peak Power

4. Total Anomalies

Calculate dynamically from the currently selected/filtered dataset.

Also show useful secondary information where appropriate:

Average CPU

Average Memory

Average Disk

Average Network

Total Energy

IMPORTANT:

The KPI cards must respond to the global filters.

If the user selects one server, the statistics should change.

If the user selects a date range, the statistics should change.

====================================================

PHASE 5 — POWER CONSUMPTION ANALYTICS

====================================================

Create/complete the main Power Consumption chart.

Title:

Power Consumption

Show:

Estimated Power

Predicted Power

Use:

Estimated_Power_W

Predicted_Power_W

X-axis:

Timestamp

Y-axis:

Power (W)

Add time filters:

1D

7D

30D

All

The graph must use the actual dataset.

Do not generate random values.

Add tooltips showing:

Timestamp

Server

Estimated Power

Predicted Power

Power Deviation

====================================================

PHASE 6 — RESOURCE UTILIZATION

====================================================

Create/complete:

Resource Utilization

Metrics:

CPU

Memory

Disk

Network

Allow the user to switch between these metrics.

Show the selected metric over time.

Use the actual Excel values.

Example:

CPU Usage

62%

Memory Usage

71%

Disk Usage

48%

Network Usage

36 Mbps

Do not hard-code these values.

====================================================

PHASE 7 — SERVER POWER COMPARISON

====================================================

Create:

Power Consumption by Server

Use a bar chart.

For each unique Server_ID calculate:

Average Power

Peak Power

Allow the user to switch between:

Average Power

Peak Power

Sort servers from highest to lowest when appropriate.

Use dynamic server names from the Excel dataset.

Do not hard-code server IDs.

====================================================

PHASE 8 — ANOMALY DASHBOARD

====================================================

Make anomaly detection clearly visible.

Create a dedicated anomaly section.

Show:

Total Records

Normal Records

Anomalous Records

Anomaly Rate

Use:

Anomaly_Status

and

Anomaly_Score

from the uploaded dataset for the initial demo.

Anomaly rate:

Anomalous Records / Total Records × 100

Create an anomaly visualization.

Display anomalous records in a table.

Columns:

Server

Timestamp

Power

Predicted Power

Deviation

Anomaly Score

Alert

Use:

Normal → green

Warning → amber

Anomaly/Critical → red

Keep colors subtle and professional.

====================================================

PHASE 9 — ANOMALY CHART

====================================================

Create a power timeline chart where anomalous records are visually identifiable.

Show:

Normal Power

Anomalous Power

If possible, display anomaly points separately so that users can immediately see power spikes.

When an anomaly point is selected, display:

Server ID

Timestamp

Actual/Estimated Power

Predicted Power

Deviation

Anomaly Score

Alert

====================================================

PHASE 10 — POWER PREDICTION

====================================================

Complete the Power Prediction page.

Use the existing ML utility in:

src/lib/energy/ml.ts

Do not create a duplicate ML implementation.

First inspect what is already implemented.

The prediction system should use:

CPU

Memory

Disk

Network

as input features.

Target:

Estimated Power

Use Random Forest Regression if the existing implementation supports it.

Display:

Model

R²

MAE

RMSE

Training Records

Last Trained

IMPORTANT:

Never display fake accuracy values.

If the model has not actually been trained, show:

"Model not trained"

instead of fake metrics.

====================================================

PHASE 11 — DEMO PREDICTION

====================================================

The Excel dataset already contains:

Predicted_Power_W

Use this for the initial dashboard demonstration.

Clearly distinguish between:

Dataset Prediction

and

ML Prediction

Do not claim that the existing Predicted_Power_W values were generated by our newly trained model.

If the user trains the model, allow the newly generated predictions to be displayed separately.

====================================================

PHASE 12 — ISOLATION FOREST

====================================================

Inspect the existing ML implementation.

If anomaly detection is incomplete, implement an Isolation Forest-based anomaly detection architecture.

Use features such as:

CPU usage

Memory usage

Disk usage

Network usage

Power consumption

The system should produce:

Anomaly Score

Normal / Anomaly classification

Do not destroy the existing dataset anomaly labels.

Allow comparison:

Dataset Anomaly

vs

ML Detected Anomaly

====================================================

PHASE 13 — GLOBAL FILTERS

====================================================

Complete the existing GlobalFilters component.

Filters:

Date Range

Server

Department

Environment

Status

Date options:

Today

Last 7 Days

Last 30 Days

All Data

Custom Range

Server options should be generated dynamically.

Department options should be generated dynamically.

Environment options should be generated dynamically.

Status:

All

Normal

Anomaly

Filters must update:

KPI cards

Power chart

Resource chart

Server comparison

Anomaly statistics

Anomaly table

Recent alerts

====================================================

PHASE 14 — SERVER MONITORING TABLE

====================================================

Create/complete the server data table.

Columns:

Server ID

Department

Environment

CPU %

Memory %

Disk %

Network

Power

Predicted Power

Deviation

Status

Add:

Search

Sorting

Filtering

Pagination

Clicking a server should open a detailed server view.

====================================================

PHASE 15 — SERVER DETAILS

====================================================

Create a server detail view.

Show:

Server ID

Department

Environment

Average CPU

Average Memory

Average Disk

Average Network

Average Power

Peak Power

Total Energy

Anomaly Count

Charts:

Power Trend

CPU Trend

Memory Trend

Recent alerts.

Everything should be calculated from the currently loaded dataset.

====================================================

PHASE 16 — ALERTS

====================================================

Create/complete the Energy Alerts section.

Show the most recent anomalies.

Example structure:

HIGH POWER CONSUMPTION

Server:

DB-SRV-01

Power:

450 W

Predicted:

260 W

Deviation:

+190 W

Timestamp:

...

Anomaly Score:

...

Status:

Critical

Make alerts dynamically generated from anomaly records.

Do not hard-code alert messages.

====================================================

PHASE 17 — ANALYTICS PAGE

====================================================

Complete the Power Analytics page.

Display:

Average Power

Peak Power

Minimum Power

Total Energy

Anomaly Count

Anomaly Rate

Charts:

Power over time

Average power by server

CPU vs Power

Memory vs Power

Disk vs Power

Network vs Power

For CPU vs Power and similar relationships, use scatter charts.

====================================================

PHASE 18 — CORRELATION ANALYSIS

====================================================

Add a section:

"Resource vs Power Relationship"

Show how resource utilization relates to power consumption.

Create:

CPU vs Power

Memory vs Power

Disk vs Power

Network vs Power

These should use the actual Excel records.

Optionally calculate a simple correlation coefficient for each metric.

Display:

CPU → Power correlation

Memory → Power correlation

Disk → Power correlation

Network → Power correlation

Clearly label these as correlation, not causation.

====================================================

PHASE 19 — REPORTS

====================================================

Complete the Reports page.

Report should include:

Date range

Total servers

Total records

Average power

Peak power

Minimum power

Total energy

Anomaly count

Anomaly rate

Most power-consuming server

Average CPU

Average Memory

Provide:

Export CSV

Generate PDF

Use the filtered dataset when generating reports.

====================================================

PHASE 20 — DATA PERSISTENCE

====================================================

Inspect the existing store implementation.

Make sure imported data is stored in a centralized state/store.

Refreshing components should NOT lose data unnecessarily.

If localStorage is appropriate for the current frontend architecture, persist the imported dataset there.

Do not introduce unnecessary external databases at this stage unless the current project already has backend infrastructure.

====================================================

PHASE 21 — EMPTY STATE

====================================================

If no data is loaded:

Show a clean empty state.

Message:

"No server data available"

Button:

"Import Excel Data"

Do not show fake numbers.

====================================================

PHASE 22 — ERROR HANDLING

====================================================

Handle:

Invalid Excel file

Missing columns

Empty Excel file

Invalid timestamps

Invalid numeric values

Missing values

Show user-friendly errors.

Do not crash the dashboard.

====================================================

PHASE 23 — DESIGN DETAILS

====================================================

Preserve the current theme.

Use:

Green

Dark green

White

Light gray

Charcoal

Muted gray

Amber

Red only for critical anomalies

Cards:

rounded

clean

soft shadow

Maintain consistent spacing.

Do not overcrowd the dashboard.

Use icons consistently.

====================================================

PHASE 24 — RESPONSIVENESS

====================================================

Desktop:

Sidebar + multi-column dashboard.

Tablet:

Collapsible sidebar.

Mobile:

Hamburger/drawer.

KPI cards stack.

Charts resize.

Tables scroll horizontally.

====================================================

PHASE 25 — LIVE MONITORING ARCHITECTURE

====================================================

Do not implement actual psutil integration yet unless the existing project already has it.

Instead, prepare the architecture so that later we can connect:

Python psutil

+

Flask API

for live:

CPU

RAM

Disk

Network

The current primary data source remains:

Excel.

====================================================

PHASE 26 — IMPORTANT POWER TERMINOLOGY

====================================================

The dataset uses:

Estimated_Power_W

Therefore display:

"Estimated Power"

Do not claim it is physical electrical power measurement.

This is a software-based energy estimation prototype.

====================================================

PHASE 27 — CODE QUALITY

====================================================

Use the existing architecture.

Do not create duplicate:

parsers

stores

statistics utilities

ML utilities

chart systems

Reuse existing files whenever possible.

Keep components modular.

Do not put the entire application in one file.

Use TypeScript properly.

Avoid any unnecessary dependencies.

====================================================

PHASE 28 — TEST THE PROJECT

====================================================

After implementation, run the application.

Actually test it in the browser.

Test:

1. Dashboard loads.

2. Excel import works.

3. Demo dataset loads.

4. Records are parsed correctly.

5. Total server count is correct.

6. Average power is correct.

7. Peak power is correct.

8. Anomaly count is correct.

9. Power chart works.

10. Prediction chart works.

11. Filters work.

12. Server search works.

13. Server details work.

14. Anomaly details work.

15. Reports work.

16. Export works.

17. No console errors.

18. No broken routes.

19. No TypeScript errors.

20. Mobile layout works.

====================================================

PHASE 29 — DATA ACCURACY TEST

====================================================

Use the current demo dataset and independently verify:

Total records

Unique servers

Average power

Peak power

Minimum power

Anomaly count

Anomaly percentage

Average CPU

Average memory

Average disk

Average network

Compare these values against the dashboard.

If there is any mismatch, fix it.

Do not simply assume the calculations are correct.

====================================================

PHASE 30 — FINAL RESULT

====================================================

The completed application should provide this workflow:

                    EXCEL DATA

                        ↓

                  DATA IMPORT

                        ↓

                 VALIDATION

                        ↓

                 DATA PARSING

                        ↓

                DATA PROCESSING

                        ↓

              ┌─────────┴─────────┐

              ↓                   ↓

       POWER ANALYTICS       ML ANALYSIS

              ↓                   ↓

        HISTORICAL POWER     PREDICTION

              ↓                   ↓

              └─────────┬─────────┘

                        ↓

                 ANOMALY DETECTION

                        ↓

                     ALERTS

                        ↓

                   DASHBOARD

                        ↓

              ANALYTICS + REPORTS

The final dashboard should make it immediately possible to answer:

- How many servers are monitored?

- What is the average power consumption?

- What is the peak power?

- Which server consumes the most power?

- How does power change over time?

- What is the predicted power?

- How many anomalies occurred?

- Which servers have anomalies?

- What caused the power spike in terms of resource utilization?

- What is the relationship between CPU/RAM/Disk/Network and power?

IMPORTANT FINAL INSTRUCTION:

Do not stop after editing the code.

Run the application.

Inspect it in the browser.

Test the Excel workflow.

Fix all errors you find.

Then verify the final dashboard against the actual Excel dataset.

Preserve the existing design and working functionality while completing the missing functionality.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/09b1c8aa-5630-4c83-a9de-37780598986a).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
