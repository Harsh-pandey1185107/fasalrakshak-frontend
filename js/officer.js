/* ==========================================================================
   officer.js
   FasalRakshak AI
   Role 5 Officer Dashboard integrated with Role 4 backend intelligence
   ========================================================================== */

let officerReports = [];
let officerCases = [];


/* ==========================================================================
   SAFE HELPERS
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


function safeExternalURL(value) {
    const text = String(value || "").trim();

    return /^https?:\/\//i.test(text)
        ? text
        : null;
}


function getBackendBaseURL() {
    if (typeof API_BASE_URL === "string") {
        return API_BASE_URL.replace(
            /\/api\/v1\/?$/,
            ""
        );
    }

    return "http://127.0.0.1:8000";
}


function readQueryParam(name) {
    if (typeof getQueryParam === "function") {
        return getQueryParam(name);
    }

    return new URLSearchParams(
        window.location.search
    ).get(name);
}


function formatDateSafe(value) {
    if (!value) {
        return "—";
    }

    if (typeof formatDateTime === "function") {
        try {
            return formatDateTime(value);
        }
        catch (_) {
        }
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return date.toLocaleString();
}


function statusBadgeSafe(status) {
    if (typeof statusBadgeHTML === "function") {
        try {
            return statusBadgeHTML(
                status || "Pending"
            );
        }
        catch (_) {
        }
    }

    return `
        <span
            style="
                display:inline-block;
                padding:6px 10px;
                border-radius:999px;
                background:#eef2f7;
                font-size:12px;
                font-weight:700;
            "
        >
            ${escapeHTML(
                status || "Pending"
            )}
        </span>
    `;
}


function valueOrDash(value) {
    return (
        value === null ||
        value === undefined ||
        value === ""
    )
        ? "—"
        : value;
}


/* ==========================================================================
   CASE GROUPING
   ========================================================================== */

function reportTimeValue(report) {
    const raw =
        report?.captured_at ||
        report?.created_at ||
        report?.uploaded_at ||
        "";

    const parsed = Date.parse(raw);

    return Number.isNaN(parsed)
        ? 0
        : parsed;
}


function getCaseKey(report) {
    return report?.report_id
        ? String(report.report_id)
        : `legacy:${report?.evidence_id}`;
}


function choosePrimaryEvidence(items) {
    const sorted =
        [...items].sort(
            (a, b) =>
                reportTimeValue(b) -
                reportTimeValue(a)
        );

    return (
        sorted.find(
            item =>
                item.assessment &&
                typeof item.assessment === "object"
        ) ||
        sorted[0]
    );
}


function deriveCaseStatus(items) {
    const statuses =
        items.map(
            item =>
                item.status ||
                "Pending"
        );

    if (statuses.includes("Under Review")) {
        return "Under Review";
    }

    if (statuses.includes("Pending")) {
        return "Pending";
    }

    if (
        statuses.length > 0 &&
        statuses.every(
            status => status === "Verified"
        )
    ) {
        return "Verified";
    }

    if (
        statuses.length > 0 &&
        statuses.every(
            status => status === "Rejected"
        )
    ) {
        return "Rejected";
    }

    const newest =
        [...items].sort(
            (a, b) =>
                reportTimeValue(b) -
                reportTimeValue(a)
        )[0];

    return newest?.status || "Pending";
}


function buildOfficerCases(reports) {
    const groups = new Map();

    for (const report of reports) {

        const key = getCaseKey(report);

        if (!groups.has(key)) {
            groups.set(
                key,
                {
                    key: key,
                    report_id:
                        report.report_id ||
                        null,
                    evidence: []
                }
            );
        }

        groups
            .get(key)
            .evidence
            .push(report);
    }


    return [...groups.values()]
        .map(
            caseItem => {

                caseItem.evidence.sort(
                    (a, b) =>
                        reportTimeValue(a) -
                        reportTimeValue(b)
                );

                caseItem.primary =
                    choosePrimaryEvidence(
                        caseItem.evidence
                    );

                caseItem.status =
                    deriveCaseStatus(
                        caseItem.evidence
                    );

                return caseItem;
            }
        )
        .sort(
            (a, b) =>
                reportTimeValue(
                    b.primary
                ) -
                reportTimeValue(
                    a.primary
                )
        );
}


function caseSearchText(caseItem) {
    const values = [
        caseItem.report_id,
        caseItem.key,
        caseItem.status
    ];

    for (const report of caseItem.evidence) {

        values.push(
            report.evidence_id,
            report.farmer_name,
            report.username,
            report.phone,
            report.crop,
            report.damage_type,
            report.description,
            report.officer_diagnosis,
            report.officer_remark,
            report.offline_image_id
        );
    }

    return values
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
}


/* ==========================================================================
   INTELLIGENCE HELPERS
   ========================================================================== */

function getTrust(report) {

    const assessment =
        report?.assessment || {};

    const trust =
        assessment.evidence_trust &&
        typeof assessment.evidence_trust === "object"
            ? assessment.evidence_trust
            : {};

    return {
        score:
            trust.trust_score ??
            null,

        level:
            trust.trust_level ||
            "UNKNOWN",

        priority:
            trust.officer_priority ||
            "UNKNOWN",

        usable:
            trust.evidence_usable ??
            null,

        human:
            trust.human_verification_required ??
            assessment.human_verification_required ??
            true,

        reasons:
            Array.isArray(trust.reasons)
                ? trust.reasons
                : [],

        warnings:
            Array.isArray(trust.warnings)
                ? trust.warnings
                : []
    };
}


function getDuplicate(report) {

    const assessment =
        report?.assessment || {};

    const duplicateData =
        assessment.duplicate_detection &&
        typeof assessment.duplicate_detection === "object"
            ? assessment.duplicate_detection
            : {};

    const type =
        duplicateData.duplicate_type ||
        report?.duplicate_status ||
        "unknown";

    return {
        duplicate:
            duplicateData.duplicate ??
            (
                type === "exact" ||
                type === "near_duplicate"
            ),

        type: type,

        distance:
            duplicateData.hamming_distance ??
            null,

        risk:
            duplicateData.risk_level ||
            "unknown",

        manual:
            duplicateData.manual_review_required ??
            (
                type === "exact" ||
                type === "near_duplicate"
            ),

        reason:
            duplicateData.reason ||
            null,

        fraud:
            duplicateData.fraud_determination ||
            "not_determined"
    };
}


function getRag(report) {

    const assessment =
        report?.assessment || {};

    const gate =
        assessment.rag_safety &&
        typeof assessment.rag_safety === "object"
            ? assessment.rag_safety
            : {};

    return {
        allowed:
            gate.rag_allowed ??
            null,

        status:
            gate.rag_status ||
            (
                assessment.grounded === true
                    ? "GROUNDED"
                    : "UNAVAILABLE"
            ),

        mode:
            gate.explanation_mode ||
            null,

        farmerMessage:
            gate.farmer_message ||
            assessment.explanation ||
            null,

        officerMessage:
            gate.officer_message ||
            null,

        symptoms:
            Array.isArray(
                assessment.symptoms
            )
                ? assessment.symptoms
                : [],

        actions:
            Array.isArray(
                assessment.recommended_actions
            )
                ? assessment.recommended_actions
                : [],

        sourceName:
            assessment.source_name ||
            null,

        sourceURL:
            safeExternalURL(
                assessment.source_url
            ),

        grounded:
            assessment.grounded ??
            null,

        human:
            assessment.human_verification_required ??
            true
    };
}


function getGradCam(report) {

    const assessment =
        report?.assessment || {};

    const raw =
        assessment.gradcam ||
        assessment.grad_cam ||
        report?.gradcam ||
        report?.grad_cam ||
        null;

    if (
        !raw ||
        typeof raw !== "object"
    ) {
        return null;
    }

    return {
        status:
            raw.status ||
            "AVAILABLE",

        image:
            raw.overlay_url ||
            raw.overlay_relative_path ||
            raw.image_url ||
            null,

        explanation:
            raw.explanation ||
            raw.reason ||
            null,

        layer:
            raw.feature_layer ||
            null
    };
}


/* ==========================================================================
   OFFICER LOGIN
   ========================================================================== */

async function ensureOfficerLogin(
    officerIdentity = null
) {

    let token = getOfficerToken();

    if (token) {
        return token;
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


/* ==========================================================================
   OFFICER DASHBOARD
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
                officerCases.length;
        }

        if (pending) {

            pending.textContent =
                officerCases.filter(
                    caseItem =>
                        caseItem.status ===
                        "Pending"
                ).length;
        }

        if (review) {

            review.textContent =
                officerCases.filter(
                    caseItem =>
                        caseItem.status ===
                        "Under Review"
                ).length;
        }

        if (verified) {

            verified.textContent =
                officerCases.filter(
                    caseItem =>
                        caseItem.status ===
                        "Verified"
                ).length;
        }
    }


    function renderTable() {

        const tableEl =
            document.getElementById(
                "reportTable"
            );

        if (!tableEl) {
            return;
        }

        const query =
            searchInput
                ? searchInput
                    .value
                    .trim()
                    .toLowerCase()
                : "";

        const selectedStatus =
            statusFilter
                ? statusFilter.value
                : "";

        let filtered =
            [...officerCases];

        if (query) {

            filtered =
                filtered.filter(
                    caseItem =>
                        caseSearchText(
                            caseItem
                        ).includes(query)
                );
        }

        if (selectedStatus) {

            filtered =
                filtered.filter(
                    caseItem =>
                        caseItem.status ===
                        selectedStatus
                );
        }

        if (filtered.length === 0) {

            tableEl.innerHTML = `
                <div class="empty-state">
                    No cases match your search/filter.
                </div>
            `;

            return;
        }

        tableEl.innerHTML =
            filtered.map(
                caseItem => {

                    const primary =
                        caseItem.primary || {};

                    const assessment =
                        primary.assessment || {};

                    const farmer =
                        primary.farmer_name ||
                        primary.username ||
                        "Unknown Farmer";

                    const confidence =
                        assessment.confidence ??
                        "—";

                    const risk =
                        assessment.risk_level ||
                        "—";

                    const prediction =
                        assessment.prediction ||
                        primary.damage_type ||
                        "Assessment pending";

                    const caseLabel =
                        caseItem.report_id ||
                        primary.evidence_id;

                    const imageCount =
                        caseItem.evidence.length;

                    return `
                        <a
                            href="report-detail.html?id=${encodeURIComponent(
                                primary.evidence_id
                            )}"

                            class="report-row"

                            style="
                                display:flex;
                                justify-content:space-between;
                                align-items:center;
                                text-decoration:none;
                                gap:16px;
                            "
                        >

                            <div>

                                <div class="report-id">

                                    ${escapeHTML(
                                        caseLabel
                                    )}

                                    ·

                                    ${escapeHTML(
                                        farmer
                                    )}

                                </div>


                                <div class="report-meta">

                                    ${escapeHTML(
                                        primary.crop ||
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
                                            : `${escapeHTML(
                                                confidence
                                            )}%`
                                    }

                                    · Risk

                                    ${escapeHTML(
                                        risk
                                    )}

                                    ·

                                    ${imageCount}

                                    evidence image${
                                        imageCount === 1
                                            ? ""
                                            : "s"
                                    }

                                    ·

                                    ${escapeHTML(
                                        formatDateSafe(
                                            primary.created_at ||
                                            primary.captured_at
                                        )
                                    )}

                                </div>

                            </div>


                            ${statusBadgeSafe(
                                caseItem.status
                            )}

                        </a>
                    `;
                }
            ).join("");
    }


    async function loadReports() {

        try {

            if (dashboardStatus) {

                dashboardStatus.textContent =
                    "Connecting to backend...";
            }

            await ensureOfficerLogin(
                officerIdentity
            );

            if (dashboardStatus) {

                dashboardStatus.textContent =
                    "Loading live farmer cases...";
            }

            const reports =
                await getOfficerReports();

            officerReports =
                Array.isArray(reports)
                    ? reports
                    : [reports];

            officerCases =
                buildOfficerCases(
                    officerReports
                );

            renderStats();

            renderTable();

            if (dashboardStatus) {

                dashboardStatus.textContent =
                    `Connected · ${officerCases.length} case(s) · ${officerReports.length} evidence item(s)`;
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

                removeOfficerToken();

                window.location.href =
                    "../index.html";
            }
        );
    }

    await loadReports();
}


/* ==========================================================================
   REPORT DETAIL / CASE VIEW
   ========================================================================== */

async function renderReportDetail() {

    const id =
        readQueryParam(
            "id"
        );

    const container =
        document.getElementById(
            "detailContainer"
        );

    if (!container) {
        return;
    }

    if (!id) {

        container.innerHTML = `
            <div class="empty-state">
                Evidence ID missing.
            </div>
        `;

        return;
    }

    try {

        await ensureOfficerLogin();

        let reports =
            await getOfficerReports();

        reports =
            Array.isArray(reports)
                ? reports
                : [reports];

        const selected =
            reports.find(
                report =>
                    report.evidence_id === id ||
                    report.report_id === id
            );

        if (!selected) {
            throw new Error(
                "Report not found."
            );
        }

        const caseKey =
            getCaseKey(
                selected
            );

        const caseEvidence =
            reports
                .filter(
                    report =>
                        getCaseKey(report) ===
                        caseKey
                )
                .sort(
                    (a, b) =>
                        reportTimeValue(a) -
                        reportTimeValue(b)
                );

        const primary =
            choosePrimaryEvidence(
                caseEvidence
            );

        const assessment =
            primary.assessment || {};

        const caseStatus =
            deriveCaseStatus(
                caseEvidence
            );

        const caseLabel =
            selected.report_id ||
            selected.evidence_id;

        const reportIdTag =
            document.getElementById(
                "reportIdTag"
            );

        if (reportIdTag) {
            reportIdTag.textContent =
                caseLabel;
        }


        const histories =
            await Promise.all(

                caseEvidence.map(
                    async report => {

                        try {

                            const history =
                                await getOfficerReviewHistory(
                                    report.evidence_id
                                );

                            return {
                                evidence_id:
                                    report.evidence_id,

                                history:
                                    history
                            };

                        }

                        catch (error) {

                            return {
                                evidence_id:
                                    report.evidence_id,

                                error:
                                    error.message,

                                history:
                                    null
                            };
                        }
                    }
                )
            );


        const evidenceCardsHTML =
            caseEvidence.map(

                (report, index) => {

                    const currentAssessment =
                        report.assessment || {};

                    const trust =
                        getTrust(report);

                    const duplicate =
                        getDuplicate(report);

                    const rag =
                        getRag(report);

                    const gradcam =
                        getGradCam(report);

                    const imageURL =
                        report.filename
                            ? `${getBackendBaseURL()}/uploads/${encodeURIComponent(
                                report.filename
                            )}`
                            : null;

                    const trustScore =
                        trust.score === null
                            ? "—"
                            : `${escapeHTML(
                                trust.score
                            )}/100`;

                    const duplicateText =
                        duplicate.duplicate
                            ? `${duplicate.type} duplicate · manual review required`
                            : duplicate.type === "none"
                                ? "No duplicate detected"
                                : "Duplicate status unknown";


                    const gradCamHTML =
                        gradcam
                            ? `
                                <div class="card mt-3">

                                    <div class="card-title">
                                        Grad-CAM / XAI
                                    </div>

                                    <p class="mt-2">
                                        <strong>Status:</strong>
                                        ${escapeHTML(
                                            gradcam.status
                                        )}
                                    </p>

                                    ${
                                        gradcam.layer
                                            ? `
                                                <p class="muted">
                                                    Feature layer:
                                                    ${escapeHTML(
                                                        gradcam.layer
                                                    )}
                                                </p>
                                            `
                                            : ""
                                    }

                                    ${
                                        gradcam.explanation
                                            ? `
                                                <p class="mt-2">
                                                    ${escapeHTML(
                                                        gradcam.explanation
                                                    )}
                                                </p>
                                            `
                                            : ""
                                    }

                                    ${
                                        gradcam.image
                                            ? `
                                                <img

                                                    src="${escapeAttribute(

                                                        /^https?:\/\//i.test(
                                                            gradcam.image
                                                        )
                                                            ? gradcam.image
                                                            : `${getBackendBaseURL()}/${String(
                                                                gradcam.image
                                                            ).replace(
                                                                /^\//,
                                                                ""
                                                            )}`
                                                    )}"

                                                    alt="Grad-CAM explanation"

                                                    style="
                                                        width:100%;
                                                        max-width:620px;
                                                        margin-top:12px;
                                                        border-radius:10px;
                                                    "
                                                />
                                            `
                                            : ""
                                    }

                                    <p class="muted mt-2">
                                        Explainability aid only.
                                        Human verification remains required.
                                    </p>

                                </div>
                            `
                            : "";


                    return `
                        <div
                            class="card mt-3"
                            style="
                                border-left:4px solid var(--color-border);
                            "
                        >

                            <div class="card-title">

                                Evidence
                                ${index + 1}
                                of
                                ${caseEvidence.length}

                            </div>


                            <p class="muted mt-2">

                                Evidence ID:

                                ${escapeHTML(
                                    report.evidence_id
                                )}

                                ${
                                    report.offline_image_id
                                        ? ` · Offline image ID:
                                           ${escapeHTML(
                                               report.offline_image_id
                                           )}`
                                        : ""
                                }

                            </p>


                            ${
                                imageURL
                                    ? `
                                        <div
                                            style="
                                                margin-top:14px;
                                                text-align:center;
                                            "
                                        >

                                            <img
                                                src="${escapeAttribute(
                                                    imageURL
                                                )}"

                                                alt="Farmer submitted crop evidence"

                                                style="
                                                    width:100%;
                                                    max-width:620px;
                                                    max-height:500px;
                                                    object-fit:contain;
                                                    border-radius:12px;
                                                    border:1px solid var(--color-border);
                                                    background:#f5f5f5;
                                                "
                                            />

                                        </div>


                                        <a
                                            href="${escapeAttribute(
                                                imageURL
                                            )}"

                                            target="_blank"

                                            rel="noopener noreferrer"

                                            class="btn btn-outline mt-3"
                                        >

                                            Open Original Evidence Image

                                        </a>
                                    `
                                    : `
                                        <div class="empty-state mt-3">
                                            No evidence image filename available.
                                        </div>
                                    `
                            }


                            <div class="metric-grid mt-3">

                                <div class="metric-box">

                                    <div class="metric-value">

                                        ${escapeHTML(
                                            currentAssessment.prediction ||
                                            report.damage_type ||
                                            "—"
                                        )}

                                    </div>

                                    <div class="metric-label">
                                        AI Prediction
                                    </div>

                                </div>


                                <div class="metric-box">

                                    <div class="metric-value">

                                        ${currentAssessment.confidence ?? "—"}

                                        ${
                                            currentAssessment.confidence != null
                                                ? "%"
                                                : ""
                                        }

                                    </div>

                                    <div class="metric-label">
                                        Confidence
                                    </div>

                                </div>


                                <div class="metric-box">

                                    <div class="metric-value">
                                        ${trustScore}
                                    </div>

                                    <div class="metric-label">
                                        Evidence Trust
                                    </div>

                                </div>


                                <div class="metric-box">

                                    <div class="metric-value">

                                        ${escapeHTML(
                                            trust.level
                                        )}

                                    </div>

                                    <div class="metric-label">
                                        Trust Level
                                    </div>

                                </div>


                                <div class="metric-box">

                                    <div class="metric-value">

                                        ${escapeHTML(
                                            trust.priority
                                        )}

                                    </div>

                                    <div class="metric-label">
                                        Officer Priority
                                    </div>

                                </div>


                                <div class="metric-box">

                                    <div class="metric-value">

                                        ${escapeHTML(
                                            rag.status
                                        )}

                                    </div>

                                    <div class="metric-label">
                                        RAG Safety
                                    </div>

                                </div>

                            </div>


                            <div class="card mt-3">

                                <div class="card-title">
                                    Evidence Integrity
                                </div>


                                <p class="mt-2">

                                    <strong>Duplicate:</strong>

                                    ${escapeHTML(
                                        duplicateText
                                    )}

                                </p>


                                ${
                                    duplicate.distance !== null
                                        ? `
                                            <p class="muted">

                                                dHash distance:

                                                ${escapeHTML(
                                                    duplicate.distance
                                                )}

                                            </p>
                                        `
                                        : ""
                                }


                                ${
                                    duplicate.reason
                                        ? `
                                            <p class="muted">
                                                ${escapeHTML(
                                                    duplicate.reason
                                                )}
                                            </p>
                                        `
                                        : ""
                                }


                                <p class="muted">

                                    Fraud determination:

                                    ${escapeHTML(
                                        duplicate.fraud
                                    )}

                                </p>

                            </div>


                            ${
                                rag.farmerMessage ||
                                rag.officerMessage
                                    ? `
                                        <div class="card mt-3">

                                            <div class="card-title">
                                                RAG / Explainable AI
                                            </div>


                                            ${
                                                rag.farmerMessage
                                                    ? `
                                                        <p class="mt-2">

                                                            <strong>
                                                                Explanation:
                                                            </strong>

                                                            ${escapeHTML(
                                                                rag.farmerMessage
                                                            )}

                                                        </p>
                                                    `
                                                    : ""
                                            }


                                            ${
                                                rag.officerMessage
                                                    ? `
                                                        <p class="mt-2">

                                                            <strong>
                                                                Officer note:
                                                            </strong>

                                                            ${escapeHTML(
                                                                rag.officerMessage
                                                            )}

                                                        </p>
                                                    `
                                                    : ""
                                            }


                                            <p class="muted mt-2">

                                                Grounded:

                                                ${
                                                    rag.grounded === true
                                                        ? "Yes"
                                                        : rag.grounded === false
                                                            ? "No"
                                                            : "—"
                                                }

                                                · Human verification:

                                                ${
                                                    rag.human
                                                        ? "Required"
                                                        : "Not required"
                                                }

                                            </p>

                                        </div>
                                    `
                                    : ""
                            }


                            ${
                                rag.symptoms.length
                                    ? `
                                        <div class="card mt-3">

                                            <div class="card-title">
                                                Symptoms
                                            </div>

                                            <ul>

                                                ${
                                                    rag.symptoms
                                                        .map(
                                                            symptom =>
                                                                `<li>${escapeHTML(
                                                                    symptom
                                                                )}</li>`
                                                        )
                                                        .join("")
                                                }

                                            </ul>

                                        </div>
                                    `
                                    : ""
                            }


                            ${
                                rag.actions.length
                                    ? `
                                        <div class="card mt-3">

                                            <div class="card-title">
                                                Recommended Actions
                                            </div>

                                            <ul>

                                                ${
                                                    rag.actions
                                                        .map(
                                                            action =>
                                                                `<li>${escapeHTML(
                                                                    action
                                                                )}</li>`
                                                        )
                                                        .join("")
                                                }

                                            </ul>

                                        </div>
                                    `
                                    : ""
                            }


                            ${
                                rag.sourceName
                                    ? `
                                        <div class="card mt-3">

                                            <div class="card-title">
                                                Knowledge Source
                                            </div>


                                            <p class="mt-2">

                                                ${escapeHTML(
                                                    rag.sourceName
                                                )}

                                            </p>


                                            ${
                                                rag.sourceURL
                                                    ? `
                                                        <a
                                                            class="btn btn-outline mt-2"

                                                            href="${escapeAttribute(
                                                                rag.sourceURL
                                                            )}"

                                                            target="_blank"

                                                            rel="noopener noreferrer"
                                                        >

                                                            View Source

                                                        </a>
                                                    `
                                                    : ""
                                            }

                                        </div>
                                    `
                                    : ""
                            }


                            ${gradCamHTML}

                        </div>
                    `;
                }
            ).join("");


        const historyHTML =
            histories.map(
                item => {

                    if (item.error) {

                        return `
                            <div class="card mt-2">

                                <strong>
                                    ${escapeHTML(
                                        item.evidence_id
                                    )}
                                </strong>

                                <p class="muted">

                                    History unavailable:

                                    ${escapeHTML(
                                        item.error
                                    )}

                                </p>

                            </div>
                        `;
                    }


                    const reviews =
                        Array.isArray(
                            item.history?.reviews
                        )
                            ? item.history.reviews
                            : [];


                    return `
                        <div class="card mt-2">

                            <div class="card-title">

                                ${escapeHTML(
                                    item.evidence_id
                                )}

                            </div>


                            ${
                                reviews.length
                                    ? reviews.map(
                                        review => `
                                            <div
                                                style="
                                                    padding:10px 0;
                                                    border-bottom:1px solid var(--color-border);
                                                "
                                            >

                                                <strong>

                                                    ${escapeHTML(
                                                        review.decision ||
                                                        "Decision"
                                                    )}

                                                </strong>


                                                <div class="muted">

                                                    Officer #

                                                    ${escapeHTML(
                                                        review.officer_id ??
                                                        "—"
                                                    )}

                                                    ·

                                                    ${escapeHTML(
                                                        formatDateSafe(
                                                            review.reviewed_at
                                                        )
                                                    )}

                                                </div>


                                                ${
                                                    review.remark
                                                        ? `
                                                            <div class="mt-2">

                                                                ${escapeHTML(
                                                                    review.remark
                                                                )}

                                                            </div>
                                                        `
                                                        : ""
                                                }

                                            </div>
                                        `
                                    ).join("")
                                    : `
                                        <p class="muted mt-2">
                                            No review-history entries yet.
                                        </p>
                                    `
                            }

                        </div>
                    `;
                }
            ).join("");


        const existingDiagnosis =
            caseEvidence.find(
                report =>
                    report.officer_diagnosis
            )?.officer_diagnosis ||
            "";


        const existingRemark =
            caseEvidence.find(
                report =>
                    report.officer_remark
            )?.officer_remark ||
            "";


        container.innerHTML = `

            <div class="card">

                <h2>

                    ${escapeHTML(
                        primary.crop ||
                        "Crop"
                    )}

                    — Officer Case

                </h2>


                <p class="muted mt-2">

                    <strong>
                        Case / Report ID:
                    </strong>

                    ${escapeHTML(
                        caseLabel
                    )}

                </p>


                <p class="muted">

                    Farmer:

                    ${escapeHTML(
                        primary.farmer_name ||
                        primary.username ||
                        "Unknown Farmer"
                    )}

                    ${
                        primary.phone
                            ? ` · ${escapeHTML(
                                primary.phone
                            )}`
                            : ""
                    }

                </p>


                <p class="muted">

                    Evidence images:

                    ${caseEvidence.length}

                    · Case status:

                    ${escapeHTML(
                        caseStatus
                    )}

                </p>


                <div class="mt-3">

                    ${statusBadgeSafe(
                        caseStatus
                    )}

                </div>

            </div>


            <div class="card mt-3">

                <div class="card-title">
                    Human-in-the-Loop Separation
                </div>


                <p class="mt-2">

                    <strong>
                        AI prediction:
                    </strong>

                    ${escapeHTML(
                        assessment.prediction ||
                        primary.damage_type ||
                        "—"
                    )}

                </p>


                <p>

                    <strong>
                        Officer diagnosis:
                    </strong>

                    ${escapeHTML(
                        existingDiagnosis ||
                        "Not entered yet"
                    )}

                </p>


                <p class="muted mt-2">

                    Officer diagnosis is stored separately.
                    It does not overwrite the original AI prediction.

                </p>

            </div>


            <div class="card mt-3">

                <div class="card-title">

                    Case Evidence
                    (${caseEvidence.length})

                </div>


                <p class="muted mt-2">

                    All images below share the same
                    report_id and are reviewed as one case.

                </p>

            </div>


            ${evidenceCardsHTML}


            <div class="card mt-3">

                <div class="card-title">
                    Officer Review History
                </div>


                <p class="muted mt-2">

                    Audit entries are shown
                    per evidence item.

                </p>


                ${historyHTML}

            </div>


            <div class="card mt-3">

                <div class="card-title">
                    Officer Decision — Whole Case
                </div>


                <label
                    for="diagnosisInput"
                    style="
                        display:block;
                        font-weight:600;
                        margin-top:12px;
                        margin-bottom:8px;
                    "
                >

                    Officer Diagnosis

                </label>


                <textarea
                    id="diagnosisInput"

                    placeholder="Enter officer's independent diagnosis..."

                    style="
                        width:100%;
                        min-height:80px;
                        padding:12px;
                        border:1.5px solid var(--color-border);
                        border-radius:8px;
                        font-family:inherit;
                    "
                >${escapeHTML(
                    existingDiagnosis
                )}</textarea>


                <label
                    for="remarkInput"
                    style="
                        display:block;
                        font-weight:600;
                        margin-top:14px;
                        margin-bottom:8px;
                    "
                >

                    Officer Remark

                </label>


                <textarea
                    id="remarkInput"

                    placeholder="Add note about the decision..."

                    style="
                        width:100%;
                        min-height:80px;
                        padding:12px;
                        border:1.5px solid var(--color-border);
                        border-radius:8px;
                        font-family:inherit;
                    "
                >${escapeHTML(
                    existingRemark
                )}</textarea>


                <div
                    id="decisionStatus"
                    class="muted mt-3"
                >
                </div>


                <div
                    style="
                        display:flex;
                        gap:10px;
                        flex-wrap:wrap;
                        margin-top:14px;
                    "
                >

                    <button
                        class="btn btn-primary"
                        id="verifyBtn"
                    >
                        Verify Whole Case
                    </button>


                    <button
                        class="btn btn-warning"
                        id="reviewBtn"
                    >
                        Mark Whole Case Under Review
                    </button>


                    <button
                        class="btn btn-danger"
                        id="rejectBtn"
                    >
                        Reject Whole Case
                    </button>

                </div>

            </div>
        `;


        const diagnosisInput =
            document.getElementById(
                "diagnosisInput"
            );

        const remarkInput =
            document.getElementById(
                "remarkInput"
            );

        const decisionStatus =
            document.getElementById(
                "decisionStatus"
            );


        async function saveCaseDecision(
            status
        ) {

            const diagnosis =
                diagnosisInput
                    ?.value
                    .trim() ||
                "";

            const remark =
                remarkInput
                    ?.value
                    .trim() ||
                "";

            if (
                status === "Rejected" &&
                !remark
            ) {

                alert(
                    "Please add a reason before rejecting the case."
                );

                return;
            }


            if (
                status === "Rejected" &&
                !confirm(
                    "Reject this whole case?"
                )
            ) {
                return;
            }


            try {

                if (decisionStatus) {

                    decisionStatus.textContent =
                        `Saving ${status} for ${caseEvidence.length} evidence item(s)...`;
                }


                const results = [];


                for (const report of caseEvidence) {

                    const result =
                        await updateOfficerDecision(
                            report.evidence_id,
                            status,
                            remark,
                            diagnosis
                        );

                    results.push(
                        result
                    );
                }


                if (decisionStatus) {

                    decisionStatus.textContent =
                        `Saved successfully for ${results.length} evidence item(s).`;
                }


                alert(
                    `Case updated: ${status}`
                );


                window.location.reload();

            }

            catch (error) {

                console.error(
                    "Case decision error:",
                    error
                );

                if (decisionStatus) {

                    decisionStatus.textContent =
                        `Error: ${error.message}`;
                }

                alert(
                    error.message
                );
            }
        }


        const verifyBtn =
            document.getElementById(
                "verifyBtn"
            );

        if (verifyBtn) {

            verifyBtn.addEventListener(
                "click",
                () =>
                    saveCaseDecision(
                        "Verified"
                    )
            );
        }


        const reviewBtn =
            document.getElementById(
                "reviewBtn"
            );

        if (reviewBtn) {

            reviewBtn.addEventListener(
                "click",
                () =>
                    saveCaseDecision(
                        "Under Review"
                    )
            );
        }


        const rejectBtn =
            document.getElementById(
                "rejectBtn"
            );

        if (rejectBtn) {

            rejectBtn.addEventListener(
                "click",
                () =>
                    saveCaseDecision(
                        "Rejected"
                    )
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