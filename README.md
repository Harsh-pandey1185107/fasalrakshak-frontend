# FasalRakshak AI — Frontend Prototype (SIH 2026)

Farmer / Field-Officer frontend only. No backend, no real AI model, no auth system.

## How to Run

1. Unzip this folder anywhere.
2. Double-click **`index.html`** — it opens in your browser. That's it, no server or install needed.
3. To reset the demo data at any time: open DevTools Console (F12) and run:
   ```js
   localStorage.clear()
   ```
   then refresh.

## Folder Structure

```
fasalrakshak/
├── index.html                  Landing page — pick Farmer or Officer portal
├── farmer/
│   ├── dashboard.html          Farmer's report list + stats
│   ├── report-new.html         Damage report form (photo, GPS, description)
│   └── assessment-result.html  Mock AI result after submitting
├── officer/
│   ├── dashboard.html          All reports, searchable/filterable
│   └── report-detail.html      Full report + AI card + Verify/Review/Reject
├── css/style.css               All styling (design tokens + components)
├── js/
│   ├── mockData.js             ALL fake data + fake AI engine lives here
│   ├── utils.js                 Shared helpers (badges, dates, placeholder photos)
│   ├── farmer.js                 Farmer page logic
│   └── officer.js                Officer page logic
```

## The Flow

Farmer submits report → mock AI generates a result instantly (with a fake
1.8s "processing" delay for realism) → report appears in Officer Dashboard
as **Pending** → Officer opens it, sees photo + AI card → Officer clicks
**Verify / Needs Review / Reject** → status updates everywhere.

Data is stored in the browser's `localStorage`, so it persists between
page loads on the same browser (this is also what simulates the
**offline-first** behaviour — reports save locally even without a real
backend, and the sync bar at the top shows Online/Offline based on your
actual browser connection).

## What's MOCK (fake, to be replaced later)

- `js/mockData.js` → **every report** and the **entire AI assessment**
  (`mockAIAssessment()`) are fake. No real model runs here.
- Crop photos are colored placeholder SVGs, not real stored images
  (there's no backend to upload them to yet).
- Farmer login is hardcoded (`Ramesh Yadav`, `F-2201`) — no real
  authentication.
- GPS falls back to a fixed mock location if the browser denies location
  permission (for smooth demo on stage).

## What's REAL (actually works in the browser)

- Full navigation across all 7 pages
- Photo upload + live preview (`FileReader`)
- Form validation (photo, crop, damage type, location all required)
- Damage-type chip selection, voice input (Web Speech API, where supported)
- localStorage save/read/update — reports genuinely persist
- Search + status filter on Officer Dashboard (instant, no reload)
- Verify / Review / Reject actually change report status, with a
  confirmation step before Reject
- Online/offline detection using the browser's `navigator.onLine`

## Connecting to the Real Backend Later

Everything in `js/mockData.js` is called through 5 functions:
`getAllReports()`, `getReportById()`, `saveReport()`, `updateReportStatus()`,
`mockAIAssessment()`. When the real backend + AI model are ready, replace
just the *insides* of these 5 functions with real `fetch()` calls to your
team's API — `farmer.js`, `officer.js`, and every HTML page stay unchanged.
