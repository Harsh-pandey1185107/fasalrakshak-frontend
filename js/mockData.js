/* ==========================================================================
   mockData.js
   -----------
   EVERYTHING in this file is FAKE / PLACEHOLDER data.
   When the real backend + AI model are ready, this file is what gets
   deleted/replaced with real API calls (fetch requests). Nothing else
   in the app should need to change, because farmer.js and officer.js
   always read reports through the functions below (getAllReports,
   saveReport, updateReportStatus) instead of touching localStorage
   directly. This is called an "abstraction layer" — it means we can
   swap the storage/data source later without rewriting every page.
   ========================================================================== */

const STORAGE_KEY = "fasalrakshak_reports";

// A few realistic-looking sample reports so the Officer Dashboard has
// something to show even before the farmer submits a new one.
const SAMPLE_REPORTS = [
  {
    id: "FR-1001",
    farmerId: "F-2201",
    farmerName: "Ramesh Yadav",
    crop: "Paddy",
    damageType: "Excessive Rainfall",
    description: "Standing water in the field for 3 days after heavy rain, crop stems bent.",
    location: "Saran, Bihar",
    timestamp: "2026-08-14T09:20:00",
    imageColor: "#7C9070", // used to render a placeholder photo, see utils.js
    ai: { damagePercent: 65, confidence: 87, evidenceValid: true, risk: "Low" },
    status: "Pending",
    officerRemark: ""
  },
  {
    id: "FR-1002",
    farmerId: "F-2214",
    farmerName: "Sita Devi",
    crop: "Wheat",
    damageType: "Hailstorm",
    description: "Hailstorm damaged the crop heads across roughly half the field.",
    location: "Muzaffarpur, Bihar",
    timestamp: "2026-08-13T16:05:00",
    imageColor: "#B8A15A",
    ai: { damagePercent: 42, confidence: 79, evidenceValid: true, risk: "Medium" },
    status: "Under Review",
    officerRemark: "Photo angle unclear, awaiting field visit."
  },
  {
    id: "FR-1003",
    farmerId: "F-2233",
    farmerName: "Anil Kumar",
    crop: "Maize",
    damageType: "Pest",
    description: "Stem borer infestation observed across several rows.",
    location: "Patna Rural, Bihar",
    timestamp: "2026-08-10T11:40:00",
    imageColor: "#8FA85E",
    ai: { damagePercent: 28, confidence: 91, evidenceValid: true, risk: "Low" },
    status: "Verified",
    officerRemark: "Confirmed during field visit. Damage consistent with pest attack."
  },
  {
    id: "FR-1004",
    farmerId: "F-2247",
    farmerName: "Manoj Singh",
    crop: "Paddy",
    damageType: "Flood",
    description: "Field fully submerged for over a week due to river overflow.",
    location: "Bhagalpur, Bihar",
    timestamp: "2026-08-08T07:15:00",
    imageColor: "#5F7D9A",
    ai: { damagePercent: 88, confidence: 93, evidenceValid: true, risk: "High" },
    status: "Verified",
    officerRemark: "Severe flood damage confirmed."
  },
  {
    id: "FR-1005",
    farmerId: "F-2260",
    farmerName: "Geeta Kumari",
    crop: "Sugarcane",
    damageType: "Other",
    description: "Uploaded photo does not clearly show crop damage.",
    location: "Gaya, Bihar",
    timestamp: "2026-08-05T13:50:00",
    imageColor: "#A67C52",
    ai: { damagePercent: 15, confidence: 54, evidenceValid: false, risk: "Low" },
    status: "Rejected",
    officerRemark: "Evidence insufficient — image too blurry to confirm damage."
  }
];

/**
 * Makes sure localStorage has our starting sample reports.
 * Runs once — if reports already exist (e.g. farmer already submitted one),
 * it will NOT overwrite them.
 */
function initMockData() {
  const existing = localStorage.getItem(STORAGE_KEY);
  if (!existing) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SAMPLE_REPORTS));
  }
}

/** Returns the full list of reports (sample + any submitted by the farmer). */
function getAllReports() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

/** Returns a single report by its ID, or null if not found. */
function getReportById(id) {
  return getAllReports().find(r => r.id === id) || null;
}

/** Adds a new report to storage (used by the farmer's report form). */
function saveReport(report) {
  const reports = getAllReports();
  reports.unshift(report); // newest first
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
}

/** Updates the status (and optional officer remark) of an existing report. */
function updateReportStatus(id, newStatus, remark) {
  const reports = getAllReports();
  const index = reports.findIndex(r => r.id === id);
  if (index === -1) return;
  reports[index].status = newStatus;
  if (remark !== undefined) reports[index].officerRemark = remark;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
}

/**
 * MOCK AI ENGINE.
 * In the real system, this would be an API call to the team's AI model.
 * Here we just generate a plausible-looking result so the frontend flow
 * can be demoed end-to-end. Clearly fake — never presented as a real
 * prediction anywhere in the UI copy.
 */
function mockAIAssessment(crop, damageType) {
  // A small "lookup table" so results feel consistent rather than fully random.
  const baseDamage = {
    Flood: 75, "Excessive Rainfall": 60, Hailstorm: 45, Pest: 30, Other: 20
  };
  const base = baseDamage[damageType] ?? 40;
  const damagePercent = Math.min(95, base + Math.floor(Math.random() * 15) - 7);
  const confidence = 80 + Math.floor(Math.random() * 15);
  const risk = damagePercent >= 60 ? "High" : damagePercent >= 35 ? "Medium" : "Low";

  return {
    crop,
    damagePercent,
    confidence,
    evidenceValid: true,
    risk
  };
}

/** Generates the next report ID, e.g. FR-1006, based on existing reports. */
function generateReportId() {
  const reports = getAllReports();
  const numbers = reports
    .map(r => parseInt(r.id.replace("FR-", ""), 10))
    .filter(n => !isNaN(n));
  const next = (numbers.length ? Math.max(...numbers) : 1000) + 1;
  return `FR-${next}`;
}
