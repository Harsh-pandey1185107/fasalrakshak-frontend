/* ============================================================================
   FASALRAKSHAK AI
   MONIKA ROLE 3 -> ROLE 4 -> ROLE 2 / ROLE 6 INTEGRATION

   Real flow:
   IndexedDB queue -> FastAPI /sync/reports -> leaf evidence -> /assessment/{id}

   Notes:
   - Keeps the existing FROfflineDB queue/state API used by farmer.js.
   - Sends all evidence photos using the repeated multipart field name "images".
   - Uses the farmer JWT from localStorage (default key: farmer_token).
   - Does NOT send the voice blob yet because the current Role 4 sync endpoint
     accepts metadata + images only. The voice recording remains stored locally.
   ============================================================================ */

const FRSyncManager = {
  isSyncing: false,
  syncPromise: null,
  maxAutomaticAttempts: 5,
  retryBaseDelayMs: 1500,

  /* --------------------------------------------------------------------------
     BACKEND CONFIGURATION
     -------------------------------------------------------------------------- */

  getApiBaseUrl() {
    const config = window.FR_BACKEND_CONFIG || {};

    if (typeof config.apiBaseUrl === "string" && config.apiBaseUrl.trim()) {
      return config.apiBaseUrl.trim().replace(/\/$/, "");
    }

    if (
      typeof config.submissionEndpoint === "string" &&
      config.submissionEndpoint.trim()
    ) {
      return config.submissionEndpoint
        .trim()
        .replace(/\/sync\/reports\/?$/, "")
        .replace(/\/$/, "");
    }

    return "http://127.0.0.1:8000/api/v1";
  },

  getBackendEndpoint() {
    const config = window.FR_BACKEND_CONFIG || {};

    if (
      typeof config.submissionEndpoint === "string" &&
      config.submissionEndpoint.trim()
    ) {
      return config.submissionEndpoint.trim();
    }

    return `${this.getApiBaseUrl()}/sync/reports`;
  },

  getAssessmentEndpoint(evidenceId) {
    return `${this.getApiBaseUrl()}/assessment/${encodeURIComponent(evidenceId)}`;
  },

  getFarmerToken() {
    const config = window.FR_BACKEND_CONFIG || {};

    if (typeof config.getToken === "function") {
      const configuredToken = config.getToken();
      if (configuredToken) return String(configuredToken).trim();
    }

    if (typeof config.farmerToken === "string" && config.farmerToken.trim()) {
      return config.farmerToken.trim();
    }

    if (typeof window.getFarmerToken === "function") {
      try {
        const apiToken = window.getFarmerToken();
        if (apiToken) return String(apiToken).trim();
      } catch (error) {
        console.warn("Could not read token from window.getFarmerToken().", error);
      }
    }

    const possibleKeys = [
      "farmer_token",
      "fr_farmer_token",
      "access_token"
    ];

    for (const key of possibleKeys) {
      const token = localStorage.getItem(key);
      if (token && token.trim()) return token.trim();
    }

    return "";
  },

  /* --------------------------------------------------------------------------
     EVENTS / HELPERS
     -------------------------------------------------------------------------- */

  emit(eventName, detail = {}) {
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
  },

  wait(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  },

  safeIsoTimestamp(value) {
    if (typeof value === "string" && value.trim()) {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) return date.toISOString();
    }

    return new Date().toISOString();
  },

  imageExtension(mimeType) {
    const type = String(mimeType || "").toLowerCase();
    if (type === "image/png") return "png";
    if (type === "image/webp") return "webp";
    return "jpg";
  },

  requireSupportedImage(blob, label) {
    if (!(blob instanceof Blob)) {
      throw new Error(`${label} image is missing from the offline submission.`);
    }

    const supported = ["image/jpeg", "image/png", "image/webp"];

    if (!supported.includes(String(blob.type || "").toLowerCase())) {
      throw new Error(
        `${label} uses unsupported image type '${blob.type || "unknown"}'. Use JPEG, PNG or WebP.`
      );
    }
  },

  /* --------------------------------------------------------------------------
     ROLE 3 -> ROLE 4 MULTIPART PAYLOAD
     -------------------------------------------------------------------------- */

  buildImageItems(submission) {
    const binaryEvidence = submission.binaryEvidence || {};
    const metadataEvidence = submission.evidence || {};
    const baseId = String(
      submission.clientSubmissionId || submission.id || Date.now()
    ).replace(/[^A-Za-z0-9_-]/g, "-");

    const definitions = [
      { key: "leaf", suffix: "01-leaf", label: "Leaf close-up" },
      { key: "plant", suffix: "02-plant", label: "Whole plant" },
      { key: "field", suffix: "03-field", label: "Field view" },
      {
        key: "secondLocation",
        suffix: "04-second-location",
        label: "Second location"
      }
    ];

    const items = [];

    for (const definition of definitions) {
      const binary = binaryEvidence[definition.key];
      const file = binary && binary.file;

      if (!(file instanceof Blob)) continue;

      this.requireSupportedImage(file, definition.label);

      const sourceMeta = metadataEvidence[definition.key] || {};
      const capturedAt = this.safeIsoTimestamp(
        sourceMeta.capturedAt || submission.timestamp || submission.createdAt
      );

      const offlineImageId = `${baseId}-${definition.suffix}`;
      const extension = this.imageExtension(file.type);
      const filename =
        typeof file.name === "string" && file.name.trim()
          ? file.name
          : `${definition.suffix}.${extension}`;

      items.push({
        key: definition.key,
        label: definition.label,
        file,
        filename,
        offline_image_id: offlineImageId,
        captured_at: capturedAt
      });
    }

    if (items.length === 0) {
      throw new Error("No evidence images are available for synchronization.");
    }

    if (items.length > 5) {
      throw new Error("The backend accepts a maximum of 5 images per report.");
    }

    return items;
  },

  createFormData(submission) {
    if (!submission || !submission.id) {
      throw new Error("Invalid queued submission.");
    }

    const gps = submission.gps || {};
    const latitude = Number(gps.latitude);
    const longitude = Number(gps.longitude);

    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      throw new Error("Valid GPS latitude is required before synchronization.");
    }

    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      throw new Error("Valid GPS longitude is required before synchronization.");
    }

    const images = this.buildImageItems(submission);

    const description = String(submission.description || "").trim() ||
      String(submission.damageType || "").trim() ||
      "Farmer crop evidence submission.";

    const metadata = {
      offline_report_id: String(
        submission.clientSubmissionId || submission.id
      ),
      crop: String(submission.crop || "Onion").trim(),
      crop_stage: submission.cropStage
        ? String(submission.cropStage).trim()
        : null,
      language: submission.language
        ? String(submission.language).trim()
        : "en",
      latitude,
      longitude,
      description,
      images: images.map((item) => ({
        offline_image_id: item.offline_image_id,
        captured_at: item.captured_at
      }))
    };

    const formData = new FormData();
    formData.append("metadata", JSON.stringify(metadata));

    // IMPORTANT: Role 4 expects the SAME multipart field name "images"
    // repeated once for each uploaded image.
    for (const item of images) {
      formData.append("images", item.file, item.filename);
    }

    return { formData, metadata, images };
  },

  /* --------------------------------------------------------------------------
     HTTP HELPERS
     -------------------------------------------------------------------------- */

  async parseResponse(response) {
    const text = await response.text();

    if (!text) return {};

    try {
      return JSON.parse(text);
    } catch (error) {
      return { raw: text };
    }
  },

  async sendToRealBackend(submission) {
    const token = this.getFarmerToken();

    if (!token) {
      throw new Error(
        "Farmer authentication token was not found. The farmer must be logged in before online sync."
      );
    }

    const endpoint = this.getBackendEndpoint();
    const { formData, metadata, images } = this.createFormData(submission);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData,
        signal: controller.signal
      });

      const responseData = await this.parseResponse(response);

      if (!response.ok) {
        const detail =
          responseData.detail ||
          responseData.message ||
          responseData.raw ||
          "Unknown backend error";

        throw new Error(`Sync API ${response.status}: ${detail}`);
      }

      if (!responseData.report_id || !Array.isArray(responseData.images)) {
        throw new Error("Backend sync response is missing report_id or images.");
      }

      return {
        success: true,
        mode: "backend",
        response: responseData,
        metadata,
        sentImages: images
      };
    } catch (error) {
      if (error && error.name === "AbortError") {
        throw new Error("Synchronization timed out after 60 seconds.");
      }

      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  },

  /* --------------------------------------------------------------------------
     ROLE 4 -> ROLE 2 / ROLE 6 ASSESSMENT
     -------------------------------------------------------------------------- */

  findLeafEvidence(syncResponse) {
    if (!syncResponse || !Array.isArray(syncResponse.images)) return null;

    return (
      syncResponse.images.find((item) =>
        String(item.offline_image_id || "").endsWith("-01-leaf")
      ) || syncResponse.images[0] || null
    );
  },

  async requestLeafAssessment(submission, syncResponse) {
    // Current trained classifier is onion-specific. Other crops may still sync,
    // but they must not be sent to the onion disease model.
    if (String(submission.crop || "").trim().toLowerCase() !== "onion") {
      return {
        skipped: true,
        reason: "Current Role 2 disease model supports Onion only."
      };
    }

    const leafEvidence = this.findLeafEvidence(syncResponse);

    if (!leafEvidence || !leafEvidence.evidence_id) {
      throw new Error("Leaf evidence ID was not returned by the sync API.");
    }

    const token = this.getFarmerToken();
    if (!token) throw new Error("Farmer authentication token is unavailable.");

    const response = await fetch(
      this.getAssessmentEndpoint(leafEvidence.evidence_id),
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const responseData = await this.parseResponse(response);

    if (!response.ok) {
      const detail =
        responseData.detail ||
        responseData.message ||
        responseData.raw ||
        "Unknown assessment error";

      throw new Error(`Assessment API ${response.status}: ${detail}`);
    }

    return {
      skipped: false,
      leafEvidenceId: leafEvidence.evidence_id,
      response: responseData
    };
  },

  /* --------------------------------------------------------------------------
     UPDATE EXISTING LOCAL RESULT PAGE WITH REAL SERVER RESULT
     -------------------------------------------------------------------------- */

  updateLocalDashboardReport(submission, syncResponse, assessmentResult) {
    const storageKey = "fasalrakshak_reports";

    try {
      const raw = localStorage.getItem(storageKey);
      const reports = raw ? JSON.parse(raw) : [];

      if (!Array.isArray(reports)) return;

      const index = reports.findIndex((report) => report.id === submission.id);
      if (index === -1) return;

      const report = reports[index];
      report.syncState = "synced";
      report.serverReportId = syncResponse.report_id || null;
      report.serverResponse = syncResponse;

      const leafEvidence = this.findLeafEvidence(syncResponse);
      report.leafEvidenceId = leafEvidence ? leafEvidence.evidence_id : null;

      // Replace the old mock AI value immediately. Never leave a simulated
      // prediction after a real backend sync has succeeded.
      report.ai = {
        damagePercent: "—",
        confidence: "—",
        evidenceValid: false,
        risk: "Pending",
        prediction: "Assessment pending"
      };

      if (
        assessmentResult &&
        !assessmentResult.skipped &&
        assessmentResult.response
      ) {
        const assessment = assessmentResult.response;
        const prediction = assessment.prediction || assessment.damage_type || "Uncertain";
        const confidence = Number(assessment.confidence);

        report.damageType = prediction;
        report.assessment = assessment;
        report.ai = {
          damagePercent:
            assessment.damage_percentage === null ||
            assessment.damage_percentage === undefined
              ? "—"
              : assessment.damage_percentage,
          confidence: Number.isFinite(confidence)
            ? Math.round(confidence * 100) / 100
            : "—",
          evidenceValid: Boolean(assessment.evidence_valid),
          risk: assessment.risk_level || assessment.evidence_status || "Needs Review",
          prediction,
          aiStatus: assessment.ai_status || null,
          humanVerificationRequired:
            assessment.human_verification_required !== false
        };
      }

      if (assessmentResult && assessmentResult.skipped) {
        report.assessment = assessmentResult;
      }

      reports[index] = report;
      localStorage.setItem(storageKey, JSON.stringify(reports));
    } catch (error) {
      console.warn("Could not update the local dashboard report.", error);
    }
  },

  /* --------------------------------------------------------------------------
     SEND / SYNC ONE SUBMISSION
     -------------------------------------------------------------------------- */

  async sendSubmission(submission) {
    if (!navigator.onLine) {
      throw new Error("Device is offline.");
    }

    const syncResult = await this.sendToRealBackend(submission);

    let assessmentResult = null;
    let assessmentError = null;

    try {
      assessmentResult = await this.requestLeafAssessment(
        submission,
        syncResult.response
      );
    } catch (error) {
      // The evidence is already safely stored by Role 4. Do not re-upload the
      // whole report just because the assessment stage needs attention.
      assessmentError = error.message || "Assessment failed.";
      console.error("Role 2 / Role 6 assessment failed:", error);
    }

    this.updateLocalDashboardReport(
      submission,
      syncResult.response,
      assessmentResult
    );

    return {
      ...syncResult,
      assessment: assessmentResult,
      assessmentError
    };
  },

  async syncSubmission(submission) {
    if (!submission || !submission.id) {
      throw new Error("Invalid queued submission.");
    }

    const currentAttempts = Number(submission.syncAttempts || 0);
    const nextAttempt = currentAttempts + 1;

    await FROfflineDB.updateSyncState(submission.id, "syncing", {
      syncAttempts: nextAttempt,
      lastSyncAttemptAt: new Date().toISOString(),
      lastError: null
    });

    this.emit("fr-sync-item-started", {
      id: submission.id,
      attempt: nextAttempt
    });

    try {
      const result = await this.sendSubmission(submission);
      const syncedAt = new Date().toISOString();

      await FROfflineDB.updateSyncState(submission.id, "synced", {
        syncedAt,
        transportMode: "backend",
        serverResponse: result.response,
        assessmentResponse:
          result.assessment && result.assessment.response
            ? result.assessment.response
            : null,
        assessmentError: result.assessmentError || null,
        lastError: null
      });

      this.emit("fr-sync-item-succeeded", {
        id: submission.id,
        syncedAt,
        transportMode: "backend",
        response: result.response,
        assessment: result.assessment,
        assessmentError: result.assessmentError
      });

      return {
        id: submission.id,
        success: true,
        result
      };
    } catch (error) {
      const message =
        error && error.message
          ? error.message
          : "Unknown synchronization error.";

      await FROfflineDB.updateSyncState(submission.id, "failed", {
        lastError: message,
        failedAt: new Date().toISOString()
      });

      this.emit("fr-sync-item-failed", {
        id: submission.id,
        attempt: nextAttempt,
        error: message
      });

      return {
        id: submission.id,
        success: false,
        error: message
      };
    }
  },

  /* --------------------------------------------------------------------------
     QUEUE STATUS / RECOVERY
     -------------------------------------------------------------------------- */

  async getQueueStatus() {
    if (typeof FROfflineDB === "undefined") {
      return {
        pending: 0,
        failed: 0,
        syncing: 0,
        synced: 0,
        total: 0
      };
    }

    const submissions = await FROfflineDB.getAllSubmissions();
    const status = {
      pending: 0,
      failed: 0,
      syncing: 0,
      synced: 0,
      total: submissions.length
    };

    for (const submission of submissions) {
      if (Object.prototype.hasOwnProperty.call(status, submission.syncState)) {
        status[submission.syncState] += 1;
      }
    }

    return status;
  },

  async recoverStaleSyncRecords() {
    if (typeof FROfflineDB === "undefined") return;

    const submissions = await FROfflineDB.getAllSubmissions();
    const now = Date.now();
    const staleAfterMs = 2 * 60 * 1000;

    for (const submission of submissions) {
      if (submission.syncState !== "syncing") continue;

      const attemptTime = submission.lastSyncAttemptAt
        ? new Date(submission.lastSyncAttemptAt).getTime()
        : 0;

      if (!attemptTime || now - attemptTime > staleAfterMs) {
        await FROfflineDB.updateSyncState(submission.id, "failed", {
          lastError: "Previous synchronization was interrupted."
        });
      }
    }
  },

  /* --------------------------------------------------------------------------
     SYNC ALL PENDING / FAILED ITEMS
     -------------------------------------------------------------------------- */

  async syncPendingSubmissions() {
    if (this.isSyncing) {
      return this.syncPromise || Promise.resolve([]);
    }

    if (!navigator.onLine) {
      this.emit("fr-sync-offline", {});
      return [];
    }

    if (typeof FROfflineDB === "undefined") {
      console.error("FROfflineDB is unavailable.");
      return [];
    }

    this.isSyncing = true;

    this.syncPromise = (async () => {
      this.emit("fr-sync-started", {});

      try {
        await this.recoverStaleSyncRecords();

        const pendingItems = await FROfflineDB.getPendingSubmissions();
        const retryableItems = pendingItems.filter(
          (submission) =>
            Number(submission.syncAttempts || 0) < this.maxAutomaticAttempts
        );

        if (retryableItems.length === 0) {
          this.emit("fr-sync-complete", {
            total: 0,
            succeeded: 0,
            failed: 0
          });
          return [];
        }

        const results = [];

        // Sequential upload is intentional for weaker rural connections.
        for (const submission of retryableItems) {
          if (!navigator.onLine) break;

          const result = await this.syncSubmission(submission);
          results.push(result);

          if (!result.success) {
            const attempt = Number(submission.syncAttempts || 0) + 1;
            const delay = Math.min(
              this.retryBaseDelayMs * Math.pow(2, Math.max(0, attempt - 1)),
              12000
            );
            await this.wait(delay);
          } else {
            await this.wait(250);
          }
        }

        const succeeded = results.filter((item) => item.success).length;
        const failed = results.length - succeeded;

        this.emit("fr-sync-complete", {
          total: results.length,
          succeeded,
          failed
        });

        return results;
      } catch (error) {
        console.error("Queue synchronization failed:", error);
        this.emit("fr-sync-error", {
          error: error.message || "Synchronization failed."
        });
        return [];
      } finally {
        this.isSyncing = false;
        this.syncPromise = null;
      }
    })();

    return this.syncPromise;
  },

  async retryNow() {
    if (!navigator.onLine) return [];
    return this.syncPendingSubmissions();
  },

  /* --------------------------------------------------------------------------
     INITIALIZATION
     -------------------------------------------------------------------------- */

  init() {
    window.addEventListener("online", () => {
      console.log("Network restored — checking FasalRakshak offline queue.");
      this.emit("fr-network-restored", {});
      this.syncPendingSubmissions();
    });

    window.addEventListener("offline", () => {
      console.log("FasalRakshak is offline.");
      this.emit("fr-network-lost", {});
    });

    if (navigator.onLine) {
      setTimeout(() => this.syncPendingSubmissions(), 700);
    }

    console.log(
      "Monika Role 3 sync manager initialized. Real Role 4 backend mode.",
      this.getBackendEndpoint()
    );
  }
};

FRSyncManager.init();
