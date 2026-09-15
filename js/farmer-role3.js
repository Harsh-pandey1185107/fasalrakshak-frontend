/* ==========================================================================
   FASALRAKSHAK AI
   MONIKA ROLE 3 — FARMER REPORT WORKFLOW (MERGED)

   FEATURES
   --------------------------------------------------------------------------
   ✓ Multilingual Farmer UI
   ✓ Adaptive 4-Step Evidence Capture
   ✓ GPS + Timestamp
   ✓ Evidence Completeness
   ✓ Speech-to-Text
   ✓ Actual Voice Recording
   ✓ IndexedDB Draft Persistence
   ✓ Photo + Audio Blob Persistence
   ✓ Offline Submission Queue
   ✓ Automatic Synchronization
   ✓ Retry Synchronization
   ✓ Duplicate Submission Protection
   ========================================================================== */


/* ==========================================================================
   GLOBAL HELPERS
   ========================================================================== */

function farmerTranslate(key, fallback = "") {
  if (
    typeof FR_I18N !== "undefined" &&
    typeof FR_I18N.translate === "function"
  ) {
    const translated = FR_I18N.translate(key);

    if (translated && translated !== key) {
      return translated;
    }
  }

  return fallback || key;
}


function getFarmerLanguage() {
  if (
    typeof FR_I18N !== "undefined" &&
    typeof FR_I18N.getLanguage === "function"
  ) {
    return FR_I18N.getLanguage();
  }

  return localStorage.getItem("fr_language") || "en";
}


function createClientSubmissionId() {
  if (
    window.crypto &&
    typeof window.crypto.randomUUID === "function"
  ) {
    return window.crypto.randomUUID();
  }

  return (
    "FR-" +
    Date.now() +
    "-" +
    Math.random()
      .toString(36)
      .slice(2, 10)
  );
}


function createLocalReportId() {
  return (
    "LOCAL-" +
    Date.now() +
    "-" +
    Math.random().toString(36).slice(2, 10)
  );
}


async function ensureFarmerAuthentication() {
  if (typeof getFarmerToken === "function") {
    const existingToken = getFarmerToken();
    if (existingToken) {
      return existingToken;
    }
  }

  if (typeof registerFarmer !== "function") {
    throw new Error("Farmer authentication API is unavailable.");
  }

  const fullName = window.prompt("Enter farmer name:");
  if (!fullName || !fullName.trim()) {
    throw new Error("Farmer name is required for online submission.");
  }

  const phone = window.prompt("Enter 10-digit mobile number:");
  if (!phone || !phone.trim()) {
    throw new Error("Mobile number is required for online submission.");
  }

  const address =
    window.prompt("Enter village / district / address:") ||
    "India";

  const registration = await registerFarmer(
    fullName.trim(),
    phone.trim(),
    address.trim()
  );

  localStorage.setItem("fr_farmer_name", fullName.trim());

  return registration.access_token;
}


/* ==========================================================================
   FARMER DASHBOARD
   ========================================================================== */

function renderFarmerDashboard() {
  const reports = getAllReports();

  const statTotal =
    document.getElementById("statTotal");

  const statPending =
    document.getElementById("statPending");

  const statReview =
    document.getElementById("statReview");

  const statVerified =
    document.getElementById("statVerified");

  const listEl =
    document.getElementById("reportList");


  if (statTotal) {
    statTotal.textContent =
      reports.length;
  }


  if (statPending) {
    statPending.textContent =
      reports.filter(
        (report) =>
          report.status === "Pending"
      ).length;
  }


  if (statReview) {
    statReview.textContent =
      reports.filter(
        (report) =>
          report.status === "Under Review"
      ).length;
  }


  if (statVerified) {
    statVerified.textContent =
      reports.filter(
        (report) =>
          report.status === "Verified"
      ).length;
  }


  if (!listEl) {
    return;
  }


  if (reports.length === 0) {
    listEl.innerHTML = `
      <div class="empty-state">
        No reports yet.
      </div>
    `;

    return;
  }


  listEl.innerHTML =
    reports
      .slice(0, 5)
      .map((report) => {
        return `
          <div class="report-row">

            <div>

              <div class="report-id">
                ${report.id} · ${report.crop}
              </div>

              <div class="report-meta">
                ${report.damageType}
                ·
                ${formatDateTime(report.timestamp)}
              </div>

            </div>

            ${statusBadgeHTML(report.status)}

          </div>
        `;
      })
      .join("");
}


/* ==========================================================================
   FARMER REPORT FORM
   ========================================================================== */

function initReportForm() {

  const form =
    document.getElementById("reportForm");

  if (!form) {
    return;
  }


  const DRAFT_ID =
    "monika-role3-current-report";

  const ACTIVE_QUEUE_KEY =
    "fr_active_queued_report";


  /* =========================================================================
     ELEMENT REFERENCES
     ========================================================================= */

  const cropSelect =
    document.getElementById("cropSelect");

  const cropField =
    document.getElementById("cropField");

  const damageField =
    document.getElementById("damageField");

  const damageChips =
    document.querySelectorAll(
      "#damageChips .chip"
    );

  const locationField =
    document.getElementById("locationField");

  const locationInput =
    document.getElementById("locationInput");

  const gpsBtn =
    document.getElementById("gpsBtn");

  const gpsHint =
    document.getElementById("gpsHint");

  const gpsInfo =
    document.getElementById("gpsInfo");

  const timestampDisplay =
    document.getElementById(
      "timestampDisplay"
    );

  const descInput =
    document.getElementById("descInput");

  const voiceBtn =
    document.getElementById("voiceBtn");

  const voiceHint =
    document.getElementById("voiceHint");

  const offlineSaveStatus =
    document.getElementById(
      "offlineSaveStatus"
    );

  const networkIndicator =
    document.getElementById(
      "networkIndicator"
    );

  const networkStatusText =
    document.getElementById(
      "networkStatusText"
    );

  const completenessPercent =
    document.getElementById(
      "completenessPercent"
    );

  const evidenceProgress =
    document.getElementById(
      "evidenceProgress"
    );

  const evidenceProgressFill =
    document.getElementById(
      "evidenceProgressFill"
    );

  const completionMessage =
    document.getElementById(
      "completionMessage"
    );

  const submitEvidenceBtn =
    document.getElementById(
      "submitEvidenceBtn"
    );


  /* =========================================================================
     SYNC UI
     ========================================================================= */

  const syncStatusCard =
    document.getElementById(
      "syncStatusCard"
    );

  const syncStatusTitle =
    document.getElementById(
      "syncStatusTitle"
    );

  const syncStatusMessage =
    document.getElementById(
      "syncStatusMessage"
    );

  const syncQueueBadge =
    document.getElementById(
      "syncQueueBadge"
    );

  const retrySyncBtn =
    document.getElementById(
      "retrySyncBtn"
    );


  /* =========================================================================
     VOICE RECORDING UI
     ========================================================================= */

  const startVoiceRecordingBtn =
    document.getElementById(
      "startVoiceRecordingBtn"
    );

  const stopVoiceRecordingBtn =
    document.getElementById(
      "stopVoiceRecordingBtn"
    );

  const replaceVoiceRecordingBtn =
    document.getElementById(
      "replaceVoiceRecordingBtn"
    );

  const deleteVoiceRecordingBtn =
    document.getElementById(
      "deleteVoiceRecordingBtn"
    );

  const voiceRecordingState =
    document.getElementById(
      "voiceRecordingState"
    );

  const voiceRecordingTimer =
    document.getElementById(
      "voiceRecordingTimer"
    );

  const voicePlaybackWrap =
    document.getElementById(
      "voicePlaybackWrap"
    );

  const voicePlayback =
    document.getElementById(
      "voicePlayback"
    );

  const voiceRecordedLabel =
    document.getElementById(
      "voiceRecordedLabel"
    );

  const voiceRecorderHint =
    document.getElementById(
      "voiceRecorderHint"
    );


  /* =========================================================================
     STATE
     ========================================================================= */

  let selectedDamageType = "";

  let gpsData = null;

  let reportTimestamp =
    new Date().toISOString();

  let speechRecognizer = null;

  let speechRunning = false;

  let restoringDraft = false;

  let draftSaveTimer = null;

  let statusHideTimer = null;

  let recordingTimerInterval = null;

  let recordingStartedAt = null;

  let submissionLocked = false;

  let activeSubmissionId =
    sessionStorage.getItem(
      ACTIVE_QUEUE_KEY
    ) || null;


  let voiceRecordingMeta = {
    durationMs: 0,
    recordedAt: null
  };


  const evidenceState = {

    leaf: {
      file: null,
      previewUrl: null,
      capturedAt: null
    },

    plant: {
      file: null,
      previewUrl: null,
      capturedAt: null
    },

    field: {
      file: null,
      previewUrl: null,
      capturedAt: null
    },

    secondLocation: {
      file: null,
      previewUrl: null,
      capturedAt: null
    }

  };


  const evidenceConfig = {

    leaf: {
      input:
        document.getElementById(
          "leafInput"
        ),

      captureBtn:
        document.getElementById(
          "leafCaptureBtn"
        ),

      preview:
        document.getElementById(
          "leafPreview"
        ),

      previewWrap:
        document.getElementById(
          "leafPreviewWrap"
        ),

      step:
        document.getElementById(
          "leafStep"
        ),

      status:
        document.getElementById(
          "leafStatus"
        ),

      check:
        document.getElementById(
          "checkLeaf"
        )
    },


    plant: {
      input:
        document.getElementById(
          "plantInput"
        ),

      captureBtn:
        document.getElementById(
          "plantCaptureBtn"
        ),

      preview:
        document.getElementById(
          "plantPreview"
        ),

      previewWrap:
        document.getElementById(
          "plantPreviewWrap"
        ),

      step:
        document.getElementById(
          "plantStep"
        ),

      status:
        document.getElementById(
          "plantStatus"
        ),

      check:
        document.getElementById(
          "checkPlant"
        )
    },


    field: {
      input:
        document.getElementById(
          "fieldInput"
        ),

      captureBtn:
        document.getElementById(
          "fieldCaptureBtn"
        ),

      preview:
        document.getElementById(
          "fieldPreview"
        ),

      previewWrap:
        document.getElementById(
          "fieldPreviewWrap"
        ),

      step:
        document.getElementById(
          "fieldStep"
        ),

      status:
        document.getElementById(
          "fieldStatus"
        ),

      check:
        document.getElementById(
          "checkField"
        )
    },


    secondLocation: {
      input:
        document.getElementById(
          "secondLocationInput"
        ),

      captureBtn:
        document.getElementById(
          "secondLocationCaptureBtn"
        ),

      preview:
        document.getElementById(
          "secondLocationPreview"
        ),

      previewWrap:
        document.getElementById(
          "secondLocationPreviewWrap"
        ),

      step:
        document.getElementById(
          "secondLocationStep"
        ),

      status:
        document.getElementById(
          "secondLocationStatus"
        ),

      check:
        document.getElementById(
          "checkSecondLocation"
        )
    }

  };


  /* =========================================================================
     LANGUAGE TEXT
     ========================================================================= */

  const localText = {

    en: {
      notCaptured: "Not captured",
      locationPlaceholder:
        "Village, District, State",
      gpsCaptured:
        "Location captured successfully.",
      listening:
        "Listening...",
      speechAdded:
        "Voice text added. You can edit it.",
      speechError:
        "Could not capture voice.",
      draftSaved:
        "✓ Draft saved safely on this device.",
      draftRestored:
        "✓ Previous unfinished evidence restored.",
      evidenceComplete:
        "✓ Evidence package is complete and ready to submit.",
      locationRequired:
        "Please capture your GPS location.",
      microphoneReady:
        "Microphone is active. Speak clearly.",
      microphoneDenied:
        "Microphone permission was denied.",
      recordingSaved:
        "✓ Voice recording saved.",
      recordingDeleted:
        "Voice recording deleted.",
      recordingUnsupported:
        "Voice recording is not supported in this browser.",
      savedOffline:
        "📵 Saved Offline — Waiting for Network",
      offlineMessage:
        "Your evidence is safely stored on this device.",
      syncing:
        "Synchronizing...",
      syncingMessage:
        "Sending saved evidence securely.",
      submitted:
        "Submitted ✓",
      submittedMessage:
        "Evidence synchronized successfully.",
      syncFailed:
        "Synchronization failed",
      syncFailedMessage:
        "Your evidence is still safe. Retry when network is available."
    },


    hi: {
      notCaptured: "फोटो बाकी है",
      locationPlaceholder:
        "गाँव, जिला, राज्य",
      gpsCaptured:
        "स्थान सफलतापूर्वक दर्ज हो गया।",
      listening:
        "सुन रहा है...",
      speechAdded:
        "आवाज़ से विवरण जोड़ दिया गया है।",
      speechError:
        "आवाज़ दर्ज नहीं हो सकी।",
      draftSaved:
        "✓ ड्राफ्ट सुरक्षित रूप से सहेजा गया।",
      draftRestored:
        "✓ पिछला अधूरा प्रमाण वापस लोड हो गया है।",
      evidenceComplete:
        "✓ प्रमाण पूरा है और जमा करने के लिए तैयार है।",
      locationRequired:
        "कृपया GPS स्थान दर्ज करें।",
      microphoneReady:
        "माइक्रोफोन चालू है। स्पष्ट बोलें।",
      microphoneDenied:
        "माइक्रोफोन की अनुमति नहीं मिली।",
      recordingSaved:
        "✓ आवाज़ रिकॉर्डिंग सहेज ली गई।",
      recordingDeleted:
        "आवाज़ रिकॉर्डिंग हटा दी गई।",
      recordingUnsupported:
        "इस ब्राउज़र में रिकॉर्डिंग उपलब्ध नहीं है।",
      savedOffline:
        "📵 ऑफलाइन सहेजा गया — नेटवर्क की प्रतीक्षा",
      offlineMessage:
        "आपका प्रमाण इस डिवाइस पर सुरक्षित है।",
      syncing:
        "सिंक किया जा रहा है...",
      syncingMessage:
        "सहेजा गया प्रमाण भेजा जा रहा है।",
      submitted:
        "जमा हो गया ✓",
      submittedMessage:
        "प्रमाण सफलतापूर्वक सिंक हो गया।",
      syncFailed:
        "सिंक नहीं हो पाया",
      syncFailedMessage:
        "आपका प्रमाण सुरक्षित है। नेटवर्क मिलने पर फिर कोशिश करें।"
    },


    mr: {
      notCaptured: "फोटो बाकी आहे",
      locationPlaceholder:
        "गाव, जिल्हा, राज्य",
      gpsCaptured:
        "स्थान यशस्वीपणे नोंदवले.",
      listening:
        "ऐकत आहे...",
      speechAdded:
        "आवाजातून वर्णन जोडले आहे.",
      speechError:
        "आवाज नोंदवता आला नाही.",
      draftSaved:
        "✓ मसुदा सुरक्षितपणे जतन केला.",
      draftRestored:
        "✓ मागील अपूर्ण पुरावे पुन्हा लोड केले.",
      evidenceComplete:
        "✓ पुरावे पूर्ण आहेत आणि सबमिट करण्यासाठी तयार आहेत.",
      locationRequired:
        "कृपया GPS स्थान नोंदवा.",
      microphoneReady:
        "मायक्रोफोन सुरू आहे. स्पष्ट बोला.",
      microphoneDenied:
        "मायक्रोफोनची परवानगी मिळाली नाही.",
      recordingSaved:
        "✓ आवाज रेकॉर्डिंग जतन केले.",
      recordingDeleted:
        "आवाज रेकॉर्डिंग हटवले.",
      recordingUnsupported:
        "या ब्राउझरमध्ये रेकॉर्डिंग उपलब्ध नाही.",
      savedOffline:
        "📵 ऑफलाइन जतन केले — नेटवर्कची प्रतीक्षा",
      offlineMessage:
        "आपले पुरावे या डिव्हाइसवर सुरक्षित आहेत.",
      syncing:
        "सिंक होत आहे...",
      syncingMessage:
        "जतन केलेले पुरावे पाठवले जात आहेत.",
      submitted:
        "सबमिट झाले ✓",
      submittedMessage:
        "पुरावे यशस्वीपणे सिंक झाले.",
      syncFailed:
        "सिंक अयशस्वी",
      syncFailedMessage:
        "पुरावे सुरक्षित आहेत. नेटवर्क मिळाल्यावर पुन्हा प्रयत्न करा."
    },


    kn: {
      notCaptured: "ಫೋಟೋ ಬಾಕಿಯಿದೆ",
      locationPlaceholder:
        "ಗ್ರಾಮ, ಜಿಲ್ಲೆ, ರಾಜ್ಯ",
      gpsCaptured:
        "ಸ್ಥಳವನ್ನು ಯಶಸ್ವಿಯಾಗಿ ದಾಖಲಿಸಲಾಗಿದೆ.",
      listening:
        "ಆಲಿಸಲಾಗುತ್ತಿದೆ...",
      speechAdded:
        "ಧ್ವನಿಯಿಂದ ವಿವರಣೆ ಸೇರಿಸಲಾಗಿದೆ.",
      speechError:
        "ಧ್ವನಿ ದಾಖಲಿಸಲಾಗಲಿಲ್ಲ.",
      draftSaved:
        "✓ ಕರಡು ಸುರಕ್ಷಿತವಾಗಿ ಉಳಿಸಲಾಗಿದೆ.",
      draftRestored:
        "✓ ಹಿಂದಿನ ಅಪೂರ್ಣ ಸಾಕ್ಷ್ಯ ಮರುಸ್ಥಾಪಿಸಲಾಗಿದೆ.",
      evidenceComplete:
        "✓ ಸಾಕ್ಷ್ಯ ಪೂರ್ಣವಾಗಿದೆ ಮತ್ತು ಸಲ್ಲಿಸಲು ಸಿದ್ಧವಾಗಿದೆ.",
      locationRequired:
        "ದಯವಿಟ್ಟು GPS ಸ್ಥಳ ದಾಖಲಿಸಿ.",
      microphoneReady:
        "ಮೈಕ್ರೋಫೋನ್ ಸಕ್ರಿಯವಾಗಿದೆ.",
      microphoneDenied:
        "ಮೈಕ್ರೋಫೋನ್ ಅನುಮತಿ ದೊರೆಯಲಿಲ್ಲ.",
      recordingSaved:
        "✓ ಧ್ವನಿ ದಾಖಲಿಕೆ ಉಳಿಸಲಾಗಿದೆ.",
      recordingDeleted:
        "ಧ್ವನಿ ದಾಖಲಿಕೆ ಅಳಿಸಲಾಗಿದೆ.",
      recordingUnsupported:
        "ಈ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ರೆಕಾರ್ಡಿಂಗ್ ಲಭ್ಯವಿಲ್ಲ.",
      savedOffline:
        "📵 ಆಫ್‌ಲೈನ್‌ನಲ್ಲಿ ಉಳಿಸಲಾಗಿದೆ — ನೆಟ್‌ವರ್ಕ್‌ಗಾಗಿ ಕಾಯುತ್ತಿದೆ",
      offlineMessage:
        "ನಿಮ್ಮ ಸಾಕ್ಷ್ಯ ಈ ಸಾಧನದಲ್ಲಿ ಸುರಕ್ಷಿತವಾಗಿದೆ.",
      syncing:
        "ಸಿಂಕ್ ಆಗುತ್ತಿದೆ...",
      syncingMessage:
        "ಉಳಿಸಿದ ಸಾಕ್ಷ್ಯವನ್ನು ಕಳುಹಿಸಲಾಗುತ್ತಿದೆ.",
      submitted:
        "ಸಲ್ಲಿಸಲಾಗಿದೆ ✓",
      submittedMessage:
        "ಸಾಕ್ಷ್ಯ ಯಶಸ್ವಿಯಾಗಿ ಸಿಂಕ್ ಆಗಿದೆ.",
      syncFailed:
        "ಸಿಂಕ್ ವಿಫಲವಾಗಿದೆ",
      syncFailedMessage:
        "ಸಾಕ್ಷ್ಯ ಸುರಕ್ಷಿತವಾಗಿದೆ. ನೆಟ್‌ವರ್ಕ್ ಬಂದಾಗ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ."
    }

  };


  function text() {
    return (
      localText[getFarmerLanguage()] ||
      localText.en
    );
  }


  /* =========================================================================
     TIMESTAMP
     ========================================================================= */

  function renderTimestamp() {
    if (timestampDisplay) {
      timestampDisplay.value =
        formatDateTime(
          reportTimestamp
        );
    }
  }


  /* =========================================================================
     NETWORK STATUS
     ========================================================================= */

  function renderNetworkStatus() {

    if (
      !networkIndicator ||
      !networkStatusText
    ) {
      return;
    }


    if (navigator.onLine) {

      networkIndicator.classList.remove(
        "offline"
      );

      networkStatusText.textContent =
        farmerTranslate(
          "online",
          "Online"
        );

    } else {

      networkIndicator.classList.add(
        "offline"
      );

      networkStatusText.textContent =
        "📵 " +
        farmerTranslate(
          "offline",
          "Offline"
        );

    }

  }


  window.addEventListener(
    "online",
    renderNetworkStatus
  );


  window.addEventListener(
    "offline",
    renderNetworkStatus
  );


  /* =========================================================================
     SAVE STATUS
     ========================================================================= */

  function showSmallStatus(message) {

    if (!offlineSaveStatus) {
      return;
    }


    offlineSaveStatus.textContent =
      message;


    offlineSaveStatus.classList.add(
      "visible"
    );


    if (statusHideTimer) {
      clearTimeout(
        statusHideTimer
      );
    }


    statusHideTimer =
      setTimeout(
        () => {

          offlineSaveStatus.classList.remove(
            "visible"
          );

        },
        2600
      );

  }


  /* =========================================================================
     SYNC UI
     ========================================================================= */

  function clearSyncClasses() {

    if (!syncStatusCard) {
      return;
    }


    syncStatusCard.classList.remove(
      "pending",
      "syncing",
      "success",
      "failed"
    );

  }


  function showSyncStatus(
    mode,
    title,
    message,
    queueCount = 1
  ) {

    if (!syncStatusCard) {
      return;
    }


    clearSyncClasses();


    syncStatusCard.classList.add(
      "visible",
      mode
    );


    if (syncStatusTitle) {
      syncStatusTitle.textContent =
        title;
    }


    if (syncStatusMessage) {
      syncStatusMessage.textContent =
        message;
    }


    if (syncQueueBadge) {
      syncQueueBadge.textContent =
        String(queueCount);
    }

  }


  function hideSyncStatus() {

    if (!syncStatusCard) {
      return;
    }


    clearSyncClasses();


    syncStatusCard.classList.remove(
      "visible"
    );

  }


  async function refreshQueueStatus() {

    if (
      typeof FRSyncManager ===
      "undefined"
    ) {
      return;
    }


    try {

      const status =
        await FRSyncManager
          .getQueueStatus();


      const waitingCount =
        status.pending +
        status.failed +
        status.syncing;


      if (status.syncing > 0) {

        showSyncStatus(
          "syncing",
          text().syncing,
          text().syncingMessage,
          waitingCount
        );

        return;
      }


      if (
        status.pending > 0 &&
        !navigator.onLine
      ) {

        showSyncStatus(
          "pending",
          text().savedOffline,
          text().offlineMessage,
          waitingCount
        );

        return;
      }


      if (status.failed > 0) {

        showSyncStatus(
          "failed",
          text().syncFailed,
          text().syncFailedMessage,
          waitingCount
        );

        return;
      }


      if (
        status.pending > 0 &&
        navigator.onLine
      ) {

        showSyncStatus(
          "syncing",
          text().syncing,
          text().syncingMessage,
          waitingCount
        );

        return;
      }


      if (waitingCount === 0) {
        hideSyncStatus();
      }

    } catch (error) {

      console.error(
        "Could not read queue status:",
        error
      );

    }

  }


  /* =========================================================================
     EVIDENCE STATUS
     ========================================================================= */

  function updateLocationPlaceholder() {

    if (locationInput) {
      locationInput.placeholder =
        text().locationPlaceholder;
    }

  }


  function refreshEvidenceStatusText() {

    Object.keys(
      evidenceConfig
    ).forEach((key) => {

      const config =
        evidenceConfig[key];


      if (!config.status) {
        return;
      }


      if (evidenceState[key].file) {

        config.status.textContent =
          "✓ " +
          farmerTranslate(
            "photoCaptured",
            "Photo captured"
          );


        config.status.classList.add(
          "done"
        );

      } else {

        config.status.textContent =
          text().notCaptured;


        config.status.classList.remove(
          "done"
        );

      }

    });

  }


  /* =========================================================================
     COMPLETENESS
     ========================================================================= */

  function setCheckState(
    element,
    completed
  ) {

    if (!element) {
      return;
    }


    element.textContent =
      completed
        ? "✓"
        : "—";


    element.classList.toggle(
      "complete",
      completed
    );

  }


  function calculateCompleteness() {

    const checks = {

      leaf:
        Boolean(
          evidenceState.leaf.file
        ),

      plant:
        Boolean(
          evidenceState.plant.file
        ),

      field:
        Boolean(
          evidenceState.field.file
        ),

      secondLocation:
        Boolean(
          evidenceState
            .secondLocation.file
        ),

      gps:
        Boolean(gpsData),

      timestamp:
        Boolean(reportTimestamp)

    };


    const completed =
      Object.values(checks)
        .filter(Boolean)
        .length;


    return {

      checks,

      percentage:
        Math.round(
          (completed / 6) * 100
        )

    };

  }


  function updateCompleteness() {

    const result =
      calculateCompleteness();


    setCheckState(
      evidenceConfig.leaf.check,
      result.checks.leaf
    );


    setCheckState(
      evidenceConfig.plant.check,
      result.checks.plant
    );


    setCheckState(
      evidenceConfig.field.check,
      result.checks.field
    );


    setCheckState(
      evidenceConfig
        .secondLocation.check,
      result.checks.secondLocation
    );


    setCheckState(
      document.getElementById(
        "checkGps"
      ),
      result.checks.gps
    );


    setCheckState(
      document.getElementById(
        "checkTimestamp"
      ),
      result.checks.timestamp
    );


    if (completenessPercent) {
      completenessPercent.textContent =
        `${result.percentage}%`;
    }


    if (evidenceProgressFill) {
      evidenceProgressFill.style.width =
        `${result.percentage}%`;
    }


    if (evidenceProgress) {
      evidenceProgress.setAttribute(
        "aria-valuenow",
        String(
          result.percentage
        )
      );
    }


    if (completionMessage) {

      if (
        result.percentage === 100
      ) {

        completionMessage.textContent =
          text().evidenceComplete;


        completionMessage.classList.add(
          "visible"
        );

      } else {

        completionMessage.classList.remove(
          "visible"
        );

      }

    }


    return result;

  }


  /* =========================================================================
     PHOTO PREVIEWS
     ========================================================================= */

  function revokePreviewUrl(key) {

    const evidence =
      evidenceState[key];


    if (
      evidence &&
      evidence.previewUrl
    ) {

      URL.revokeObjectURL(
        evidence.previewUrl
      );


      evidence.previewUrl = null;

    }

  }


  function renderEvidencePreview(key) {

    const state =
      evidenceState[key];

    const config =
      evidenceConfig[key];


    if (!state || !config) {
      return;
    }


    revokePreviewUrl(key);


    if (!state.file) {

      if (config.previewWrap) {
        config.previewWrap.classList.remove(
          "visible"
        );
      }


      if (config.step) {
        config.step.classList.remove(
          "completed"
        );
      }


      return;
    }


    state.previewUrl =
      URL.createObjectURL(
        state.file
      );


    if (config.preview) {
      config.preview.src =
        state.previewUrl;
    }


    if (config.previewWrap) {
      config.previewWrap.classList.add(
        "visible"
      );
    }


    if (config.step) {

      config.step.classList.add(
        "completed"
      );


      config.step.classList.remove(
        "has-error"
      );

    }

  }


  /* =========================================================================
     GPS
     ========================================================================= */

  function renderGpsInformation() {

    if (
      !gpsData ||
      !gpsInfo
    ) {
      return;
    }


    const accuracy =
      Number.isFinite(
        Number(
          gpsData.accuracy
        )
      )
        ? Math.round(
          Number(
            gpsData.accuracy
          )
        )
        : null;


    gpsInfo.innerHTML = `

      <strong>
        ✓ GPS Captured
      </strong>

      <br>

      Latitude:
      ${Number(
      gpsData.latitude
    ).toFixed(6)}

      <br>

      Longitude:
      ${Number(
      gpsData.longitude
    ).toFixed(6)}

      ${accuracy !== null
        ? `
              <br>
              Accuracy:
              ±${accuracy} metres
            `
        : ""
      }

    `;


    gpsInfo.classList.add(
      "visible"
    );

  }


  function gpsSuccess(position) {

    gpsData = {

      latitude:
        position.coords.latitude,

      longitude:
        position.coords.longitude,

      accuracy:
        position.coords.accuracy,

      capturedAt:
        new Date().toISOString()

    };


    if (locationInput) {

      locationInput.value =
        `Lat ${gpsData.latitude.toFixed(6)}, Lon ${gpsData.longitude.toFixed(6)}`;

    }


    if (gpsHint) {
      gpsHint.textContent =
        text().gpsCaptured;
    }


    if (gpsBtn) {
      gpsBtn.disabled = false;
    }


    if (locationField) {
      locationField.classList.remove(
        "has-error"
      );
    }


    renderGpsInformation();

    updateCompleteness();

    saveDraftNow();

  }


  function gpsError(error) {

    gpsData = null;


    let message =
      farmerTranslate(
        "locationUnavailable",
        "Unable to get your location."
      );


    if (error) {

      if (error.code === 1) {
        message +=
          " Permission denied.";
      }

      if (error.code === 2) {
        message +=
          " Position unavailable.";
      }

      if (error.code === 3) {
        message +=
          " Request timed out.";
      }

    }


    if (gpsHint) {
      gpsHint.textContent =
        message;
    }


    if (gpsBtn) {
      gpsBtn.disabled = false;
    }


    updateCompleteness();

  }


  if (gpsBtn) {

    gpsBtn.addEventListener(
      "click",
      () => {

        if (
          !navigator.geolocation
        ) {

          gpsError();

          return;
        }


        gpsBtn.disabled = true;


        if (gpsHint) {
          gpsHint.textContent =
            farmerTranslate(
              "capturingLocation",
              "Capturing location..."
            );
        }


        navigator.geolocation
          .getCurrentPosition(

            gpsSuccess,

            gpsError,

            {
              enableHighAccuracy: true,
              timeout: 12000,
              maximumAge: 0
            }

          );

      }
    );

  }


  /* =========================================================================
     DRAFT STORAGE
     ========================================================================= */

  function createDraftRecord() {

    let voiceRecording = null;


    if (
      typeof FRVoiceRecorder !==
      "undefined" &&
      FRVoiceRecorder
        .hasRecording()
    ) {

      const blob =
        FRVoiceRecorder.getBlob();


      voiceRecording = {

        blob,

        mimeType:
          blob.type,

        size:
          blob.size,

        durationMs:
          voiceRecordingMeta.durationMs,

        recordedAt:
          voiceRecordingMeta.recordedAt

      };

    }


    return {

      id:
        DRAFT_ID,

      version:
        3,

      language:
        getFarmerLanguage(),

      crop:
        cropSelect
          ? cropSelect.value
          : "",

      damageType:
        selectedDamageType,

      description:
        descInput
          ? descInput.value
          : "",

      location:
        locationInput
          ? locationInput.value
          : "",

      gps:
        gpsData,

      timestamp:
        reportTimestamp,

      evidence: {

        leaf: {
          file:
            evidenceState.leaf.file,
          capturedAt:
            evidenceState.leaf.capturedAt
        },

        plant: {
          file:
            evidenceState.plant.file,
          capturedAt:
            evidenceState.plant.capturedAt
        },

        field: {
          file:
            evidenceState.field.file,
          capturedAt:
            evidenceState.field.capturedAt
        },

        secondLocation: {
          file:
            evidenceState
              .secondLocation.file,
          capturedAt:
            evidenceState
              .secondLocation
              .capturedAt
        }

      },

      voiceRecording

    };

  }


  async function saveDraftNow(
    showMessage = false
  ) {

    if (
      restoringDraft ||
      submissionLocked ||
      typeof FROfflineDB ===
      "undefined"
    ) {
      return;
    }


    try {

      await FROfflineDB.saveDraft(
        createDraftRecord()
      );


      if (showMessage) {
        showSmallStatus(
          text().draftSaved
        );
      }

    } catch (error) {

      console.error(
        "Draft save failed:",
        error
      );

    }

  }


  function scheduleDraftSave() {

    if (
      restoringDraft ||
      submissionLocked
    ) {
      return;
    }


    if (draftSaveTimer) {
      clearTimeout(
        draftSaveTimer
      );
    }


    draftSaveTimer =
      setTimeout(
        () => {
          saveDraftNow(false);
        },
        400
      );

  }


  async function restoreDraft() {

    if (
      typeof FROfflineDB ===
      "undefined"
    ) {
      return;
    }


    try {

      restoringDraft = true;


      const draft =
        await FROfflineDB.getDraft(
          DRAFT_ID
        );


      if (!draft) {

        restoringDraft = false;

        return;
      }


      if (
        cropSelect &&
        draft.crop
      ) {
        cropSelect.value =
          draft.crop;
      }


      if (draft.damageType) {

        selectedDamageType =
          draft.damageType;


        damageChips.forEach(
          (chip) => {

            chip.classList.toggle(
              "selected",
              chip.dataset.value ===
              selectedDamageType
            );

          }
        );

      }


      if (
        descInput &&
        typeof draft.description ===
        "string"
      ) {
        descInput.value =
          draft.description;
      }


      if (
        locationInput &&
        typeof draft.location ===
        "string"
      ) {
        locationInput.value =
          draft.location;
      }


      if (
        draft.gps &&
        Number.isFinite(
          Number(
            draft.gps.latitude
          )
        ) &&
        Number.isFinite(
          Number(
            draft.gps.longitude
          )
        )
      ) {

        gpsData =
          draft.gps;


        renderGpsInformation();


        if (gpsHint) {
          gpsHint.textContent =
            text().gpsCaptured;
        }

      }


      if (draft.timestamp) {

        reportTimestamp =
          draft.timestamp;


        renderTimestamp();

      }


      if (draft.evidence) {

        Object.keys(
          evidenceState
        ).forEach((key) => {

          const restored =
            draft.evidence[key];


          if (
            restored &&
            restored.file
          ) {

            evidenceState[key].file =
              restored.file;


            evidenceState[key].capturedAt =
              restored.capturedAt || null;


            renderEvidencePreview(key);

          }

        });

      }


      if (
        draft.voiceRecording &&
        draft.voiceRecording.blob &&
        typeof FRVoiceRecorder !==
        "undefined"
      ) {

        FRVoiceRecorder.setBlob(
          draft.voiceRecording.blob
        );


        voiceRecordingMeta = {

          durationMs:
            draft.voiceRecording
              .durationMs || 0,

          recordedAt:
            draft.voiceRecording
              .recordedAt || null

        };


        renderVoicePlayback();

      }


      refreshEvidenceStatusText();

      updateCompleteness();


      restoringDraft = false;


      showSmallStatus(
        text().draftRestored
      );

    } catch (error) {

      restoringDraft = false;


      console.error(
        "Draft restore failed:",
        error
      );

    }

  }


  /* =========================================================================
     PHOTO CAPTURE
     ========================================================================= */

  function validImage(file) {

    return Boolean(
      file &&
      typeof file.type ===
      "string" &&
      file.type.startsWith(
        "image/"
      ) &&
      file.size <=
      12 * 1024 * 1024
    );

  }


  async function handleEvidenceFile(key) {

    const config =
      evidenceConfig[key];


    if (
      !config ||
      !config.input
    ) {
      return;
    }


    const file =
      config.input.files[0];


    if (!file) {
      return;
    }


    if (!validImage(file)) {

      alert(
        "Please select a valid image smaller than 12 MB."
      );

      config.input.value = "";

      return;
    }


    revokePreviewUrl(key);


    evidenceState[key].file =
      file;


    evidenceState[key].capturedAt =
      new Date().toISOString();


    renderEvidencePreview(key);

    refreshEvidenceStatusText();

    updateCompleteness();

    await saveDraftNow(true);

  }


  Object.keys(
    evidenceConfig
  ).forEach((key) => {

    const config =
      evidenceConfig[key];


    if (
      config.captureBtn &&
      config.input
    ) {

      config.captureBtn.addEventListener(
        "click",
        () => {

          config.input.value = "";

          config.input.click();

        }
      );

    }


    if (config.input) {

      config.input.addEventListener(
        "change",
        () => {
          handleEvidenceFile(key);
        }
      );

    }

  });


  document
    .querySelectorAll(
      ".retake-btn"
    )
    .forEach((button) => {

      button.addEventListener(
        "click",
        () => {

          const config =
            evidenceConfig[
            button.dataset.target
            ];


          if (
            config &&
            config.input
          ) {

            config.input.value = "";

            config.input.click();

          }

        }
      );

    });


  /* =========================================================================
     FORM AUTOSAVE
     ========================================================================= */

  if (cropSelect) {

    cropSelect.addEventListener(
      "change",
      () => {

        if (
          cropSelect.value &&
          cropField
        ) {
          cropField.classList.remove(
            "has-error"
          );
        }

        scheduleDraftSave();

      }
    );

  }


  damageChips.forEach(
    (chip) => {

      chip.addEventListener(
        "click",
        () => {

          damageChips.forEach(
            (item) =>
              item.classList.remove(
                "selected"
              )
          );


          chip.classList.add(
            "selected"
          );


          selectedDamageType =
            chip.dataset.value;


          if (damageField) {
            damageField.classList.remove(
              "has-error"
            );
          }


          scheduleDraftSave();

        }
      );

    }
  );


  if (descInput) {
    descInput.addEventListener(
      "input",
      scheduleDraftSave
    );
  }


  if (locationInput) {
    locationInput.addEventListener(
      "input",
      scheduleDraftSave
    );
  }


  /* =========================================================================
     SPEECH TO TEXT
     ========================================================================= */

  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;


  function speechLanguage() {

    const map = {
      en: "en-IN",
      hi: "hi-IN",
      mr: "mr-IN",
      kn: "kn-IN"
    };


    return (
      map[getFarmerLanguage()] ||
      "en-IN"
    );

  }


  if (
    SpeechRecognition &&
    voiceBtn
  ) {

    voiceBtn.addEventListener(
      "click",
      () => {

        if (
          speechRunning &&
          speechRecognizer
        ) {

          speechRecognizer.stop();

          return;
        }


        speechRecognizer =
          new SpeechRecognition();


        speechRecognizer.lang =
          speechLanguage();


        speechRecognizer.interimResults =
          false;


        speechRecognizer.continuous =
          false;


        speechRecognizer.onstart =
          () => {

            speechRunning = true;

            if (voiceHint) {
              voiceHint.textContent =
                text().listening;
            }

          };


        speechRecognizer.onresult =
          (event) => {

            const transcript =
              event.results[0][0]
                .transcript;


            if (descInput) {

              const previous =
                descInput.value.trim();


              descInput.value =
                previous
                  ? previous +
                  " " +
                  transcript
                  : transcript;

            }


            if (voiceHint) {
              voiceHint.textContent =
                text().speechAdded;
            }


            saveDraftNow();

          };


        speechRecognizer.onerror =
          () => {

            if (voiceHint) {
              voiceHint.textContent =
                text().speechError;
            }

          };


        speechRecognizer.onend =
          () => {
            speechRunning = false;
          };


        try {
          speechRecognizer.start();
        } catch (error) {
          console.error(error);
        }

      }
    );

  }


  /* =========================================================================
     ACTUAL VOICE RECORDING
     ========================================================================= */

  function stopRecordingTimer() {

    if (recordingTimerInterval) {

      clearInterval(
        recordingTimerInterval
      );

      recordingTimerInterval = null;

    }

  }


  function startRecordingTimer() {

    stopRecordingTimer();

    recordingStartedAt =
      Date.now();


    recordingTimerInterval =
      setInterval(
        () => {

          if (
            voiceRecordingTimer &&
            typeof FRVoiceRecorder !==
            "undefined"
          ) {

            voiceRecordingTimer.textContent =
              FRVoiceRecorder.formatDuration(
                Date.now() -
                recordingStartedAt
              );

          }

        },
        250
      );

  }


  function renderVoicePlayback() {

    if (
      typeof FRVoiceRecorder ===
      "undefined"
    ) {
      return;
    }


    if (
      !FRVoiceRecorder
        .hasRecording()
    ) {

      if (voicePlaybackWrap) {
        voicePlaybackWrap.classList.remove(
          "visible"
        );
      }

      return;
    }


    if (voicePlayback) {

      voicePlayback.src =
        FRVoiceRecorder.getUrl();

      voicePlayback.load();

    }


    if (voicePlaybackWrap) {
      voicePlaybackWrap.classList.add(
        "visible"
      );
    }


    if (voiceRecordedLabel) {

      voiceRecordedLabel.textContent =
        text().recordingSaved +
        (
          voiceRecordingMeta.durationMs
            ? " " +
            FRVoiceRecorder
              .formatDuration(
                voiceRecordingMeta
                  .durationMs
              )
            : ""
        );

    }

  }


  function setRecordingMode(active) {

    if (voiceRecordingState) {
      voiceRecordingState.classList.toggle(
        "visible",
        active
      );
    }


    if (startVoiceRecordingBtn) {
      startVoiceRecordingBtn.disabled =
        active;
    }


    if (stopVoiceRecordingBtn) {
      stopVoiceRecordingBtn.disabled =
        !active;
    }


    if (replaceVoiceRecordingBtn) {
      replaceVoiceRecordingBtn.disabled =
        active;
    }


    if (deleteVoiceRecordingBtn) {
      deleteVoiceRecordingBtn.disabled =
        active;
    }


    if (active) {
      startRecordingTimer();
    } else {
      stopRecordingTimer();
    }

  }


  async function beginVoiceRecording() {

    if (
      typeof FRVoiceRecorder ===
      "undefined" ||
      !FRVoiceRecorder
        .isSupported()
    ) {

      if (voiceRecorderHint) {
        voiceRecorderHint.textContent =
          text().recordingUnsupported;
      }

      return;
    }


    try {

      await FRVoiceRecorder.start();


      setRecordingMode(true);


      if (voiceRecorderHint) {
        voiceRecorderHint.textContent =
          text().microphoneReady;
      }

    } catch (error) {

      setRecordingMode(false);


      if (voiceRecorderHint) {
        voiceRecorderHint.textContent =
          text().microphoneDenied;
      }

    }

  }


  async function stopVoiceRecording() {

    if (
      typeof FRVoiceRecorder ===
      "undefined" ||
      !FRVoiceRecorder
        .isRecording()
    ) {
      return;
    }


    try {

      const result =
        await FRVoiceRecorder.stop();


      voiceRecordingMeta = {

        durationMs:
          result.durationMs || 0,

        recordedAt:
          new Date().toISOString()

      };


      setRecordingMode(false);


      if (voiceRecordingTimer) {
        voiceRecordingTimer.textContent =
          "00:00";
      }


      renderVoicePlayback();


      await saveDraftNow(true);

    } catch (error) {

      console.error(
        "Voice stop failed:",
        error
      );


      setRecordingMode(false);

    }

  }


  async function deleteVoiceRecording() {

    if (
      typeof FRVoiceRecorder ===
      "undefined"
    ) {
      return;
    }


    if (voicePlayback) {
      voicePlayback.pause();
    }


    FRVoiceRecorder.clear();


    voiceRecordingMeta = {
      durationMs: 0,
      recordedAt: null
    };


    if (voicePlaybackWrap) {
      voicePlaybackWrap.classList.remove(
        "visible"
      );
    }


    if (voiceRecorderHint) {
      voiceRecorderHint.textContent =
        text().recordingDeleted;
    }


    await saveDraftNow();

  }


  if (startVoiceRecordingBtn) {
    startVoiceRecordingBtn.addEventListener(
      "click",
      beginVoiceRecording
    );
  }


  if (stopVoiceRecordingBtn) {
    stopVoiceRecordingBtn.addEventListener(
      "click",
      stopVoiceRecording
    );
  }


  if (replaceVoiceRecordingBtn) {
    replaceVoiceRecordingBtn.addEventListener(
      "click",
      beginVoiceRecording
    );
  }


  if (deleteVoiceRecordingBtn) {
    deleteVoiceRecordingBtn.addEventListener(
      "click",
      deleteVoiceRecording
    );
  }


  /* =========================================================================
     VALIDATION
     ========================================================================= */

  function validateEvidencePhotos() {

    let valid = true;


    Object.keys(
      evidenceConfig
    ).forEach((key) => {

      const config =
        evidenceConfig[key];


      if (!evidenceState[key].file) {

        valid = false;


        if (config.step) {
          config.step.classList.add(
            "has-error"
          );
        }

      } else if (config.step) {

        config.step.classList.remove(
          "has-error"
        );

      }

    });


    return valid;

  }


  function validateCrop() {

    if (
      !cropSelect ||
      !cropSelect.value
    ) {

      if (cropField) {
        cropField.classList.add(
          "has-error"
        );
      }

      return false;

    }


    if (cropField) {
      cropField.classList.remove(
        "has-error"
      );
    }


    return true;

  }


  function validateDamage() {

    if (!selectedDamageType) {

      if (damageField) {
        damageField.classList.add(
          "has-error"
        );
      }

      return false;

    }


    if (damageField) {
      damageField.classList.remove(
        "has-error"
      );
    }


    return true;

  }


  function validateLocation() {

    if (!gpsData) {

      if (locationField) {
        locationField.classList.add(
          "has-error"
        );
      }


      if (gpsHint) {
        gpsHint.textContent =
          text().locationRequired;
      }


      return false;

    }


    if (locationField) {
      locationField.classList.remove(
        "has-error"
      );
    }


    return true;

  }


  /* =========================================================================
     CREATE REPORT DATA
     ========================================================================= */

  function evidenceMetadata(key) {

    const evidence =
      evidenceState[key];


    if (!evidence.file) {
      return null;
    }


    return {

      type:
        key,

      fileName:
        evidence.file.name ||
        `${key}-evidence`,

      mimeType:
        evidence.file.type,

      size:
        evidence.file.size,

      capturedAt:
        evidence.capturedAt

    };

  }


  function createSubmissionPayload(
    reportId,
    completeness
  ) {

    let voiceMetadata = null;

    let binaryVoiceRecording = null;


    if (
      typeof FRVoiceRecorder !==
      "undefined" &&
      FRVoiceRecorder
        .hasRecording()
    ) {

      const blob =
        FRVoiceRecorder.getBlob();


      voiceMetadata = {

        mimeType:
          blob.type,

        size:
          blob.size,

        durationMs:
          voiceRecordingMeta.durationMs,

        recordedAt:
          voiceRecordingMeta.recordedAt

      };


      binaryVoiceRecording = {
        blob
      };

    }


    return {

      id:
        reportId,

      clientSubmissionId:
        createClientSubmissionId(),

      farmerId:
        null,

      farmerName:
        localStorage.getItem("fr_farmer_name") ||
        "Authenticated Farmer",

      language:
        getFarmerLanguage(),

      crop:
        cropSelect.value,

      damageType:
        selectedDamageType,

      description:
        descInput
          ? descInput.value.trim()
          : "",

      location:
        locationInput
          ? locationInput.value.trim()
          : "",

      gps:
      {
        ...gpsData
      },

      timestamp:
        reportTimestamp,

      evidenceCompleteness:
        completeness.percentage,

      evidenceCount:
        4,

      captureWorkflow:
        "adaptive-4-step",

      evidence: {

        leaf:
          evidenceMetadata(
            "leaf"
          ),

        plant:
          evidenceMetadata(
            "plant"
          ),

        field:
          evidenceMetadata(
            "field"
          ),

        secondLocation:
          evidenceMetadata(
            "secondLocation"
          )

      },

      binaryEvidence: {

        leaf: {
          file:
            evidenceState
              .leaf.file
        },

        plant: {
          file:
            evidenceState
              .plant.file
        },

        field: {
          file:
            evidenceState
              .field.file
        },

        secondLocation: {
          file:
            evidenceState
              .secondLocation
              .file
        }

      },

      voiceRecording:
        voiceMetadata,

      binaryVoiceRecording,

      createdAt:
        new Date().toISOString(),

      status:
        "Pending"

    };

  }


  function createDashboardReport(
    payload
  ) {

    const report = {

      id:
        payload.id,

      farmerId:
        payload.farmerId,

      farmerName:
        payload.farmerName,

      language:
        payload.language,

      crop:
        payload.crop,

      damageType:
        payload.damageType,

      description:
        payload.description,

      location:
        payload.location,

      gps:
        payload.gps,

      timestamp:
        payload.timestamp,

      evidence:
        payload.evidence,

      voiceRecording:
        payload.voiceRecording,

      evidenceCompleteness:
        payload.evidenceCompleteness,

      evidenceCount:
        4,

      captureWorkflow:
        "adaptive-4-step",

      imageColor:
        "#7C9070",

      status:
        "Pending",

      syncState:
        navigator.onLine
          ? "syncing"
          : "pending-sync",

      officerRemark:
        ""
    };


    report.ai = {
      damagePercent: null,
      confidence: null,
      evidenceValid: false,
      risk: "Needs Review",
      prediction: null,
      status: "Awaiting Backend AI Assessment",
      humanVerificationRequired: true
    };


    return report;

  }


  /* =========================================================================
     SUBMIT
     ========================================================================= */

  form.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();


      if (submissionLocked) {
        return;
      }


      if (
        typeof FRVoiceRecorder !==
        "undefined" &&
        FRVoiceRecorder
          .isRecording()
      ) {

        alert(
          "Please stop the voice recording before submitting."
        );

        return;
      }


      const photosValid =
        validateEvidencePhotos();

      const cropValid =
        validateCrop();

      const damageValid =
        validateDamage();

      const locationValid =
        validateLocation();

      const completeness =
        updateCompleteness();


      const valid =
        photosValid &&
        cropValid &&
        damageValid &&
        locationValid &&
        completeness.percentage === 100;


      if (!valid) {

        const firstError =
          document.querySelector(
            ".has-error"
          );


        if (firstError) {

          firstError.scrollIntoView({
            behavior: "smooth",
            block: "center"
          });

        }


        return;
      }


      submissionLocked = true;


      if (submitEvidenceBtn) {
        submitEvidenceBtn.disabled =
          true;
      }


      const reportId =
        createLocalReportId();


      const payload =
        createSubmissionPayload(
          reportId,
          completeness
        );


      try {

        /*
          Online submissions require the real farmer JWT.
          Offline capture remains local and can authenticate later via Retry Sync.
        */
        if (navigator.onLine) {
          showSmallStatus("Authenticating farmer...");
          await ensureFarmerAuthentication();
        }

        /*
          Save actual binary evidence into
          IndexedDB submission queue.
        */

        await FROfflineDB
          .queueSubmission(
            payload
          );


        /*
          Save lightweight report metadata
          for existing dashboard/result pages.
        */

        const dashboardReport =
          createDashboardReport(
            payload
          );


        saveReport(
          dashboardReport
        );


        activeSubmissionId =
          reportId;


        sessionStorage.setItem(
          ACTIVE_QUEUE_KEY,
          reportId
        );


        /*
          Finished report is now protected
          by the submission queue.
          Draft can safely be deleted.
        */

        await FROfflineDB
          .deleteDraft(
            DRAFT_ID
          );


        if (!navigator.onLine) {

          showSyncStatus(
            "pending",
            text().savedOffline,
            text().offlineMessage,
            1
          );


          showSmallStatus(
            text().savedOffline
          );


          /*
            Keep user on this page.
            When network returns the sync
            manager will automatically run.
          */

          return;

        }


        /*
          ONLINE:
          use the same queue architecture.
        */

        showSyncStatus(
          "syncing",
          text().syncing,
          text().syncingMessage,
          1
        );


        await FRSyncManager
          .syncPendingSubmissions();


      } catch (error) {

        console.error(
          "Submission queue error:",
          error
        );


        submissionLocked = false;


        if (submitEvidenceBtn) {
          submitEvidenceBtn.disabled =
            false;
        }


        showSyncStatus(
          "failed",
          text().syncFailed,
          text().syncFailedMessage,
          1
        );

      }

    }
  );


  /* =========================================================================
     SYNC EVENTS
     ========================================================================= */

  window.addEventListener(
    "fr-sync-started",
    async () => {

      await refreshQueueStatus();

    }
  );


  window.addEventListener(
    "fr-sync-item-started",
    async () => {

      const status =
        await FRSyncManager
          .getQueueStatus();


      const count =
        status.pending +
        status.failed +
        status.syncing;


      showSyncStatus(
        "syncing",
        text().syncing,
        text().syncingMessage,
        Math.max(
          count,
          1
        )
      );

    }
  );


  window.addEventListener(
    "fr-sync-item-succeeded",
    async (event) => {

      const syncedId =
        event.detail.id;


      const status =
        await FRSyncManager
          .getQueueStatus();


      showSyncStatus(
        "success",
        text().submitted,
        text().submittedMessage,
        0
      );


      /*
        Only redirect if the successful
        report is the report currently
        submitted from this page.
      */

      if (
        activeSubmissionId &&
        syncedId ===
        activeSubmissionId
      ) {

        sessionStorage.removeItem(
          ACTIVE_QUEUE_KEY
        );


        const syncResponse =
          event.detail.response || {};

        const assessmentWrapper =
          event.detail.assessment || null;

        const assessmentResponse =
          assessmentWrapper &&
          !assessmentWrapper.skipped &&
          assessmentWrapper.response
            ? assessmentWrapper.response
            : {};

        const syncedImages =
          Array.isArray(syncResponse.images)
            ? syncResponse.images
            : [];

        const leafEvidence =
          syncedImages.find((item) =>
            String(item.offline_image_id || "").endsWith("-01-leaf")
          ) ||
          syncedImages[0] ||
          null;

        const finalEvidenceId =
          leafEvidence && leafEvidence.evidence_id
            ? leafEvidence.evidence_id
            : null;

        if (finalEvidenceId) {
          localStorage.setItem(
            "fasalrakshak_latest_result",
            JSON.stringify({
              evidence: {
                ...leafEvidence,
                evidence_id: finalEvidenceId,
                report_id: syncResponse.report_id || null,
                created_at: new Date().toISOString()
              },
              assessment: assessmentResponse,
              location: locationInput
                ? locationInput.value.trim()
                : "",
              submitted_at: new Date().toISOString()
            })
          );
        }

        activeSubmissionId = null;

        setTimeout(
          () => {
            window.location.href = finalEvidenceId
              ? `assessment-result.html?id=${encodeURIComponent(finalEvidenceId)}`
              : "dashboard.html";
          },
          1400
        );

      } else {

        await refreshQueueStatus();

      }

    }
  );


  window.addEventListener(
    "fr-sync-item-failed",
    async () => {

      const status =
        await FRSyncManager
          .getQueueStatus();


      const count =
        status.pending +
        status.failed +
        status.syncing;


      showSyncStatus(
        "failed",
        text().syncFailed,
        text().syncFailedMessage,
        Math.max(
          count,
          1
        )
      );

    }
  );


  window.addEventListener(
    "fr-network-restored",
    async () => {

      showSyncStatus(
        "syncing",
        text().syncing,
        text().syncingMessage,
        1
      );

    }
  );


  window.addEventListener(
    "fr-network-lost",
    async () => {

      await refreshQueueStatus();

    }
  );


  /* =========================================================================
     RETRY SYNC
     ========================================================================= */

  if (retrySyncBtn) {

    retrySyncBtn.addEventListener(
      "click",
      async () => {

        if (!navigator.onLine) {

          showSyncStatus(
            "pending",
            text().savedOffline,
            text().offlineMessage,
            1
          );

          return;
        }


        showSyncStatus(
          "syncing",
          text().syncing,
          text().syncingMessage,
          1
        );


        try {
          await ensureFarmerAuthentication();
          await FRSyncManager.retryNow();
        } catch (error) {
          console.error("Retry authentication/sync failed:", error);
          showSyncStatus(
            "failed",
            text().syncFailed,
            error.message || text().syncFailedMessage,
            1
          );
        }

      }
    );

  }


  /* =========================================================================
     LANGUAGE CHANGE
     ========================================================================= */

  window.addEventListener(
    "fr-language-changed",
    async () => {

      updateLocationPlaceholder();

      refreshEvidenceStatusText();

      renderNetworkStatus();

      updateCompleteness();

      renderVoicePlayback();

      await refreshQueueStatus();

      scheduleDraftSave();

    }
  );


  /* =========================================================================
     PAGE CLEANUP
     ========================================================================= */

  window.addEventListener(
    "beforeunload",
    () => {

      stopRecordingTimer();


      Object.keys(
        evidenceState
      ).forEach(
        revokePreviewUrl
      );

    }
  );


  /* =========================================================================
     INITIAL PAGE
     ========================================================================= */

  renderTimestamp();

  updateLocationPlaceholder();

  refreshEvidenceStatusText();

  renderNetworkStatus();

  updateCompleteness();


  if (
    typeof FRVoiceRecorder ===
    "undefined" ||
    !FRVoiceRecorder
      .isSupported()
  ) {

    if (startVoiceRecordingBtn) {
      startVoiceRecordingBtn.disabled =
        true;
    }


    if (voiceRecorderHint) {
      voiceRecorderHint.textContent =
        text().recordingUnsupported;
    }

  }


  restoreDraft();

  refreshQueueStatus();

}


/* ==========================================================================
   ASSESSMENT RESULT
   ========================================================================== */

function renderAssessmentResult() {

  const id =
    getQueryParam("id");


  const report =
    getReportById(id);


  const container =
    document.getElementById(
      "resultContainer"
    );


  if (!container) {
    return;
  }


  if (!report) {

    container.innerHTML = `

      <div class="empty-state">
        Report not found.
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
      report.id;
  }


  const ai =
    report.ai || {

      damagePercent:
        "—",

      confidence:
        "—",

      evidenceValid:
        false,

      risk:
        "Pending"

    };


  const evidenceSummary =
    typeof report.evidenceCompleteness ===
      "number"
      ? `

          <div class="metric-box">

            <div class="metric-value">
              ${report.evidenceCompleteness}%
            </div>

            <div class="metric-label">
              Evidence Complete
            </div>

          </div>

        `
      : "";


  const voiceSummary =
    report.voiceRecording
      ? `

          <div class="metric-box">

            <div class="metric-value">
              ✓
            </div>

            <div class="metric-label">
              Voice Evidence
            </div>

          </div>

        `
      : "";


  container.innerHTML = `

    <div class="card ai-card">

      <div class="ai-header">

        <span class="ai-badge">
          Preliminary AI Assessment
        </span>

      </div>


      ${placeholderPhotoSVG(
    report.imageColor ||
    "#7C9070",
    report.crop
  )}


      <h3 class="mt-3 mb-3">

        ${report.crop}
        —
        ${report.damageType}

      </h3>


      <div class="metric-grid">

        <div class="metric-box">

          <div class="metric-value">
            ${ai.damagePercent}%
          </div>

          <div class="metric-label">
            Estimated Damage
          </div>

        </div>


        <div class="metric-box">

          <div class="metric-value">
            ${ai.confidence}%
          </div>

          <div class="metric-label">
            Confidence
          </div>

        </div>


        <div class="metric-box">

          <div class="metric-value">
            ${ai.evidenceValid
      ? "Valid"
      : "Unclear"
    }
          </div>

          <div class="metric-label">
            Evidence Status
          </div>

        </div>


        <div class="metric-box">

          <div class="metric-value">
            ${ai.risk}
          </div>

          <div class="metric-label">
            Risk Level
          </div>

        </div>


        ${evidenceSummary}

        ${voiceSummary}

      </div>


      <p class="muted">

        📍 ${report.location}

        &nbsp;·&nbsp;

        🕐 ${formatDateTime(
      report.timestamp
    )}

      </p>


      <div class="disclaimer">

        <strong>
          Preliminary AI Assessment —
          Human Verification Required.
        </strong>

        This result is generated automatically
        and is not final.

        An authorized field officer will review
        this evidence before any decision is made.

      </div>

    </div>


    <a
      href="dashboard.html"
      class="btn btn-primary"
    >
      Back to Dashboard
    </a>

  `;
}