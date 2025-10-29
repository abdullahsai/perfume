# Perfume Production Web App

## Overview
A Google Apps Script web application tailored for a single self-employed perfume manufacturer. The app is bound to a Google Sheets spreadsheet that acts as both the data store and the log archive. It supports the full workflow from sourcing raw materials to producing individual perfume bottles while providing deep observability via an in-memory + persistent log pipeline.

## Features
- **Purchase tracking** (`src/server/sheets.gs`, `src/client/index.html`)
  - Record raw material purchases with automatic unit price calculation.
  - Materials sheet is updated with running stock, last purchase timestamp, and price per mg recalculation.
- **Formula management and production costing** (`src/server/sheets.gs`, `src/lib/costCalculator.js`)
  - Define perfume formulas with component materials in milligrams and optional margin overrides.
  - Compute production cost, margin, and selling price per bottle via reusable cost calculator utilities.
  - Persist formulas with serialized component payloads for reuse.
- **Production tracking** (`src/server/sheets.gs`, `src/client/index.html`)
  - Record each bottle produced, deduct consumed stock, and capture calculated pricing metrics.
- **Advanced logging system** (`src/server/logging.gs`, `src/lib/logBuffer.js`, `src/lib/logSchema.js`, `src/lib/masker.js`)
  - Structured log schema with masking of sensitive fields, validation, batching, and Google Sheets persistence with retention controls.
  - Client-side capture of console calls, UI actions, fetch lifecycle, and error hooks with resilient batching to the server.
  - Server-side logging of HTTP handlers, sheet mutations, and error handling.
  - Dedicated Logs page with live tail, filtering, statistics, schema validation status, and export (JSONL/CSV) plus copy-to-clipboard with masking.
- **Accessibility-conscious UI** (`src/client/index.html`, `src/client/styles.html`)
  - Keyboard-friendly tab navigation, form labeling, and aria attributes.
  - Efficient rendering for thousands of log entries using document fragments and filtered views.

## Architecture
### Google Sheets schema
| Sheet | Purpose | Columns |
|-------|---------|---------|
| `Materials` | Master catalog with pricing and stock | `materialId`, `name`, `vendor`, `pricePerMg`, `stockMg`, `lastPurchaseIso` |
| `Purchases` | Historical purchases | `timestampIso`, `materialId`, `vendor`, `quantityMg`, `totalCost`, `unitPrice`, `notes` |
| `Formulas` | Saved perfume formulas | `formulaId`, `name`, `description`, `componentsJson`, `lastCost`, `margin`, `sellingPrice` |
| `Bottles` | Production records | `timestampIso`, `bottleId`, `formulaId`, `quantityMg`, `cost`, `margin`, `sellingPrice`, `notes` |
| `Logs` | Persistent structured log archive | `timestamp`, `level`, `origin`, `category`, `message`, `details`, `sessionId`, `requestId`, `context` |

### Server (Apps Script)
- **Entry points**: `src/server/app.gs` exposes `doGet`, `getInitialData`, CRUD-like methods for purchases/formulas/production, and log export APIs accessible via `google.script.run`.
- **Config**: `src/server/config.gs` holds sheet names, default margin, and spreadsheet acquisition helper.
- **Business logic**: `src/server/sheets.gs` orchestrates sheet interactions, ensures tab creation, performs stock adjustments, and delegates cost computations to shared libs.
- **Logging**: `src/server/logging.gs` instantiates the shared `LogBuffer`, enforces sheet retention, enriches log context, and handles client batches.
- **UI integration**: `src/server/menu.gs` adds a spreadsheet custom menu and sidebar loader for quick access.
- **Shared library bundle**: `src/server/perfumeLibBundle.gs` is auto-generated from `src/lib` to make reusable utilities available to Apps Script.

### Client (HTML Service)
- **HTML shell**: `src/client/index.html` builds a multi-tab interface (Inventory, Production, Logs) and injects shared libraries via `src/client/perfumeLibBundle.html`.
- **Styling**: `src/client/styles.html` provides responsive, accessible styles.
- **Behavior**: `src/client/appScript.html` initializes state, wires form submissions, maintains log filters, implements live-tail polling, performs schema validation, and funnels client telemetry back to the server.

### Shared libraries
- `src/lib/costCalculator.js`: Normalizes formulas, enforces validation, and returns detailed cost breakdowns with margin handling.
- `src/lib/logBuffer.js`: Circular buffer with masking, validation, filtering, exporting, statistics, and persistence callbacks.
- `src/lib/logSchema.js`: Defines enumerations and validation helpers for log entries.
- `src/lib/masker.js`: Recursively masks sensitive fields including nested structures, arrays, and cyclic references.
- Bundles generated via `npm run build:bundles` ensure parity between server, client, and test environments.

## Workflows
### Recording a purchase
1. Navigate to **Inventory** tab.
2. Complete the “Record purchase” form and submit.
3. Client logs the UI action, submits `recordPurchaseApi` with sanitized payload.
4. Server (`sheets.gs`) appends to `Purchases`, upserts the material in `Materials`, updates stock/price, and emits structured logs.
5. Client refreshes materials and purchase tables.

### Managing formulas
1. On **Production** tab, add components (material ID + quantity mg) and optional margin.
2. Submit form; server persists formula with recalculated pricing and logs the event.
3. Saved formulas appear in the table; selecting one pre-fills the form for edits.

### Producing a bottle
1. Populate batch components and metadata in “Record production”.
2. Submission triggers cost computation, bottle logging, stock deduction, and log emission.
3. Client notifies user of computed cost and updates material inventory display.

### Observing logs
1. Switch to **Logs** tab to view structured table.
2. Apply filters (level/origin/category/search/since) and optionally enable live tail.
3. Select rows for detailed JSON, copy single entries, or export the filtered set to JSONL/CSV (download handled client-side after invoking `exportLogsApi`).
4. Stats banner shows counts, schema validation issues, and average durations for quick health assessment.

## Development & Deployment
1. Install dependencies: `npm install`.
2. Generate Apps Script/client bundles after updating shared libs: `npm run build:bundles` (updates `src/server/perfumeLibBundle.gs` and `src/client/perfumeLibBundle.html`).
3. For deployment, copy the contents of `src/server/*.gs`, `src/client/*.html`, and `src/assets` (if any) into a Google Apps Script project bound to the target spreadsheet. Ensure the spreadsheet contains (or let the script create) the sheets listed above.
4. Set up triggers as desired (e.g., `onOpen` is auto-discovered). The web app should be deployed as a “Web app” within Apps Script with appropriate access permissions.

## Testing
- **Test command**: `npm test` (runs Jest with coverage across shared libraries). Coverage is collected for `src/lib/**/*.js`.
- **Test suites**:
  - `__tests__/costCalculator.test.js`: Validates cost calculations, formula summaries, and validation errors.
  - `__tests__/logBuffer.test.js`: Exercises masking, schema enforcement, batching, filtering, exports, and stats aggregation.
  - `__tests__/logSchema.test.js`: Confirms schema validation guards.
  - `__tests__/masker.test.js`: Covers recursive masking, arrays, and cyclic structures.
- **Latest run**: `npm test` (see coverage summary in terminal output). Target coverage (>80% per module) is met across shared libraries.

## Changelog
- **2025-10-29**: Initial implementation of perfume manufacturing web app with Google Sheets backend, shared library bundles, full logging subsystem, client UI (Inventory/Production/Logs), and Jest test coverage with masking/schema/buffering cases.
