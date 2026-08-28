/* ==========================================================================
   officer.js
   FasalRakshak AI
   Real Officer Dashboard + Evidence Image + RAG + Human Verification
   ========================================================================== */

let officerReports = [];


/* ==========================================================================
   SAFE HTML HELPERS
   ========================================================================== */

function escapeHTML(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function escapeAttribute(value) {
    return escapeHTML(value);
}


/* ==========================================================================
   BACKEND URL HELPER

   API_BASE_URL from api.js:
   https://fasalrakshak-ai-backend.onrender.com/api/v1

   Uploaded images:
   https://fasalrakshak-ai-backend.onrender.com/uploads/filename.jpg
   ========================================================================== */

function getBackendBaseURL() {

    if (
        typeof API_BASE_URL === "string"
    ) {
        return API_BASE_URL.replace(
            /\/api\/v1\/?$/,
            ""
        );
    }

    return "https://fasalrakshak-ai-backend.onrender.com";
}


/* ==========================================================================
   1. OFFICER DASHBOARD
   ========================================================================== */

async function initOfficerDashboard() {

    const searchInput =
        document.getElementById(
            "searchInput"
        );

    const statusFilter =
        document.getElementById(
            "statusFilter"
        );

    const refreshBtn =
        document.getElementById(
            "refreshReportsBtn"
        );

    const logoutBtn =
        document.getElementById(
            "officerLogoutBtn"
        );

    const dashboardStatus =
        document.getElementById(
            "dashboardStatus"
        );

    const officerIdentity =
        document.getElementById(
            "officerIdentity"
        );


    /* ----------------------------------------------------------------------
       OFFICER LOGIN
       ---------------------------------------------------------------------- */

    async function ensureOfficerLogin() {

        const existingToken =
            getOfficerToken();


        if (existingToken) {
            return existingToken;
        }


        const username =
            window.prompt(
                "Officer username:"
            );


        if (!username) {
            throw new Error(
                "Officer username is required."
            );
        }


        const password =
            window.prompt(
                "Officer password:"
            );


        if (!password) {
            throw new Error(
                "Officer password is required."
            );
        }


        const login =
            await loginOfficer(
                username.trim(),
                password
            );


        if (officerIdentity) {

            officerIdentity.textContent =
                login.full_name ||
                login.username ||
                "Officer";

        }


        return login.access_token;
    }


    /* ----------------------------------------------------------------------
       LOAD REPORTS
       ---------------------------------------------------------------------- */

    async function loadReports() {

        try {

            if (dashboardStatus) {
                dashboardStatus.textContent =
                    "Connecting to backend...";
            }


            await ensureOfficerLogin();


            if (dashboardStatus) {
                dashboardStatus.textContent =
                    "Loading live farmer reports...";
            }


            const reports =
                await getOfficerReports();


            officerReports =
                Array.isArray(reports)
                    ? reports
                    : [reports];


            renderStats();

            renderTable();


            if (dashboardStatus) {

                dashboardStatus.textContent =
                    `Connected · ${officerReports.length} report(s) loaded`;

            }

        }

        catch (error) {

            console.error(
                "Officer dashboard error:",
                error
            );


            if (dashboardStatus) {

                dashboardStatus.textContent =
                    `Error: ${error.message}`;

            }


            const tableEl =
                document.getElementById(
                    "reportTable"
                );


            if (tableEl) {

                tableEl.innerHTML = `

                    <div class="empty-state">

                        ${escapeHTML(
                            error.message
                        )}

                    </div>

                `;

            }

        }
    }


    /* ----------------------------------------------------------------------
       DASHBOARD STATS
       ---------------------------------------------------------------------- */

    function renderStats() {

        const total =
            document.getElementById(
                "statTotal"
            );

        const pending =
            document.getElementById(
                "statPending"
            );

        const review =
            document.getElementById(
                "statReview"
            );

        const verified =
            document.getElementById(
                "statVerified"
            );


        if (total) {

            total.textContent =
                officerReports.length;

        }


        if (pending) {

            pending.textContent =
                officerReports.filter(
                    report =>
                        report.status === "Pending"
                ).length;

        }


        if (review) {

            review.textContent =
                officerReports.filter(
                    report =>
                        report.status === "Under Review"
                ).length;

        }


        if (verified) {

            verified.textContent =
                officerReports.filter(
                    report =>
                        report.status === "Verified"
                ).length;

        }

    }


    /* ----------------------------------------------------------------------
       REPORT TABLE
       ---------------------------------------------------------------------- */

    function renderTable() {

        const tableEl =
            document.getElementById(
                "reportTable"
            );


        if (!tableEl) return;


        const query =
            searchInput
                ? searchInput.value
                    .trim()
                    .toLowerCase()
                : "";


        const selectedStatus =
            statusFilter
                ? statusFilter.value
                : "";


        let filtered =
            [...officerReports];


        /* Search */

        if (query) {

            filtered =
                filtered.filter(
                    report => {

                        const searchable = [

                            report.evidence_id,

                            report.farmer_name,

                            report.username,

                            report.crop,

                            report.damage_type,

                            report.description,

                            report.phone

                        ]

                            .filter(Boolean)

                            .join(" ")

                            .toLowerCase();


                        return searchable.includes(
                            query
                        );

                    }
                );

        }


        /* Status filter */

        if (selectedStatus) {

            filtered =
                filtered.filter(
                    report =>
                        report.status ===
                        selectedStatus
                );

        }


        /* Empty */

        if (
            filtered.length === 0
        ) {

            tableEl.innerHTML = `

                <div class="empty-state">

                    No reports match your search/filter.

                </div>

            `;

            return;

        }


        /* Render */

        tableEl.innerHTML =

            filtered.map(
                report => {

                    const assessment =
                        report.assessment || {};


                    const confidence =
                        assessment.confidence ??
                        "—";


                    const risk =
                        assessment.risk_level ||
                        "—";


                    const prediction =
                        report.damage_type ||
                        "Assessment pending";


                    const farmerName =
                        report.farmer_name ||
                        report.username ||
                        "Unknown Farmer";


                    return `

                        <a

                            href="report-detail.html?id=${encodeURIComponent(
                                report.evidence_id
                            )}"

                            class="report-row"

                            style="
                                display:flex;
                                justify-content:space-between;
                                align-items:center;
                                text-decoration:none;
                            "

                        >

                            <div>

                                <div class="report-id">

                                    ${escapeHTML(
                                        report.evidence_id
                                    )}

                                    ·

                                    ${escapeHTML(
                                        farmerName
                                    )}

                                </div>


                                <div class="report-meta">

                                    ${escapeHTML(
                                        report.crop ||
                                        "Unknown Crop"
                                    )}

                                    ·

                                    ${escapeHTML(
                                        prediction
                                    )}

                                    · Confidence

                                    ${
                                        confidence === "—"
                                            ? "—"
                                            : `${confidence}%`
                                    }

                                    · Risk

                                    ${escapeHTML(
                                        risk
                                    )}

                                    ·

                                    ${formatDateTime(
                                        report.created_at
                                    )}

                                </div>


                                ${
                                    report.description

                                        ? `

                                            <div class="report-meta">

                                                ${escapeHTML(
                                                    report.description
                                                )}

                                            </div>

                                        `

                                        : ""
                                }

                            </div>


                            ${statusBadgeHTML(
                                report.status ||
                                "Pending"
                            )}

                        </a>

                    `;

                }

            ).join("");

    }


    /* ----------------------------------------------------------------------
       EVENTS
       ---------------------------------------------------------------------- */

    if (searchInput) {

        searchInput.addEventListener(
            "input",
            renderTable
        );

    }


    if (statusFilter) {

        statusFilter.addEventListener(
            "change",
            renderTable
        );

    }


    if (refreshBtn) {

        refreshBtn.addEventListener(
            "click",
            loadReports
        );

    }


    if (logoutBtn) {

        logoutBtn.addEventListener(

            "click",

            () => {

                localStorage.removeItem(
                    "officer_token"
                );


                window.location.href =
                    "../index.html";

            }

        );

    }


    await loadReports();
}


/* ==========================================================================
   2. OFFICER REPORT DETAIL
   ========================================================================== */

async function renderReportDetail() {

    const id =
        getQueryParam(
            "id"
        );


    const container =
        document.getElementById(
            "detailContainer"
        );


    if (!container) return;


    if (!id) {

        container.innerHTML = `

            <div class="empty-state">

                Evidence ID missing.

            </div>

        `;

        return;

    }


    try {

        /* ------------------------------------------------------------------
           Ensure officer authentication
           ------------------------------------------------------------------ */

        let token =
            getOfficerToken();


        if (!token) {

            const username =
                window.prompt(
                    "Officer username:"
                );


            if (!username) {

                throw new Error(
                    "Officer username is required."
                );

            }


            const password =
                window.prompt(
                    "Officer password:"
                );


            if (!password) {

                throw new Error(
                    "Officer password is required."
                );

            }


            const login =
                await loginOfficer(
                    username.trim(),
                    password
                );


            token =
                login.access_token;

        }


        /* ------------------------------------------------------------------
           Get ONE real report
           ------------------------------------------------------------------ */

        let report;


        if (
            typeof getOfficerReport ===
            "function"
        ) {

            report =
                await getOfficerReport(
                    id
                );

        }

        else {

            let reports =
                await getOfficerReports();


            if (
                !Array.isArray(reports)
            ) {

                reports = [reports];

            }


            report =
                reports.find(
                    item =>
                        item.evidence_id ===
                        id
                );

        }


        if (!report) {

            container.innerHTML = `

                <div class="empty-state">

                    Report not found.

                </div>

            `;

            return;

        }


        const assessment =
            report.assessment || {};


        const reportIdTag =
            document.getElementById(
                "reportIdTag"
            );


        if (reportIdTag) {

            reportIdTag.textContent =
                report.evidence_id;

        }


        /* ------------------------------------------------------------------
           EVIDENCE IMAGE URL
           ------------------------------------------------------------------ */

        const evidenceImageURL =

            report.filename

                ? `${getBackendBaseURL()}/uploads/${encodeURIComponent(
                    report.filename
                )}`

                : null;


        /* ------------------------------------------------------------------
           RAG arrays
           ------------------------------------------------------------------ */

        const symptoms =
            Array.isArray(
                assessment.symptoms
            )

                ? assessment.symptoms

                : [];


        const actions =
            Array.isArray(
                assessment.recommended_actions
            )

                ? assessment.recommended_actions

                : [];


        /* ------------------------------------------------------------------
           Evidence image HTML
           ------------------------------------------------------------------ */

        const evidenceImageHTML =

            evidenceImageURL

                ? `

                    <div class="card">

                        <div class="card-title">

                            Submitted Crop Evidence

                        </div>


                        <p class="muted mt-2">

                            Original crop image submitted
                            by the farmer for AI assessment
                            and officer verification.

                        </p>


                        <div
                            style="
                                margin-top:14px;
                                width:100%;
                                display:flex;
                                justify-content:center;
                            "
                        >

                            <img

                                src="${escapeAttribute(
                                    evidenceImageURL
                                )}"

                                alt="Farmer submitted crop evidence"

                                style="
                                    display:block;
                                    width:100%;
                                    max-width:620px;
                                    max-height:520px;
                                    object-fit:contain;
                                    border-radius:12px;
                                    border:1px solid var(--color-border);
                                    background:#f5f5f5;
                                "

                                onerror="
                                    this.style.display='none';
                                    this.nextElementSibling.style.display='block';
                                "

                            />


                            <div

                                class="empty-state"

                                style="display:none;"

                            >

                                Crop evidence image could
                                not be loaded.

                            </div>

                        </div>


                        <a

                            href="${escapeAttribute(
                                evidenceImageURL
                            )}"

                            target="_blank"

                            rel="noopener noreferrer"

                            class="btn btn-outline mt-3"

                        >

                            🔍 Open Original Evidence Image

                        </a>

                    </div>

                `

                : `

                    <div class="card">

                        <div class="card-title">

                            Submitted Crop Evidence

                        </div>

                        <p class="muted mt-2">

                            No evidence image filename
                            is available for this report.

                        </p>

                    </div>

                `;


        /* ------------------------------------------------------------------
           Symptoms HTML
           ------------------------------------------------------------------ */

        const symptomsHTML =

            symptoms.length

                ? `

                    <div class="card mt-3">

                        <div class="card-title">

                            Observed Disease Symptoms

                        </div>


                        <ul
                            style="
                                padding-left:20px;
                                margin-top:12px;
                            "
                        >

                            ${symptoms

                                .map(

                                    symptom => `

                                        <li
                                            style="
                                                margin-bottom:8px;
                                            "
                                        >

                                            ${escapeHTML(
                                                symptom
                                            )}

                                        </li>

                                    `

                                )

                                .join("")}

                        </ul>

                    </div>

                `

                : "";


        /* ------------------------------------------------------------------
           Recommended actions
           ------------------------------------------------------------------ */

        const actionsHTML =

            actions.length

                ? `

                    <div class="card mt-3">

                        <div class="card-title">

                            Recommended Next Actions

                        </div>


                        <ul
                            style="
                                padding-left:20px;
                                margin-top:12px;
                            "
                        >

                            ${actions

                                .map(

                                    action => `

                                        <li
                                            style="
                                                margin-bottom:8px;
                                            "
                                        >

                                            ${escapeHTML(
                                                action
                                            )}

                                        </li>

                                    `

                                )

                                .join("")}

                        </ul>

                    </div>

                `

                : "";


        /* ------------------------------------------------------------------
           Official source
           ------------------------------------------------------------------ */

        const sourceHTML =

            assessment.source_name

                ? `

                    <div class="card mt-3">

                        <div class="card-title">

                            Official Knowledge Source

                        </div>


                        <p class="mt-2">

                            ${escapeHTML(
                                assessment.source_name
                            )}

                        </p>


                        ${
                            assessment.source_url

                                ? `

                                    <a

                                        href="${escapeAttribute(
                                            assessment.source_url
                                        )}"

                                        target="_blank"

                                        rel="noopener noreferrer"

                                        class="btn btn-outline mt-2"

                                    >

                                        View Official Source

                                    </a>

                                `

                                : `

                                    <p class="muted mt-2">

                                        Source URL not available.

                                    </p>

                                `
                        }

                    </div>

                `

                : "";


        /* ------------------------------------------------------------------
           RAG labels
           ------------------------------------------------------------------ */

        const groundedText =

            assessment.grounded === true

                ? "Grounded"

                : assessment.grounded === false

                    ? "Not Grounded"

                    : "—";


        const humanVerificationText =

            assessment
                .human_verification_required ===
                false

                ? "Not Required"

                : "Required";


        /* ==================================================================
           RENDER PAGE
           ================================================================== */

        container.innerHTML = `


            <!-- ===========================================================
                 FARMER / REPORT DETAILS
                 =========================================================== -->

            <div class="card">

                <h2>

                    ${escapeHTML(
                        report.crop ||
                        "Crop"
                    )}

                    —

                    ${escapeHTML(
                        report.damage_type ||
                        "Assessment Pending"
                    )}

                </h2>


                <p class="muted mt-2">

                    👤

                    ${escapeHTML(
                        report.farmer_name ||
                        report.username ||
                        "Unknown Farmer"
                    )}

                    ${
                        report.phone

                            ? `· ${escapeHTML(
                                report.phone
                            )}`

                            : ""
                    }

                </p>


                <p class="muted">

                    📍

                    ${report.latitude ?? "—"},

                    ${report.longitude ?? "—"}

                    &nbsp;·&nbsp;

                    🕐

                    ${formatDateTime(
                        report.created_at
                    )}

                </p>


                ${
                    report.description

                        ? `

                            <p class="mt-3">

                                ${escapeHTML(
                                    report.description
                                )}

                            </p>

                        `

                        : ""
                }


                <div class="mt-3">

                    ${statusBadgeHTML(
                        report.status ||
                        "Pending"
                    )}

                </div>

            </div>


            <!-- ===========================================================
                 REAL FARMER IMAGE
                 =========================================================== -->

            ${evidenceImageHTML}


            <!-- ===========================================================
                 AI + RAG ASSESSMENT
                 =========================================================== -->

            <div class="card ai-card">

                <div class="ai-header">

                    <span class="ai-badge">

                        AI + RAG Assessment

                    </span>

                </div>


                <div class="metric-grid">


                    <div class="metric-box">

                        <div class="metric-value">

                            ${
                                assessment.confidence !=
                                null

                                    ? `${assessment.confidence}%`

                                    : "—"
                            }

                        </div>

                        <div class="metric-label">

                            Confidence

                        </div>

                    </div>


                    <div class="metric-box">

                        <div class="metric-value">

                            ${
                                assessment.evidence_valid ===
                                true

                                    ? "Valid"

                                    : assessment.evidence_valid ===
                                      false

                                        ? "Retake"

                                        : "—"
                            }

                        </div>

                        <div class="metric-label">

                            Evidence Status

                        </div>

                    </div>


                    <div class="metric-box">

                        <div class="metric-value">

                            ${escapeHTML(
                                assessment.risk_level ||
                                "—"
                            )}

                        </div>

                        <div class="metric-label">

                            Risk Level

                        </div>

                    </div>


                    <div class="metric-box">

                        <div class="metric-value">

                            ${escapeHTML(
                                report.status ||
                                "Pending"
                            )}

                        </div>

                        <div class="metric-label">

                            Officer Status

                        </div>

                    </div>


                    <div class="metric-box">

                        <div class="metric-value">

                            ${groundedText}

                        </div>

                        <div class="metric-label">

                            RAG Grounding

                        </div>

                    </div>


                    <div class="metric-box">

                        <div class="metric-value">

                            ${humanVerificationText}

                        </div>

                        <div class="metric-label">

                            Human Verification

                        </div>

                    </div>

                </div>


                ${
                    assessment.explanation

                        ? `

                            <div class="card mt-3">

                                <div class="card-title">

                                    AI / RAG Explanation

                                </div>

                                <p class="mt-2">

                                    ${escapeHTML(
                                        assessment.explanation
                                    )}

                                </p>

                            </div>

                        `

                        : ""
                }


                <div class="disclaimer">

                    <strong>

                        Human Verification Required.

                    </strong>

                    This AI and RAG assessment is
                    preliminary supporting evidence.

                    Final verification must be
                    completed by an authorized
                    agricultural officer.

                </div>

            </div>


            ${symptomsHTML}


            ${actionsHTML}


            ${sourceHTML}


            <!-- ===========================================================
                 EXISTING REMARK
                 =========================================================== -->

            ${
                report.officer_remark

                    ? `

                        <div class="card">

                            <div class="card-title">

                                Existing Officer Remark

                            </div>

                            <p class="mt-2">

                                ${escapeHTML(
                                    report.officer_remark
                                )}

                            </p>

                        </div>

                    `

                    : ""
            }


            <!-- ===========================================================
                 OFFICER DECISION
                 =========================================================== -->

            <div class="card">

                <div class="card-title mb-3">

                    Officer Decision

                </div>


                <label

                    for="remarkInput"

                    style="
                        font-size:14px;
                        font-weight:600;
                        display:block;
                        margin-bottom:8px;
                    "

                >

                    Officer Remark

                </label>


                <textarea

                    id="remarkInput"

                    placeholder="Add a note about your decision..."

                    style="
                        width:100%;
                        min-height:80px;
                        padding:12px;
                        border:1.5px solid var(--color-border);
                        border-radius:8px;
                        font-family:inherit;
                        margin-bottom:14px;
                    "

                >${escapeHTML(
                    report.officer_remark ||
                    ""
                )}</textarea>


                <button

                    class="btn btn-primary mb-3"

                    id="verifyBtn"

                >

                    ✅ Verify Report

                </button>


                <button

                    class="btn btn-warning mb-3"

                    id="reviewBtn"

                >

                    🔍 Mark Under Review

                </button>


                <button

                    class="btn btn-danger"

                    id="rejectBtn"

                >

                    ❌ Reject Evidence

                </button>

            </div>

        `;


        /* ==================================================================
           DECISION HANDLERS
           ================================================================== */

        const remarkInput =
            document.getElementById(
                "remarkInput"
            );


        async function saveDecision(
            status
        ) {

            try {

                const result =
                    await updateOfficerDecision(

                        report.evidence_id,

                        status,

                        remarkInput.value.trim()

                    );


                alert(

                    `Decision updated: ${
                        result.decision ||
                        status
                    }`

                );


                window.location.reload();

            }

            catch (error) {

                console.error(
                    error
                );


                alert(
                    error.message
                );

            }

        }


        /* Verify */

        const verifyBtn =
            document.getElementById(
                "verifyBtn"
            );


        if (verifyBtn) {

            verifyBtn.addEventListener(

                "click",

                () =>
                    saveDecision(
                        "Verified"
                    )

            );

        }


        /* Under Review */

        const reviewBtn =
            document.getElementById(
                "reviewBtn"
            );


        if (reviewBtn) {

            reviewBtn.addEventListener(

                "click",

                () =>
                    saveDecision(
                        "Under Review"
                    )

            );

        }


        /* Reject */

        const rejectBtn =
            document.getElementById(
                "rejectBtn"
            );


        if (rejectBtn) {

            rejectBtn.addEventListener(

                "click",

                () => {

                    if (
                        !remarkInput
                            .value
                            .trim()
                    ) {

                        alert(
                            "Please add a reason before rejecting evidence."
                        );


                        return;

                    }


                    const confirmed =
                        confirm(
                            "Reject this evidence?"
                        );


                    if (!confirmed) {

                        return;

                    }


                    saveDecision(
                        "Rejected"
                    );

                }

            );

        }

    }

    catch (error) {

        console.error(
            "Report detail error:",
            error
        );


        container.innerHTML = `

            <div class="empty-state">

                ${escapeHTML(
                    error.message
                )}

            </div>

        `;

    }

}
