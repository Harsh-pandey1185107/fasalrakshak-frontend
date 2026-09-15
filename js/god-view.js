/* ============================================================================
   god-view.js — FasalRakshak AI
   Regional Crop Health Intelligence / Officer God View

   This file is intentionally isolated from officer.js.
   It reads officer-only God View endpoints and does not modify the existing
   case verification / report-detail workflow.
   ============================================================================ */

(function (global) {
    "use strict";

    const state = {
        initialized: false,
        loaded: false,
        loading: false,
        bundle: null,
        leafletMap: null,
        leafletLayer: null
    };


    /* ========================================================================
       PURE HELPERS
       ======================================================================== */

    function escapeHTML(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }


    function normalizeApiBase(value) {
        let base = String(value || "").trim();

        if (!base) {
            return "http://127.0.0.1:8000/api/v1";
        }

        base = base.replace(/\/+$/, "");

        if (!/\/api\/v1$/i.test(base)) {
            base += "/api/v1";
        }

        return base;
    }


    function getSummaryObject(summaryEnvelope) {
        if (
            summaryEnvelope &&
            typeof summaryEnvelope === "object" &&
            summaryEnvelope.summary &&
            typeof summaryEnvelope.summary === "object"
        ) {
            return summaryEnvelope.summary;
        }

        return (
            summaryEnvelope &&
            typeof summaryEnvelope === "object"
        )
            ? summaryEnvelope
            : {};
    }


    function buildKpis(summaryEnvelope) {
        const summary = getSummaryObject(summaryEnvelope);

        return {
            cases:
                Number(
                    summary.total_evidence_cases ??
                    0
                ) || 0,

            reports:
                Number(
                    summary.unique_reports ??
                    0
                ) || 0,

            highPriority:
                Number(
                    summary.officer_priority?.HIGH ??
                    0
                ) || 0,

            unsupported:
                Number(
                    summary.support_status?.UNSUPPORTED ??
                    0
                ) || 0
        };
    }


    function sortedEntries(counter) {
        if (
            !counter ||
            typeof counter !== "object" ||
            Array.isArray(counter)
        ) {
            return [];
        }

        return Object.entries(counter)
            .map(([label, count]) => [
                label,
                Number(count) || 0
            ])
            .sort((a, b) => {
                if (b[1] !== a[1]) {
                    return b[1] - a[1];
                }

                return String(a[0])
                    .localeCompare(
                        String(b[0])
                    );
            });
    }


    function signalSummary(clustersEnvelope) {
        const clusters = Array.isArray(
            clustersEnvelope?.clusters
        )
            ? clustersEnvelope.clusters
            : [];

        if (!clusters.length) {
            return {
                hasSignals: false,
                count: 0,
                headline:
                    "No qualifying regional disease cluster detected.",
                detail:
                    "No outbreak is inferred. The current stored evidence does not meet the configured non-duplicate space-and-time cluster rule."
            };
        }

        return {
            hasSignals: true,
            count: clusters.length,
            headline:
                `${clusters.length} possible regional signal${clusters.length === 1 ? "" : "s"} require officer investigation.`,
            detail:
                "These are investigation signals only. They are not confirmed outbreaks."
        };
    }


    function normalizeCoverage(
        modelHealthEnvelope,
        summaryEnvelope
    ) {
        const modelHealth =
            modelHealthEnvelope?.model_health &&
            typeof modelHealthEnvelope.model_health ===
                "object"

                ? modelHealthEnvelope.model_health

                : (
                    modelHealthEnvelope &&
                    typeof modelHealthEnvelope === "object"
                        ? modelHealthEnvelope
                        : {}
                );

        const matrix = Array.isArray(
            modelHealth.coverage_matrix
        )
            ? modelHealth.coverage_matrix
            : [];

        const observedByCrop =
            modelHealth.observed_by_crop &&
            typeof modelHealth.observed_by_crop ===
                "object"

                ? modelHealth.observed_by_crop

                : getSummaryObject(
                    summaryEnvelope
                ).crops || {};

        const registered =
            new Set(
                matrix
                    .map(
                        item =>
                            String(
                                item?.crop ||
                                ""
                            )
                                .trim()
                                .toLowerCase()
                    )
                    .filter(Boolean)
            );

        const rows = matrix.map(item => ({
            crop:
                item?.crop ||
                "Unknown",

            support_status:
                item?.support_status ||
                "UNKNOWN",

            can_run_inference:
                item?.can_run_inference === true,

            model_id:
                item?.model_id ||
                null,

            validation_status:
                item?.validation_status ||
                null,

            observed_cases:
                Number(
                    observedByCrop?.[
                        item?.crop
                    ] ?? 0
                ) || 0
        }));

        for (
            const [crop, count] of
            Object.entries(observedByCrop || {})
        ) {
            const cropText =
                String(crop || "").trim();

            if (
                !cropText ||
                cropText.toLowerCase() ===
                    "unknown" ||
                registered.has(
                    cropText.toLowerCase()
                )
            ) {
                continue;
            }

            rows.push({
                crop:
                    cropText,

                support_status:
                    "UNSUPPORTED",

                can_run_inference:
                    false,

                model_id:
                    null,

                validation_status:
                    "NO_REGISTERED_MODEL",

                observed_cases:
                    Number(count) || 0
            });
        }

        return rows;
    }


    function classForCounterLabel(label) {
        const text =
            String(label || "")
                .toUpperCase();

        if (
            text.includes("BLOCK") ||
            text.includes("UNSUPPORTED") ||
            text.includes("REJECT") ||
            text.includes("EXACT")
        ) {
            return "blocked";
        }

        if (
            text.includes("REVIEW") ||
            text.includes("UNCERTAIN") ||
            text.includes("PENDING") ||
            text.includes("POOR")
        ) {
            return "warning";
        }

        if (
            text.includes("ALLOWED") ||
            text.includes("VALID") ||
            text.includes("SUPPORTED")
        ) {
            return "";
        }

        return "info";
    }


    /* ========================================================================
       API
       ======================================================================== */

    function apiBase() {
        if (
            typeof API_BASE_URL ===
            "string"
        ) {
            return normalizeApiBase(
                API_BASE_URL
            );
        }

        return normalizeApiBase("");
    }


    function getToken() {
        if (
            typeof global.getOfficerToken ===
            "function"
        ) {
            const token =
                global.getOfficerToken();

            if (token) {
                return token;
            }
        }

        const fallbackKeys = [
            "officer_token",
            "access_token",
            "token"
        ];

        for (
            const key of fallbackKeys
        ) {
            const value =
                global.localStorage
                    ?.getItem(key);

            if (value) {
                return value;
            }
        }

        return null;
    }


    async function ensureToken() {
        let token =
            getToken();

        if (token) {
            return token;
        }

        if (
            typeof global.ensureOfficerLogin ===
            "function"
        ) {
            await global.ensureOfficerLogin(
                document.getElementById(
                    "officerIdentity"
                )
            );

            token =
                getToken();
        }

        if (!token) {
            throw new Error(
                "Officer session is unavailable. Please reload the page and sign in again."
            );
        }

        return token;
    }


    async function requestJson(
        path,
        token
    ) {
        const response =
            await fetch(
                `${apiBase()}${path}`,
                {
                    method:
                        "GET",

                    headers: {
                        Accept:
                            "application/json",

                        Authorization:
                            `Bearer ${token}`
                    }
                }
            );

        if (!response.ok) {
            let message =
                `${response.status} ${response.statusText}`;

            try {
                const body =
                    await response.json();

                message =
                    body?.detail
                        ? (
                            typeof body.detail ===
                                "string"

                                ? body.detail

                                : JSON.stringify(
                                    body.detail
                                )
                        )
                        : message;
            } catch (_) {
            }

            throw new Error(message);
        }

        return response.json();
    }


    async function fetchBundle() {
        const token =
            await ensureToken();

        const endpoints = {
            summary:
                "/god-view/summary",

            map:
                "/god-view/map",

            queue:
                "/god-view/review-queue",

            clusters:
                "/god-view/clusters",

            modelHealth:
                "/god-view/model-health"
        };

        const names =
            Object.keys(endpoints);

        const settled =
            await Promise.allSettled(
                names.map(
                    name =>
                        requestJson(
                            endpoints[name],
                            token
                        )
                )
            );

        const bundle = {
            errors: []
        };

        settled.forEach(
            (result, index) => {
                const name =
                    names[index];

                if (
                    result.status ===
                    "fulfilled"
                ) {
                    bundle[name] =
                        result.value;
                } else {
                    bundle[name] =
                        null;

                    bundle.errors.push({
                        source:
                            name,

                        message:
                            result.reason?.message ||
                            "Request failed."
                    });
                }
            }
        );

        if (
            bundle.errors.length ===
            names.length
        ) {
            throw new Error(
                bundle.errors[0]?.message ||
                "Regional intelligence could not be loaded."
            );
        }

        return bundle;
    }


    /* ========================================================================
       DOM HELPERS
       ======================================================================== */

    function byId(id) {
        return document.getElementById(id);
    }


    function setText(
        id,
        value
    ) {
        const element =
            byId(id);

        if (element) {
            element.textContent =
                String(value);
        }
    }


    function setStatus(
        message,
        level = ""
    ) {
        const element =
            byId("godViewStatus");

        if (!element) {
            return;
        }

        element.className =
            `gv-status${level ? ` ${level}` : ""}`;

        element.textContent =
            message;
    }


    function setLoading(isLoading) {
        const view =
            byId("godViewView");

        const refresh =
            byId("refreshGodViewBtn");

        view?.classList.toggle(
            "gv-loading",
            isLoading
        );

        if (refresh) {
            refresh.disabled =
                isLoading;
        }
    }


    /* ========================================================================
       RENDERERS
       ======================================================================== */

    function renderKpis(summaryEnvelope) {
        const kpis =
            buildKpis(
                summaryEnvelope
            );

        setText(
            "gvKpiCases",
            kpis.cases
        );

        setText(
            "gvKpiReports",
            kpis.reports
        );

        setText(
            "gvKpiHigh",
            kpis.highPriority
        );

        setText(
            "gvKpiUnsupported",
            kpis.unsupported
        );
    }


    function renderBars(
        containerId,
        counter,
        labels = {}
    ) {
        const container =
            byId(containerId);

        if (!container) {
            return;
        }

        const entries =
            sortedEntries(counter);

        if (!entries.length) {
            container.innerHTML =
                `<div class="gv-empty">No data available.</div>`;
            return;
        }

        const max =
            Math.max(
                ...entries.map(
                    item => item[1]
                ),
                1
            );

        container.innerHTML =
            entries.map(
                ([label, count]) => {
                    const width =
                        Math.max(
                            3,
                            Math.round(
                                (count / max) *
                                100
                            )
                        );

                    const displayLabel =
                        labels[label] ||
                        label;

                    const barClass =
                        classForCounterLabel(
                            label
                        );

                    return `
                        <div class="gv-bar-row">
                            <div
                                class="gv-bar-label"
                                title="${escapeHTML(displayLabel)}"
                            >
                                ${escapeHTML(displayLabel)}
                            </div>

                            <div class="gv-bar-track">
                                <div
                                    class="gv-bar-fill ${escapeHTML(barClass)}"
                                    style="width:${width}%"
                                ></div>
                            </div>

                            <div class="gv-bar-count">
                                ${escapeHTML(count)}
                            </div>
                        </div>
                    `;
                }
            ).join("");
    }


    function renderDiseaseDistribution(
        summaryEnvelope
    ) {
        const summary =
            getSummaryObject(
                summaryEnvelope
            );

        renderBars(
            "godDiseaseDistribution",
            summary.predictions || {}
        );
    }


    function renderRagSafety(
        summaryEnvelope
    ) {
        const summary =
            getSummaryObject(
                summaryEnvelope
            );

        renderBars(
            "godRagSafety",
            summary.rag_status || {},
            {
                ALLOWED:
                    "Guidance allowed",
                BLOCKED_EXACT_DUPLICATE:
                    "Blocked: exact duplicate",
                BLOCKED_POOR_IMAGE:
                    "Blocked: poor image"
            }
        );
    }


    function renderEvidenceQuality(
        summaryEnvelope
    ) {
        const summary =
            getSummaryObject(
                summaryEnvelope
            );

        renderBars(
            "godEvidenceQuality",
            summary.evidence_validity || {},
            {
                valid:
                    "Valid evidence",
                not_valid_or_needs_review:
                    "Needs review / not valid",
                not_assessed:
                    "Not assessed"
            }
        );
    }


    function renderReviewQueue(
        queueEnvelope
    ) {
        const container =
            byId("godReviewQueue");

        if (!container) {
            return;
        }

        const queue =
            Array.isArray(
                queueEnvelope?.queue
            )
                ? queueEnvelope.queue
                : [];

        const unresolved =
            Number(
                queueEnvelope?.total_unresolved ??
                queue.length
            ) || 0;

        setText(
            "gvQueueCount",
            `${unresolved} unresolved`
        );

        if (!queue.length) {
            container.innerHTML =
                `<div class="gv-empty">No unresolved officer cases.</div>`;
            return;
        }

        container.innerHTML =
            queue.slice(0, 10)
                .map(
                    item => {
                        const priority =
                            String(
                                item?.officer_priority ||
                                "UNKNOWN"
                            )
                                .toLowerCase();

                        const evidenceId =
                            item?.evidence_id ||
                            "";

                        const prediction =
                            item?.prediction ||
                            "Assessment pending";

                        const crop =
                            item?.crop ||
                            "Unknown crop";

                        const trust =
                            item?.trust_score == null
                                ? "—"
                                : item.trust_score;

                        const detailHref =
                            evidenceId
                                ? `report-detail.html?id=${encodeURIComponent(evidenceId)}`
                                : "#";

                        const reason =
                            item?.evidence_status ||
                            item?.rag_status ||
                            item?.support_status ||
                            "Human review required";

                        return `
                            <a
                                class="gv-queue-item"
                                href="${escapeHTML(detailHref)}"
                            >
                                <div class="gv-queue-top">
                                    <div
                                        class="gv-queue-id"
                                        title="${escapeHTML(evidenceId)}"
                                    >
                                        ${escapeHTML(evidenceId || "Unknown evidence")}
                                    </div>

                                    <span class="gv-priority ${escapeHTML(priority)}">
                                        ${escapeHTML(item?.officer_priority || "UNKNOWN")}
                                    </span>
                                </div>

                                <div class="gv-queue-line">
                                    ${escapeHTML(crop)}
                                    ·
                                    ${escapeHTML(prediction)}
                                </div>

                                <div class="gv-queue-line">
                                    Trust ${escapeHTML(trust)}
                                    ·
                                    ${escapeHTML(reason)}
                                </div>
                            </a>
                        `;
                    }
                )
                .join("");
    }


    function renderModelCoverage(
        modelHealthEnvelope,
        summaryEnvelope
    ) {
        const container =
            byId("godModelCoverage");

        if (!container) {
            return;
        }

        const rows =
            normalizeCoverage(
                modelHealthEnvelope,
                summaryEnvelope
            );

        if (!rows.length) {
            container.innerHTML =
                `<div class="gv-empty">No model coverage data available.</div>`;
            return;
        }

        container.innerHTML =
            rows.map(
                row => {
                    const status =
                        String(
                            row.support_status ||
                            "UNKNOWN"
                        );

                    const statusClass =
                        status
                            .toLowerCase()
                            .replaceAll(
                                /[^a-z0-9]+/g,
                                "_"
                            );

                    const modelLine =
                        row.model_id
                            ? `Model: ${row.model_id}`
                            : "No released model";

                    const routingLine =
                        row.can_run_inference
                            ? "AI routing available"
                            : "AI routing unavailable";

                    const observedLine =
                        row.observed_cases
                            ? `${row.observed_cases} observed case${row.observed_cases === 1 ? "" : "s"}`
                            : "No observed cases";

                    return `
                        <div class="gv-model-card">

                            <div class="gv-model-top">
                                <div class="gv-model-crop">
                                    ${escapeHTML(row.crop)}
                                </div>

                                <span class="gv-support ${escapeHTML(statusClass)}">
                                    ${escapeHTML(status)}
                                </span>
                            </div>

                            <div class="gv-model-meta">
                                ${escapeHTML(modelLine)}
                                <br />
                                ${escapeHTML(routingLine)}
                                <br />
                                ${escapeHTML(observedLine)}
                            </div>

                        </div>
                    `;
                }
            ).join("");
    }


    function markerTone(priority) {
        const value =
            String(
                priority ||
                "UNKNOWN"
            ).toUpperCase();

        if (value === "HIGH") {
            return "#a33a3a";
        }

        if (value === "MEDIUM") {
            return "#a96b00";
        }

        if (value === "LOW") {
            return "#1f7a4c";
        }

        return "#607067";
    }


    function renderMapFallback(points) {
        const mapElement =
            byId("godMap");

        const fallback =
            byId("godMapFallback");

        if (!fallback) {
            return;
        }

        if (mapElement) {
            mapElement.hidden =
                true;
        }

        fallback.hidden =
            false;

        if (!points.length) {
            fallback.innerHTML =
                `<div class="gv-empty">No valid GPS case locations are available.</div>`;
            return;
        }

        fallback.innerHTML =
            points.slice(0, 50)
                .map(
                    point => `
                        <div class="gv-location-row">
                            <div>
                                <div class="gv-location-main">
                                    ${escapeHTML(point?.crop || "Unknown crop")}
                                    ·
                                    ${escapeHTML(point?.prediction || "Assessment pending")}
                                </div>

                                <div class="gv-location-meta">
                                    ${escapeHTML(point?.evidence_id || "Unknown evidence")}
                                    ·
                                    ${escapeHTML(point?.officer_priority || "UNKNOWN")} priority
                                </div>
                            </div>

                            <div class="gv-location-meta">
                                ${escapeHTML(
                                    Number(point?.latitude).toFixed(5)
                                )},
                                ${escapeHTML(
                                    Number(point?.longitude).toFixed(5)
                                )}
                            </div>
                        </div>
                    `
                )
                .join("");
    }


    function renderMap(
        mapEnvelope
    ) {
        const points =
            Array.isArray(
                mapEnvelope?.points
            )
                ? mapEnvelope.points.filter(
                    point =>
                        Number.isFinite(
                            Number(
                                point?.latitude
                            )
                        ) &&
                        Number.isFinite(
                            Number(
                                point?.longitude
                            )
                        )
                )
                : [];

        setText(
            "gvMapCount",
            `${points.length} location${points.length === 1 ? "" : "s"}`
        );

        const mapElement =
            byId("godMap");

        const fallback =
            byId("godMapFallback");

        if (
            !mapElement ||
            !global.L
        ) {
            renderMapFallback(
                points
            );
            return;
        }

        mapElement.hidden =
            false;

        if (fallback) {
            fallback.hidden =
                true;
        }

        if (!state.leafletMap) {
            state.leafletMap =
                global.L.map(
                    mapElement,
                    {
                        zoomControl:
                            true
                    }
                );

            global.L.tileLayer(
                "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
                {
                    maxZoom:
                        19,

                    attribution:
                        "&copy; OpenStreetMap contributors"
                }
            ).addTo(
                state.leafletMap
            );
        }

        if (state.leafletLayer) {
            state.leafletLayer
                .clearLayers();
        } else {
            state.leafletLayer =
                global.L.layerGroup()
                    .addTo(
                        state.leafletMap
                    );
        }

        if (!points.length) {
            state.leafletMap.setView(
                [20.5937, 78.9629],
                4
            );

            renderMapFallback([]);
            return;
        }

        const bounds = [];

        for (
            const point of points
        ) {
            const latitude =
                Number(
                    point.latitude
                );

            const longitude =
                Number(
                    point.longitude
                );

            const color =
                markerTone(
                    point.officer_priority
                );

            const marker =
                global.L.circleMarker(
                    [
                        latitude,
                        longitude
                    ],
                    {
                        radius:
                            8,

                        color:
                            color,

                        fillColor:
                            color,

                        fillOpacity:
                            0.78,

                        weight:
                            2
                    }
                );

            const detailHref =
                point?.evidence_id
                    ? `report-detail.html?id=${encodeURIComponent(point.evidence_id)}`
                    : "#";

            marker.bindPopup(`
                <div class="gv-leaflet-popup">
                    <strong>
                        ${escapeHTML(point?.crop || "Unknown crop")}
                    </strong>

                    <div class="gv-popup-line">
                        AI: ${escapeHTML(point?.prediction || "Assessment pending")}
                    </div>

                    <div class="gv-popup-line">
                        Priority: ${escapeHTML(point?.officer_priority || "UNKNOWN")}
                        ·
                        Status: ${escapeHTML(point?.officer_status || "Pending")}
                    </div>

                    <div class="gv-popup-line">
                        Model support: ${escapeHTML(point?.support_status || "UNKNOWN")}
                    </div>

                    ${
                        point?.evidence_id
                            ? `<a href="${escapeHTML(detailHref)}">Open case</a>`
                            : ""
                    }
                </div>
            `);

            marker.addTo(
                state.leafletLayer
            );

            bounds.push([
                latitude,
                longitude
            ]);
        }

        state.leafletMap.fitBounds(
            bounds,
            {
                padding:
                    [24, 24],

                maxZoom:
                    13
            }
        );

        setTimeout(
            () =>
                state.leafletMap
                    ?.invalidateSize(),
            0
        );
    }


    function renderSignals(
        clustersEnvelope
    ) {
        const container =
            byId(
                "godRegionalSignals"
            );

        if (!container) {
            return;
        }

        const summary =
            signalSummary(
                clustersEnvelope
            );

        const clusters =
            Array.isArray(
                clustersEnvelope?.clusters
            )
                ? clustersEnvelope.clusters
                : [];

        if (!summary.hasSignals) {
            container.innerHTML = `
                <div class="gv-signal-safe">
                    <strong>
                        ${escapeHTML(summary.headline)}
                    </strong>

                    <p>
                        ${escapeHTML(summary.detail)}
                    </p>
                </div>
            `;

            return;
        }

        container.innerHTML =
            clusters.map(
                cluster => `
                    <div class="gv-signal-card">

                        <div class="gv-signal-title">
                            Possible cluster:
                            ${escapeHTML(cluster?.crop || "Unknown crop")}
                            ·
                            ${escapeHTML(cluster?.prediction || "Unknown condition")}
                        </div>

                        <div class="gv-signal-meta">
                            ${escapeHTML(cluster?.case_count ?? 0)}
                            compatible non-duplicate cases
                            ·
                            configured radius
                            ${escapeHTML(cluster?.radius_rule_km ?? "—")} km
                            ·
                            time window
                            ${escapeHTML(cluster?.time_window_days ?? "—")} days
                            <br />
                            Investigation signal only.
                            Confirmed outbreak:
                            ${cluster?.confirmed_outbreak === true ? "Yes" : "No"}.
                        </div>

                    </div>
                `
            ).join("");
    }


    function renderBundle(bundle) {
        renderKpis(
            bundle.summary
        );

        renderDiseaseDistribution(
            bundle.summary
        );

        renderRagSafety(
            bundle.summary
        );

        renderEvidenceQuality(
            bundle.summary
        );

        renderReviewQueue(
            bundle.queue
        );

        renderModelCoverage(
            bundle.modelHealth,
            bundle.summary
        );

        renderMap(
            bundle.map
        );

        renderSignals(
            bundle.clusters
        );
    }


    /* ========================================================================
       LOAD + TAB CONTROL
       ======================================================================== */

    async function loadGodView(
        force = false
    ) {
        if (
            state.loading ||
            (
                state.loaded &&
                !force
            )
        ) {
            if (
                state.leafletMap
            ) {
                setTimeout(
                    () =>
                        state.leafletMap
                            ?.invalidateSize(),
                    0
                );
            }

            return;
        }

        state.loading =
            true;

        setLoading(true);

        setStatus(
            "Loading live regional intelligence..."
        );

        try {
            const bundle =
                await fetchBundle();

            state.bundle =
                bundle;

            state.loaded =
                true;

            renderBundle(
                bundle
            );

            if (
                bundle.errors.length
            ) {
                const sources =
                    bundle.errors
                        .map(
                            item =>
                                item.source
                        )
                        .join(", ");

                setStatus(
                    `Regional intelligence loaded with partial API errors: ${sources}.`,
                    "warning"
                );
            } else {
                setStatus(
                    "Regional intelligence connected to live FasalRakshak data.",
                    "success"
                );
            }
        } catch (error) {
            console.error(
                "God View load error:",
                error
            );

            setStatus(
                `God View error: ${error.message}`,
                "error"
            );
        } finally {
            state.loading =
                false;

            setLoading(false);
        }
    }


    function activateTab(name) {
        const caseTab =
            byId(
                "caseVerificationTab"
            );

        const godTab =
            byId(
                "godViewTab"
            );

        const caseView =
            byId(
                "caseVerificationView"
            );

        const godView =
            byId(
                "godViewView"
            );

        const showGod =
            name === "god";

        if (caseTab) {
            caseTab.classList.toggle(
                "active",
                !showGod
            );

            caseTab.setAttribute(
                "aria-selected",
                String(!showGod)
            );
        }

        if (godTab) {
            godTab.classList.toggle(
                "active",
                showGod
            );

            godTab.setAttribute(
                "aria-selected",
                String(showGod)
            );
        }

        if (caseView) {
            caseView.hidden =
                showGod;
        }

        if (godView) {
            godView.hidden =
                !showGod;
        }

        if (showGod) {
            loadGodView();

            if (
                state.leafletMap
            ) {
                setTimeout(
                    () =>
                        state.leafletMap
                            ?.invalidateSize(),
                    0
                );
            }
        }
    }


    function initGodViewDashboard() {
        if (state.initialized) {
            return;
        }

        state.initialized =
            true;

        const caseTab =
            byId(
                "caseVerificationTab"
            );

        const godTab =
            byId(
                "godViewTab"
            );

        const refresh =
            byId(
                "refreshGodViewBtn"
            );

        caseTab?.addEventListener(
            "click",
            () =>
                activateTab(
                    "case"
                )
        );

        godTab?.addEventListener(
            "click",
            () =>
                activateTab(
                    "god"
                )
        );

        refresh?.addEventListener(
            "click",
            () =>
                loadGodView(
                    true
                )
        );

        setStatus(
            "Regional Intelligence is ready. Open the tab to load live data."
        );
    }


    /* ========================================================================
       PUBLIC API + NODE TEST EXPORTS
       ======================================================================== */

    global.initGodViewDashboard =
        initGodViewDashboard;

    const testExports = {
        escapeHTML,
        normalizeApiBase,
        getSummaryObject,
        buildKpis,
        sortedEntries,
        signalSummary,
        normalizeCoverage,
        classForCounterLabel
    };

    if (
        typeof module !==
            "undefined" &&
        module.exports
    ) {
        module.exports =
            testExports;
    }

})(typeof window !== "undefined" ? window : globalThis);
