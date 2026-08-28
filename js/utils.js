/* ==========================================================================
   utils.js
   --------
   Small reusable helper functions shared by both the Farmer pages and the
   Officer pages. Keeping these in one place means we write the "status
   badge" or "date format" logic once instead of copy-pasting it everywhere.
   ========================================================================== */

/** Maps a status string to the CSS class + label used for the stamp badge. */
function statusBadgeHTML(status) {
  const map = {
    "Pending":       { cls: "stamp-pending",  label: "Pending" },
    "Under Review":  { cls: "stamp-review",   label: "Under Review" },
    "Verified":      { cls: "stamp-verified", label: "Verified" },
    "Rejected":      { cls: "stamp-rejected", label: "Rejected" }
  };
  const info = map[status] || map["Pending"];
  return `<span class="stamp ${info.cls}">${info.label}</span>`;
}

/** Formats an ISO timestamp like "14 Aug 2026, 9:20 AM" for easy reading. */
function formatDateTime(isoString) {
  const d = new Date(isoString);
  return d.toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true
  });
}

/**
 * We don't store real uploaded photos in this prototype (no backend to
 * hold them), so this generates a simple colored placeholder "photo"
 * using an inline SVG. Each report has an imageColor so it still looks
 * distinct in the list. In the real app this is replaced by an <img>
 * pointing to the actual uploaded/stored photo URL.
 */
function placeholderPhotoSVG(color, label) {
  return `
    <svg viewBox="0 0 400 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${label} field photo">
      <rect width="400" height="240" fill="${color}"/>
      <path d="M0 180 Q100 140 200 175 T400 160 V240 H0 Z" fill="rgba(0,0,0,0.15)"/>
      <text x="20" y="30" font-family="Inter, sans-serif" font-size="14" fill="rgba(255,255,255,0.85)">${label}</text>
    </svg>`;
}

/** Reads the browser's online/offline state and updates the sync bar UI. */
function initSyncBar(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;

  function render() {
    if (navigator.onLine) {
      el.innerHTML = `<span class="dot dot-online"></span> Online — reports sync automatically`;
    } else {
      el.innerHTML = `<span class="dot dot-offline"></span> Offline — reports save locally and sync later`;
    }
  }

  render();
  window.addEventListener("online", render);
  window.addEventListener("offline", render);
}

/** Simple query-string reader, e.g. getQueryParam("id") on report-detail.html?id=FR-1001 */
function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}
