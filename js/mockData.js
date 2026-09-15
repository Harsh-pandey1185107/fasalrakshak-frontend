/* ==========================================================================
   mockData.js
   FasalRakshak AI — SAFE LEGACY COMPATIBILITY LAYER

   IMPORTANT:
   - No fake farmers
   - No sample reports
   - No random AI predictions
   - No fake damage percentage
   - No fake confidence
   - No fake insurance assessment

   This file remains only because a few older HTML pages still reference
   mockData.js. The real application now uses the FastAPI backend and the
   Role 3 offline/sync workflow.

   Real AI results must come from the backend assessment API.
   ========================================================================== */


const STORAGE_KEY = "fasalrakshak_reports";


/* ==========================================================================
   LEGACY DEMO RECORDS

   These IDs belonged to the original frontend demo and must never appear
   in the real FasalRakshak demonstration.
   ========================================================================== */

const LEGACY_FAKE_REPORT_IDS = new Set([
    "FR-1001",
    "FR-1002",
    "FR-1003",
    "FR-1004",
    "FR-1005"
]);


const LEGACY_FAKE_FARMER_NAMES = new Set([
    "Ramesh Yadav",
    "Sita Devi",
    "Anil Kumar",
    "Manoj Singh",
    "Geeta Kumari"
]);


/* ==========================================================================
   REMOVE OLD SEEDED DEMO DATA

   This removes only the known original fake sample records.

   Any other locally stored record is preserved so that we do not
   accidentally delete genuine local/offline work.
   ========================================================================== */

function removeLegacyFakeReports() {

    try {

        const raw =
            localStorage.getItem(
                STORAGE_KEY
            );


        if (!raw) {
            return;
        }


        const parsed =
            JSON.parse(raw);


        if (!Array.isArray(parsed)) {

            localStorage.removeItem(
                STORAGE_KEY
            );

            return;
        }


        const cleaned =
            parsed.filter(report => {

                if (!report) {
                    return false;
                }


                const reportId =
                    String(
                        report.id || ""
                    ).trim();


                const farmerName =
                    String(
                        report.farmerName || ""
                    ).trim();


                if (
                    LEGACY_FAKE_REPORT_IDS.has(
                        reportId
                    )
                ) {
                    return false;
                }


                if (
                    LEGACY_FAKE_FARMER_NAMES.has(
                        farmerName
                    )
                ) {
                    return false;
                }


                return true;
            });


        if (cleaned.length === 0) {

            localStorage.removeItem(
                STORAGE_KEY
            );

        } else {

            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(cleaned)
            );
        }


        console.log(
            "[FasalRakshak] Legacy fake sample reports removed."
        );


    } catch (error) {

        console.warn(
            "[FasalRakshak] Could not clean legacy localStorage:",
            error
        );
    }
}


/* Run cleanup immediately when this file loads. */

removeLegacyFakeReports();


/* ==========================================================================
   INITIALIZATION

   Kept only so older pages that call initMockData() do not crash.

   It intentionally creates NO data.
   ========================================================================== */

function initMockData() {

    removeLegacyFakeReports();

    console.log(
        "[FasalRakshak] Real-data mode active. No mock reports created."
    );
}


/* ==========================================================================
   LEGACY LOCAL REPORT ACCESS

   These helpers are retained only for backwards compatibility.

   Officer dashboard data must come from the FastAPI API.
   ========================================================================== */

function getAllReports() {

    try {

        removeLegacyFakeReports();


        const raw =
            localStorage.getItem(
                STORAGE_KEY
            );


        if (!raw) {
            return [];
        }


        const reports =
            JSON.parse(raw);


        return Array.isArray(reports)
            ? reports
            : [];


    } catch (error) {

        console.warn(
            "[FasalRakshak] Could not read legacy local reports:",
            error
        );


        return [];
    }
}


/* ==========================================================================
   GET ONE LEGACY LOCAL REPORT
   ========================================================================== */

function getReportById(id) {

    if (!id) {
        return null;
    }


    return (
        getAllReports().find(
            report =>
                String(report.id) ===
                String(id)
        )
        ||
        null
    );
}


/* ==========================================================================
   SAVE LOCAL REPORT

   This function does NOT perform AI assessment.

   It exists only so an older page does not fail if it still calls
   saveReport().

   The real Role 3 workflow should use IndexedDB / syncManager and send
   evidence to the FastAPI backend.
   ========================================================================== */

function saveReport(report) {

    if (
        !report ||
        typeof report !== "object"
    ) {

        console.warn(
            "[FasalRakshak] saveReport ignored invalid report."
        );

        return false;
    }


    try {

        const reports =
            getAllReports();


        const reportId =
            String(
                report.id || ""
            ).trim();


        if (reportId) {

            const existingIndex =
                reports.findIndex(
                    item =>
                        String(
                            item.id || ""
                        ) === reportId
                );


            if (existingIndex >= 0) {

                reports[existingIndex] =
                    report;

            } else {

                reports.unshift(
                    report
                );
            }


        } else {

            reports.unshift(
                report
            );
        }


        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(reports)
        );


        return true;


    } catch (error) {

        console.error(
            "[FasalRakshak] Could not save local compatibility report:",
            error
        );


        return false;
    }
}


/* ==========================================================================
   UPDATE LEGACY LOCAL STATUS

   Real officer decisions must be saved through the FastAPI officer API.

   This is kept only for older page compatibility.
   ========================================================================== */

function updateReportStatus(
    id,
    newStatus,
    remark
) {

    if (!id) {
        return false;
    }


    try {

        const reports =
            getAllReports();


        const index =
            reports.findIndex(
                report =>
                    String(
                        report.id || ""
                    ) ===
                    String(id)
            );


        if (index === -1) {
            return false;
        }


        reports[index].status =
            newStatus;


        if (
            remark !== undefined
        ) {

            reports[index].officerRemark =
                remark;
        }


        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(reports)
        );


        return true;


    } catch (error) {

        console.error(
            "[FasalRakshak] Could not update local compatibility report:",
            error
        );


        return false;
    }
}


/* ==========================================================================
   AI ASSESSMENT COMPATIBILITY FUNCTION

   CRITICAL:
   This function NEVER generates a prediction.

   Real prediction, confidence, evidence trust, duplicate detection,
   RAG safety and other intelligence must come from FastAPI.

   Damage percentage is intentionally null because the current prototype
   does not have a validated field-loss estimation model.
   ========================================================================== */

function mockAIAssessment(
    crop,
    damageType
) {

    console.warn(
        "[FasalRakshak] Legacy mockAIAssessment() was called. " +
        "No synthetic AI result will be generated. " +
        "Use the FastAPI assessment endpoint."
    );


    return {

        crop:
            crop || null,

        prediction:
            null,

        damageType:
            null,

        damagePercent:
            null,

        damagePercentage:
            null,

        confidence:
            null,

        evidenceValid:
            false,

        risk:
            "Needs Review",

        status:
            "Awaiting Backend AI Assessment",

        source:
            "backend_required",

        humanVerificationRequired:
            true
    };
}


/* ==========================================================================
   LEGACY REPORT ID GENERATOR

   This is only for compatibility with older frontend code.

   Backend-generated report/evidence identifiers remain authoritative.
   ========================================================================== */

function generateReportId() {

    const reports =
        getAllReports();


    const numbers =
        reports
            .map(report => {

                const id =
                    String(
                        report.id || ""
                    );


                const match =
                    id.match(
                        /^FR-(\d+)$/
                    );


                return match
                    ? Number(match[1])
                    : null;
            })
            .filter(
                value =>
                    Number.isFinite(value)
            );


    const next =
        numbers.length
            ? Math.max(...numbers) + 1
            : 1001;


    return `FR-${next}`;
}


/* ==========================================================================
   DEVELOPMENT SAFETY MESSAGE
   ========================================================================== */

console.log(
    "[FasalRakshak AI] mockData.js compatibility layer loaded — " +
    "sample data and synthetic AI are disabled."
);