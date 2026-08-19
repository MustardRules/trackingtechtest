/* =============================================================================
 * consent-reader.js — GROUND-TRUTH consent reader (single source of truth)
 * -----------------------------------------------------------------------------
 * WHY THIS EXISTS:
 *   The old approach wrapped dataLayer.push to capture gtag('consent','update').
 *   BUG: when GTM loads it REPLACES dataLayer.push with its own function, so
 *   OneTrust's later consent update bypasses our wrapper and we never see it —
 *   the page showed "denied" while GA actually sent "granted" (gcs=G101).
 *
 * THE FIX:
 *   Read consent from Google's OWN internal store: window.google_tag_data.ics
 *   This is the exact source the `gcs` parameter on /g/collect is derived from,
 *   so what this reader reports === what GA actually enforced. We ALSO parse the
 *   real `gcs` value from the outgoing network request as an independent
 *   cross-check. Two independent sources that must agree = trustworthy lab.
 * ========================================================================== */
(function (global) {
  "use strict";

  var KEYS = [
    "ad_storage", "analytics_storage", "ad_user_data", "ad_personalization",
    "functionality_storage", "personalization_storage", "security_storage"
  ];

  // Normalise every shape Google has used for a consent value -> 'granted'/'denied'
  function norm(v) {
    if (v === "granted" || v === true  || v === 1 || v === "1") return "granted";
    if (v === "denied"  || v === false || v === 0 || v === 2 || v === "2") return "denied";
    return undefined;
  }

  /* ---- PRIMARY: read Google's internal consent store ---------------------- */
  function readConsent() {
    var out = {};
    var ics = global.google_tag_data && global.google_tag_data.ics;
    if (!ics) return out; // GA/Consent Mode not initialised yet

    // 1) Preferred: the per-key entries map. Resolution precedence mirrors
    //    gtag itself: update > implicit > declare > default.
    if (ics.entries) {
      KEYS.forEach(function (k) {
        var e = ics.entries[k];
        if (!e) return;
        var v = norm(e.update);
        if (v === undefined) v = norm(e.implicit);
        if (v === undefined) v = norm(e.declare);
        if (v === undefined) v = norm(e.default);
        out[k] = v;
      });
    }
    // 2) Fallback: the resolved numeric getter (1=granted, 2=denied).
    if (typeof ics.getConsentState === "function") {
      KEYS.forEach(function (k) {
        if (out[k] === undefined) {
          try { out[k] = norm(ics.getConsentState(k)); } catch (e) {}
        }
      });
    }
    return out;
  }

  /* ---- CROSS-CHECK: parse the real gcs from the last /collect hit ---------- */
  // gcs format: 'G' + status + ad_storage + analytics_storage  (e.g. G101)
  function decodeGcs(gcs) {
    if (!gcs || gcs.length < 4 || gcs[0] !== "G") return null;
    return {
      ad_storage:        gcs[2] === "1" ? "granted" : "denied",
      analytics_storage: gcs[3] === "1" ? "granted" : "denied"
    };
  }
  function latestGcs() {
    try {
      var hits = performance.getEntriesByType("resource").filter(function (e) {
        return e.name.indexOf("/g/collect") !== -1;
      });
      if (!hits.length) return null;
      var m = hits[hits.length - 1].name.match(/[?&]gcs=([^&]+)/);
      return m ? m[1] : null;
    } catch (e) { return null; }
  }

  /* ---- OneTrust helpers (display/context only) ---------------------------- */
  function activeGroups() { return global.OnetrustActiveGroups || "(none yet)"; }

  /* ---- Change detection for a timeline ----------------------------------- */
  // Poll-based (reliable, unlike push-wrapping). Fires cb(state) on any change.
  function onConsentChange(cb, intervalMs) {
    var last = JSON.stringify(readConsent());
    return setInterval(function () {
      var now = JSON.stringify(readConsent());
      if (now !== last) { last = now; cb(readConsent()); }
    }, intervalMs || 500);
  }

  global.LabConsent = {
    KEYS: KEYS,
    read: readConsent,          // -> {ad_storage:'denied', analytics_storage:'granted', ...}
    latestGcs: latestGcs,       // -> 'G101' | null
    decodeGcs: decodeGcs,       // -> {ad_storage, analytics_storage} | null
    activeGroups: activeGroups, // -> 'C0001,C0002,...'
    onChange: onConsentChange
  };
})(window);
