/* ==========================================================================
   farmer.js
   FasalRakshak AI
   Real Farmer Dashboard + Evidence Upload + Safe AI/RAG Result
   ========================================================================== */


/* ==========================================================================
   SAFE HTML HELPER
   ========================================================================== */

function escapeFarmerHTML(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* ==========================================================================
   1. FARMER DASHBOARD
   ========================================================================== */

async function renderFarmerDashboard() {

    const total =
        document.getElementById("statTotal");

    const pending =
        document.getElementById("statPending");

    const review =
        document.getElementById("statReview");

    const verified =
        document.getElementById("statVerified");

    const listEl =
        document.getElementById("reportList");


    try {

        if (listEl) {
            listEl.innerHTML = `
                <div class="empty-state">
                    Loading your reports...
                </div>
            `;
        }


        const response =
            await getFarmerReports();


        const reports =
            Array.isArray(response)
                ? response
                : [];


        /* ------------------------------------------------------------------
           Statistics
           ------------------------------------------------------------------ */

        if (total) {
            total.textContent =
                reports.length;
        }


        if (pending) {
            pending.textContent =
                reports.filter(
                    report =>
                        report.status === "Pending"
                ).length;
        }


        if (review) {
            review.textContent =
                reports.filter(
                    report =>
                        report.status === "Under Review"
                ).length;
        }


        if (verified) {
            verified.textContent =
                reports.filter(
                    report =>
                        report.status === "Verified"
                ).length;
        }


        if (!listEl) {
            return;
        }


        if (reports.length === 0) {

            listEl.innerHTML = `
                <div class="empty-state">
                    No reports submitted yet.
                </div>
            `;

            return;
        }


        /* ------------------------------------------------------------------
           Real backend reports
           ------------------------------------------------------------------ */

        listEl.innerHTML =
            reports.map(report => {

                const assessment =
                    report.assessment || {};


                const evidenceId =
                    report.evidence_id ||
                    "Unknown";


                const crop =
                    report.crop ||
                    "Crop";


                const disease =
                    report.damage_type ||
                    "Assessment Pending";


                const confidence =
                    assessment.confidence != null
                        ? `${assessment.confidence}%`
                        : "—";


                const status =
                    report.status ||
                    "Pending";


                const description =
                    report.description ||
                    "";


                const officerRemark =
                    report.officer_remark ||
                    "";


                const evidenceValid =
                    assessment.evidence_valid;


                return `

                    <div class="report-row">

                        <div>

                            <div class="report-id">

                                ${escapeFarmerHTML(
                                    evidenceId
                                )}

                                ·

                                ${escapeFarmerHTML(
                                    crop
                                )}

                            </div>


                            <div class="report-meta">

                                ${escapeFarmerHTML(
                                    disease
                                )}

                                · Confidence

                                ${escapeFarmerHTML(
                                    confidence
                                )}

                                ·

                                ${formatDateTime(
                                    report.created_at
                                )}

                            </div>


                            ${
                                evidenceValid === false
                                    ? `
                                        <div
                                            class="report-meta"
                                            style="
                                                margin-top:6px;
                                                font-weight:600;
                                            "
                                        >
                                            ⚠ Evidence quality requires review / retake
                                        </div>
                                    `
                                    : ""
                            }


                            ${
                                description
                                    ? `
                                        <div class="report-meta">
                                            ${escapeFarmerHTML(
                                                description
                                            )}
                                        </div>
                                    `
                                    : ""
                            }


                            ${
                                officerRemark
                                    ? `
                                        <div
                                            class="report-meta"
                                            style="margin-top:6px;"
                                        >

                                            <strong>
                                                Officer Remark:
                                            </strong>

                                            ${escapeFarmerHTML(
                                                officerRemark
                                            )}

                                        </div>
                                    `
                                    : ""
                            }

                        </div>


                        ${statusBadgeHTML(
                            status
                        )}

                    </div>

                `;

            }).join("");


    }

    catch (error) {

        console.error(
            "Farmer dashboard error:",
            error
        );


        if (total) {
            total.textContent = "0";
        }

        if (pending) {
            pending.textContent = "0";
        }

        if (review) {
            review.textContent = "0";
        }

        if (verified) {
            verified.textContent = "0";
        }


        if (listEl) {

            listEl.innerHTML = `

                <div class="empty-state">

                    ${escapeFarmerHTML(
                        error.message
                    )}

                </div>

            `;

        }

    }

}


/* ==========================================================================
   2. REPORT FORM
   ========================================================================== */

function initReportForm() {

    const form =
        document.getElementById(
            "reportForm"
        );


    if (!form) {
        return;
    }


    const photoInput =
        document.getElementById(
            "photoInput"
        );


    const uploadBox =
        document.getElementById(
            "uploadBox"
        );


    const photoPreview =
        document.getElementById(
            "photoPreview"
        );


    const damageChips =
        document.querySelectorAll(
            "#damageChips .chip"
        );


    const locationInput =
        document.getElementById(
            "locationInput"
        );


    const gpsBtn =
        document.getElementById(
            "gpsBtn"
        );


    const gpsHint =
        document.getElementById(
            "gpsHint"
        );


    const timestampDisplay =
        document.getElementById(
            "timestampDisplay"
        );


    const voiceBtn =
        document.getElementById(
            "voiceBtn"
        );


    const voiceHint =
        document.getElementById(
            "voiceHint"
        );


    const descInput =
        document.getElementById(
            "descInput"
        );


    const cropSelect =
        document.getElementById(
            "cropSelect"
        );


    const submitBtn =
        document.getElementById(
            "submitBtn"
        );


    const submitStatus =
        document.getElementById(
            "submitStatus"
        );


    let selectedDamageType = "";

    let selectedFile = null;


    /*
      Prototype fallback coordinates.

      These are replaced by actual GPS coordinates
      when device location permission is available.
    */

    let latitude = 12.9716;

    let longitude = 77.5946;


    /* ----------------------------------------------------------------------
       TIMESTAMP
       ---------------------------------------------------------------------- */

    const nowISO =
        new Date().toISOString();


    if (timestampDisplay) {

        timestampDisplay.value =
            formatDateTime(
                nowISO
            );

    }


    /* ----------------------------------------------------------------------
       PHOTO
       ---------------------------------------------------------------------- */

    if (
        uploadBox &&
        photoInput
    ) {

        uploadBox.addEventListener(

            "click",

            () => {

                photoInput.click();

            }

        );

    }


    if (photoInput) {

        photoInput.addEventListener(

            "change",

            () => {

                const file =
                    photoInput.files[0];


                if (!file) {
                    return;
                }


                selectedFile =
                    file;


                const reader =
                    new FileReader();


                reader.onload =
                    event => {

                        if (photoPreview) {

                            photoPreview.src =
                                event.target.result;


                            photoPreview.style.display =
                                "block";

                        }


                        if (uploadBox) {

                            uploadBox.style.display =
                                "none";

                        }


                        const photoField =
                            document.getElementById(
                                "photoField"
                            );


                        if (photoField) {

                            photoField
                                .classList
                                .remove(
                                    "has-error"
                                );

                        }

                    };


                reader.readAsDataURL(
                    file
                );

            }

        );

    }


    /* ----------------------------------------------------------------------
       OBSERVED PROBLEM
       ---------------------------------------------------------------------- */

    damageChips.forEach(
        chip => {

            chip.addEventListener(

                "click",

                () => {

                    damageChips.forEach(
                        currentChip => {

                            currentChip
                                .classList
                                .remove(
                                    "selected"
                                );

                        }
                    );


                    chip.classList.add(
                        "selected"
                    );


                    selectedDamageType =
                        chip.dataset.value;


                    const damageField =
                        document.getElementById(
                            "damageField"
                        );


                    if (damageField) {

                        damageField
                            .classList
                            .remove(
                                "has-error"
                            );

                    }

                }

            );

        }

    );


    /* ----------------------------------------------------------------------
       GPS
       ---------------------------------------------------------------------- */

    if (
        gpsBtn &&
        locationInput
    ) {

        gpsBtn.addEventListener(

            "click",

            () => {

                if (gpsHint) {

                    gpsHint.textContent =
                        "Fetching GPS location...";

                }


                if (
                    !navigator.geolocation
                ) {

                    if (gpsHint) {

                        gpsHint.textContent =
                            "GPS unavailable. Using prototype fallback coordinates.";

                    }


                    locationInput.value =
                        "Bengaluru, Karnataka";


                    return;

                }


                navigator.geolocation
                    .getCurrentPosition(

                        position => {

                            latitude =
                                Number(
                                    position
                                        .coords
                                        .latitude
                                        .toFixed(6)
                                );


                            longitude =
                                Number(
                                    position
                                        .coords
                                        .longitude
                                        .toFixed(6)
                                );


                            locationInput.value =
                                `Lat ${latitude}, Lon ${longitude}`;


                            if (gpsHint) {

                                gpsHint.textContent =
                                    "GPS location captured.";

                            }

                        },


                        () => {

                            latitude =
                                12.9716;


                            longitude =
                                77.5946;


                            locationInput.value =
                                "Bengaluru, Karnataka (prototype fallback)";


                            if (gpsHint) {

                                gpsHint.textContent =
                                    "GPS permission unavailable. Using prototype fallback.";

                            }

                        },


                        {
                            timeout: 5000
                        }

                    );

            }

        );

    }


    /* ----------------------------------------------------------------------
       VOICE INPUT
       ---------------------------------------------------------------------- */

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;


    if (!SpeechRecognition) {

        if (voiceBtn) {

            voiceBtn.style.display =
                "none";

        }

    }

    else if (voiceBtn) {

        voiceBtn.addEventListener(

            "click",

            () => {

                const recognizer =
                    new SpeechRecognition();


                recognizer.lang =
                    "en-IN";


                if (voiceHint) {

                    voiceHint.textContent =
                        "Listening...";

                }


                recognizer.start();


                recognizer.onresult =
                    event => {

                        if (descInput) {

                            descInput.value =
                                event
                                    .results[0][0]
                                    .transcript;

                        }


                        if (voiceHint) {

                            voiceHint.textContent =
                                "Voice description captured.";

                        }

                    };


                recognizer.onerror =
                    () => {

                        if (voiceHint) {

                            voiceHint.textContent =
                                "Voice capture failed. Please type the description.";

                        }

                    };

            }

        );

    }


    /* ----------------------------------------------------------------------
       FARMER AUTHENTICATION
       ---------------------------------------------------------------------- */

    async function ensureFarmerAuthentication() {

        const existingToken =
            getFarmerToken();


        if (existingToken) {

            return existingToken;

        }


        const fullName =
            window.prompt(
                "Enter farmer name:"
            );


        if (!fullName) {

            throw new Error(
                "Farmer name is required."
            );

        }


        const phone =
            window.prompt(
                "Enter 10-digit mobile number:"
            );


        if (!phone) {

            throw new Error(
                "Mobile number is required."
            );

        }


        const address =
            window.prompt(
                "Enter village / district / address:"
            ) ||

            (
                locationInput
                    ? locationInput.value
                    : ""
            ) ||

            "India";


        const registration =
            await registerFarmer(

                fullName.trim(),

                phone.trim(),

                address.trim()

            );


        return registration.access_token;

    }


    /* ----------------------------------------------------------------------
       FORM SUBMIT
       ---------------------------------------------------------------------- */

    form.addEventListener(

        "submit",

        async event => {

            event.preventDefault();


            let valid = true;


            /* --------------------------------------------------------------
               Photo validation
               -------------------------------------------------------------- */

            if (!selectedFile) {

                const photoField =
                    document.getElementById(
                        "photoField"
                    );


                if (photoField) {

                    photoField
                        .classList
                        .add(
                            "has-error"
                        );

                }


                valid = false;

            }


            /* --------------------------------------------------------------
               Problem validation
               -------------------------------------------------------------- */

            if (
                !selectedDamageType
            ) {

                const damageField =
                    document.getElementById(
                        "damageField"
                    );


                if (damageField) {

                    damageField
                        .classList
                        .add(
                            "has-error"
                        );

                }


                valid = false;

            }


            /* --------------------------------------------------------------
               Location validation
               -------------------------------------------------------------- */

            if (
                locationInput &&
                !locationInput.value.trim()
            ) {

                locationInput.style
                    .borderColor =
                    "var(--color-danger)";


                valid = false;

            }


            /* --------------------------------------------------------------
               Crop validation
               -------------------------------------------------------------- */

            const cropValue =
                cropSelect
                    ? cropSelect.value
                    : "";


            if (!cropValue) {

                alert(
                    "Please select crop type."
                );


                valid = false;

            }


            /*
              Current TensorFlow prototype
              is trained for Onion only.
            */

            if (
                cropValue &&
                cropValue !== "Onion"
            ) {

                alert(
                    "Current AI prototype is trained for Onion only. Please select Onion for this demo."
                );


                return;

            }


            if (!valid) {

                return;

            }


            try {

                if (submitBtn) {

                    submitBtn.disabled =
                        true;


                    submitBtn.textContent =
                        "Processing...";

                }


                if (submitStatus) {

                    submitStatus.textContent =
                        "Authenticating farmer...";

                }


                /* ----------------------------------------------------------
                   Authenticate farmer
                   ---------------------------------------------------------- */

                await ensureFarmerAuthentication();


                /* ----------------------------------------------------------
                   Upload evidence
                   ---------------------------------------------------------- */

                if (submitStatus) {

                    submitStatus.textContent =
                        "Uploading crop evidence...";

                }


                const descriptionParts =
                    [];


                if (
                    selectedDamageType
                ) {

                    descriptionParts.push(

                        `Observed problem: ${selectedDamageType}.`

                    );

                }


                if (
                    descInput &&
                    descInput.value.trim()
                ) {

                    descriptionParts.push(

                        descInput
                            .value
                            .trim()

                    );

                }


                const description =
                    descriptionParts.join(
                        " "
                    );


                const evidence =
                    await uploadEvidence(

                        selectedFile,

                        latitude,

                        longitude,

                        description

                    );


                /* ----------------------------------------------------------
                   Run AI + image quality + RAG
                   ---------------------------------------------------------- */

                if (submitStatus) {

                    submitStatus.textContent =
                        "Evidence uploaded. Running image quality and TensorFlow AI assessment...";

                }


                const assessment =
                    await createAssessment(

                        evidence.evidence_id

                    );


                if (submitStatus) {

                    submitStatus.textContent =
                        "Assessment complete. Preparing result...";

                }


                /* ----------------------------------------------------------
                   Store temporary result
                   ---------------------------------------------------------- */

                const resultData = {

                    evidence:
                        evidence,

                    assessment:
                        assessment,

                    location:
                        locationInput
                            ? locationInput.value.trim()
                            : "",

                    submitted_at:
                        evidence.created_at ||
                        nowISO

                };


                localStorage.setItem(

                    "fasalrakshak_latest_result",

                    JSON.stringify(
                        resultData
                    )

                );


                /* ----------------------------------------------------------
                   Redirect
                   ---------------------------------------------------------- */

                window.location.href =

                    `assessment-result.html?id=${encodeURIComponent(
                        evidence.evidence_id
                    )}`;


            }

            catch (error) {

                console.error(
                    error
                );


                if (submitStatus) {

                    submitStatus.textContent =
                        `Error: ${error.message}`;

                }


                alert(
                    error.message
                );


                if (submitBtn) {

                    submitBtn.disabled =
                        false;


                    submitBtn.textContent =
                        "Submit Evidence & Run AI Assessment";

                }

            }

        }

    );

}


/* ==========================================================================
   3. ASSESSMENT RESULT
   ========================================================================== */

function renderAssessmentResult() {

    const container =
        document.getElementById(
            "resultContainer"
        );


    if (!container) {
        return;
    }


    const requestedId =
        getQueryParam(
            "id"
        );


    const raw =
        localStorage.getItem(
            "fasalrakshak_latest_result"
        );


    if (!raw) {

        container.innerHTML = `

            <div class="empty-state">

                Assessment result not found.

            </div>

        `;


        return;

    }


    let stored;


    try {

        stored =
            JSON.parse(
                raw
            );

    }

    catch {

        container.innerHTML = `

            <div class="empty-state">

                Stored assessment result is invalid.

            </div>

        `;


        return;

    }


    const evidence =
        stored.evidence || {};


    const assessment =
        stored.assessment || {};


    if (
        requestedId &&
        evidence.evidence_id !==
            requestedId
    ) {

        container.innerHTML = `

            <div class="empty-state">

                Requested assessment result
                was not found.

            </div>

        `;


        return;

    }


    const reportIdTag =
        document.getElementById(
            "reportIdTag"
        );


    if (reportIdTag) {

        reportIdTag.textContent =
            evidence.evidence_id ||
            "";

    }


    /* ======================================================================
       SAFETY GATE

       Disease-specific RAG guidance must NEVER be shown when:
       - evidence is invalid
       - image quality requires review
       - retake is required
       - RAG is not grounded
       ====================================================================== */

    const evidenceValid =
        assessment.evidence_valid ===
        true;


    const aiStatus =
        assessment.ai_status ||
        "";


    const sourceGrounded =
        assessment.grounded ===
        true;


    const isRetake =
        aiStatus ===
            "retake_required" ||

        aiStatus ===
            "quality_review_required" ||

        evidenceValid ===
            false;


    const canShowRAGGuidance =

        evidenceValid === true &&

        !isRetake &&

        sourceGrounded === true;


    /* ======================================================================
       RAG DATA
       ====================================================================== */

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


    /* ----------------------------------------------------------------------
       Symptoms

       ONLY VALID + GROUNDED EVIDENCE
       ---------------------------------------------------------------------- */

    const symptomsHTML =

        (
            canShowRAGGuidance &&
            symptoms.length
        )

            ? `

                <div class="card mt-3">

                    <h3>
                        Observed Disease Symptoms
                    </h3>

                    <ul>

                        ${symptoms
                            .map(
                                item =>
                                    `<li>${escapeFarmerHTML(item)}</li>`
                            )
                            .join("")}

                    </ul>

                </div>

            `

            : "";


    /* ----------------------------------------------------------------------
       Recommended actions

       ONLY VALID + GROUNDED EVIDENCE
       ---------------------------------------------------------------------- */

    const actionsHTML =

        (
            canShowRAGGuidance &&
            actions.length
        )

            ? `

                <div class="card mt-3">

                    <h3>
                        Recommended Next Actions
                    </h3>

                    <ul>

                        ${actions
                            .map(
                                item =>
                                    `<li>${escapeFarmerHTML(item)}</li>`
                            )
                            .join("")}

                    </ul>

                </div>

            `

            : "";


    /* ----------------------------------------------------------------------
       Official source

       NEVER show authoritative disease source for invalid evidence.
       ---------------------------------------------------------------------- */

    const sourceHTML =

        (
            canShowRAGGuidance &&
            assessment.source_name
        )

            ? `

                <div class="card mt-3">

                    <h3>
                        Knowledge Source
                    </h3>

                    <p>

                        ${escapeFarmerHTML(
                            assessment.source_name
                        )}

                    </p>


                    ${
                        assessment.source_url

                            ? `

                                <a

                                    href="${escapeFarmerHTML(
                                        assessment.source_url
                                    )}"

                                    target="_blank"

                                    rel="noopener noreferrer"

                                    class="btn btn-outline"

                                >

                                    View Authoritative Source

                                </a>

                            `

                            : ""
                    }

                </div>

            `

            : "";


    /* ======================================================================
       INVALID / RETAKE WARNING
       ====================================================================== */

    const invalidEvidenceHTML =

        isRetake

            ? `

                <div
                    class="card mt-3"
                    style="
                        border:1.5px solid #b7791f;
                    "
                >

                    <h3>
                        ⚠ Evidence Validation Failed
                    </h3>


                    <p class="mt-2">

                        The submitted image could not be
                        validated as sufficiently reliable
                        onion crop evidence for automated
                        disease guidance.

                    </p>


                    <p class="mt-2">

                        <strong>
                            Preliminary model output:
                        </strong>

                        ${escapeFarmerHTML(
                            assessment.prediction ||
                            assessment.damage_type ||
                            "Uncertain"
                        )}

                        ${
                            assessment.confidence != null

                                ? `(${escapeFarmerHTML(
                                    assessment.confidence
                                )}% confidence)`

                                : ""
                        }

                    </p>


                    <p class="mt-2">

                        Please upload a clear close-up
                        photograph of the affected onion
                        leaf or plant.

                    </p>


                    <p class="mt-2">

                        <strong>
                            No disease-management
                            recommendation is generated
                            from invalid evidence.
                        </strong>

                    </p>

                </div>

            `

            : "";


    /* ======================================================================
       IMAGE QUALITY INFORMATION
       ====================================================================== */

    const imageQuality =
        assessment.image_quality ||
        null;


    const qualityHTML =

        imageQuality

            ? `

                <div class="card mt-3">

                    <h3>
                        Image Quality Check
                    </h3>


                    <div
                        style="
                            margin-top:12px;
                            line-height:1.8;
                        "
                    >

                        <div>

                            <strong>
                                Resolution:
                            </strong>

                            ${
                                imageQuality.resolution_ok
                                    ? "Passed"
                                    : "Failed"
                            }

                        </div>


                        <div>

                            <strong>
                                Brightness:
                            </strong>

                            ${
                                imageQuality.brightness_ok
                                    ? "Passed"
                                    : "Failed"
                            }

                        </div>


                        <div>

                            <strong>
                                Sharpness:
                            </strong>

                            ${
                                imageQuality.sharpness_ok
                                    ? "Passed"
                                    : "Failed"
                            }

                        </div>


                        ${
                            Array.isArray(
                                imageQuality.quality_issues
                            ) &&
                            imageQuality
                                .quality_issues
                                .length

                                ? `

                                    <div
                                        style="
                                            margin-top:10px;
                                        "
                                    >

                                        <strong>
                                            Detected issue:
                                        </strong>

                                        ${escapeFarmerHTML(
                                            imageQuality
                                                .quality_issues
                                                .join(", ")
                                        )}

                                    </div>

                                `

                                : ""
                        }

                    </div>

                </div>

            `

            : "";


    /* ======================================================================
       RESULT TITLE
       ====================================================================== */

    const resultTitle =

        isRetake

            ? "Evidence could not be validated"

            : `${escapeFarmerHTML(
                assessment.crop ||
                "Onion"
            )} — ${escapeFarmerHTML(
                assessment.prediction ||
                assessment.damage_type ||
                "Assessment"
            )}`;


    /* ======================================================================
       RENDER
       ====================================================================== */

    container.innerHTML = `

        <div class="card ai-card">

            <div class="ai-header">

                <span class="ai-badge">

                    AI + RAG Preliminary Assessment

                </span>

            </div>


            <h2 class="mt-3">

                ${resultTitle}

            </h2>


            ${
                isRetake

                    ? `

                        <p
                            class="muted mt-2"
                        >

                            Preliminary classifier output:

                            ${escapeFarmerHTML(
                                assessment.prediction ||
                                assessment.damage_type ||
                                "Uncertain"
                            )}

                        </p>

                    `

                    : ""
            }


            <div class="metric-grid">


                <div class="metric-box">

                    <div class="metric-value">

                        ${
                            assessment.confidence != null

                                ? `${escapeFarmerHTML(
                                    assessment.confidence
                                )}%`

                                : "—"
                        }

                    </div>

                    <div class="metric-label">

                        AI Confidence

                    </div>

                </div>


                <div class="metric-box">

                    <div class="metric-value">

                        ${
                            evidenceValid

                                ? "Valid"

                                : "Retake"
                        }

                    </div>

                    <div class="metric-label">

                        Evidence Status

                    </div>

                </div>


                <div class="metric-box">

                    <div class="metric-value">

                        ${escapeFarmerHTML(
                            assessment.risk_level ||
                            "Needs Review"
                        )}

                    </div>

                    <div class="metric-label">

                        Review Level

                    </div>

                </div>


                <div class="metric-box">

                    <div class="metric-value">

                        ${
                            sourceGrounded

                                ? "Yes"

                                : "No"
                        }

                    </div>

                    <div class="metric-label">

                        Source Grounded

                    </div>

                </div>

            </div>


            <div class="card mt-3">

                <h3>
                    AI Explanation
                </h3>

                <p>

                    ${escapeFarmerHTML(
                        assessment.explanation ||
                        "No explanation available."
                    )}

                </p>

            </div>


            <p class="muted mt-3">

                📍

                ${escapeFarmerHTML(
                    stored.location ||
                    "Location unavailable"
                )}

            </p>


            <div class="disclaimer">

                <strong>

                    Human Verification Required.

                </strong>

                This AI result is preliminary.

                An authorized field officer
                must verify the submitted
                evidence before any official
                decision is made.

            </div>

        </div>


        ${invalidEvidenceHTML}


        ${qualityHTML}


        ${symptomsHTML}


        ${actionsHTML}


        ${sourceHTML}


        <a
            href="dashboard.html"
            class="btn btn-primary mt-4"
        >

            Back to Dashboard

        </a>

    `;

}