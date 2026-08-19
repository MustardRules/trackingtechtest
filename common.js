/* =============================================================================
 * common.js  —  Shared READ-ONLY helpers used by debug.html and reset.html.
 * -----------------------------------------------------------------------------
 * These functions only INSPECT the current browser / consent state. They do
 * not change anything (except the clearly-named lab* action helpers used by
 * reset.html at the bottom).
 * ========================================================================== */

/* ---- Cookies ------------------------------------------------------------- */
// Return all readable (non-HttpOnly) cookies as [{name, value}]
function labGetCookies() {
  if (!document.cookie) return [];
  return document.cookie.split(";").map(function (c) {
    var i = c.indexOf("=");
    return {
      name:  decodeURIComponent(c.slice(0, i).trim()),
      value: decodeURIComponent(c.slice(i + 1).trim())
    };
  });
}

/* ---- Storage ------------------------------------------------------------- */
function labGetStorage(store) {
  var out = [];
  try {
    for (var i = 0; i < store.length; i++) {
      var key = store.key(i);
      out.push({ name: key, value: store.getItem(key) });
    }
  } catch (e) { /* storage may be blocked */ }
  return out;
}

/* ---- OneTrust ------------------------------------------------------------ */
// The comma-separated list of active groups, e.g. "C0001,C0003"
function labGetActiveGroups() {
  return window.OnetrustActiveGroups || "(none yet)";
}
// Raw OneTrust consent cookie (has the per-group 0/1 flags)
function labGetOptanonConsent() {
  var c = labGetCookies().filter(function (x) { return x.name === "OptanonConsent"; });
  return c.length ? c[0].value : "(not set)";
}

/* ---- Google Consent Mode -------------------------------------------------
 * The MOST RELIABLE picture for a lab is to replay what we captured in
 * __lab.consentLog: start from the 'default', then apply each 'update' in
 * order. That is exactly what Google's Consent Mode does internally.        */
var LAB_CONSENT_KEYS = [
  "ad_storage", "ad_user_data", "ad_personalization",
  "analytics_storage", "functionality_storage",
  "personalization_storage", "security_storage"
];

function labComputeConsentState() {
  var state = {};
  var log = (window.__lab && window.__lab.consentLog) || [];
  log.forEach(function (entry) {
    if ((entry.source === "default" || entry.source === "update") &&
        entry.payload && typeof entry.payload === "object") {
      LAB_CONSENT_KEYS.forEach(function (key) {
        if (key in entry.payload) state[key] = entry.payload[key];
      });
    }
  });
  return state;
}

// Best-effort read of Google's internal store (undocumented, may change).
function labReadGoogleTagData() {
  try {
    var ics = window.google_tag_data && window.google_tag_data.ics;
    if (!ics || !ics.entries) return null;
    var out = {};
    Object.keys(ics.entries).forEach(function (k) {
      var e = ics.entries[k];
      out[k] = (e.update !== undefined ? e.update
             : e.default !== undefined ? e.default : "?");
    });
    return out;
  } catch (e) { return null; }
}

/* ---- dataLayer ----------------------------------------------------------- */
function labGetDataLayer() {
  return (window.dataLayer || []).map(function (item) {
    // arguments objects (from gtag) are not plain arrays — normalise them
    if (item && typeof item === "object" && item.length !== undefined &&
        !(item instanceof Array)) {
      return Array.prototype.slice.call(item);
    }
    return item;
  });
}

/* =============================================================================
 * ACTION helpers (used ONLY by reset.html). Named lab* so intent is obvious.
 * ========================================================================== */

// Delete every readable cookie on this host (and common parent-domain paths).
function labClearCookies() {
  var host = location.hostname;
  // build candidate domains: exact host + ".host" + parent domain
  var domains = [host, "." + host];
  var parts = host.split(".");
  if (parts.length > 2) domains.push("." + parts.slice(-2).join("."));
  labGetCookies().forEach(function (c) {
    domains.forEach(function (d) {
      document.cookie = c.name + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=" + d;
    });
    // also try without an explicit domain
    document.cookie = c.name + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
  });
}

function labClearStorage() {
  try { localStorage.clear(); }   catch (e) {}
  try { sessionStorage.clear(); } catch (e) {}
}

// OneTrust convenience wrappers (guarded so they never throw if OT missing).
function labReopenBanner()  { if (window.OneTrust) OneTrust.ToggleInfoDisplay(); }
function labAcceptAll()     { if (window.OneTrust) OneTrust.AllowAll(); }
function labRejectAll()     { if (window.OneTrust) OneTrust.RejectAll(); }
