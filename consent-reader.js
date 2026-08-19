/* =============================================================================
 * consent-reader.js — GROUND-TRUTH consent reader (single source of truth)
 * -----------------------------------------------------------------------------
 * Reads consent from Google's own store: window.google_tag_data.ics — the exact
 * source the `gcs` parameter on /g/collect is derived from. Also parses the real
 * `gcs` from the outgoing hit as an independent cross-check.
 *
 * CRITICAL FIELD SEMANTICS (this is where a subtle bug lived):
 *   ics.entries[key] = {
 *     default : <boolean>   // the DEFAULT consent value (true=granted,false=denied)
 *     update  : <boolean>   // the UPDATED consent value after gtag('consent','update')
 *     implicit: <boolean>   // FLAG: was the value set implicitly? NOT a consent value
 *     quiet   : <boolean>   // FLAG: internal. NOT a consent value
 *   }
 *   => ONLY `update` and `default` are consent VALUES. `implicit`/`quiet` are
 *      metadata flags and MUST be ignored. Precedence: update > default.
 * ========================================================================== */
(function (global) {
  "use strict";

  var KEYS = [
    "ad_storage", "analytics_storage", "ad_user_data", "ad_personalization",
    "functionality_storage", "personalization_storage", "security_storage"
  ];

  // Normalise a consent VALUE -> 'granted' / 'denied'. (booleans or strings)
  function norm(v) {
    if (v === "granted" || v === true  || v === 1 || v === "1") return "granted";
    if (v === "denied"  || v === false || v === 0 || v === "0") return "denied";
    return undefined;
  }

  /* ---- PRIMARY: read Google's internal consent store --------------------- */
  function readConsent() {
    var out = {};
    var ics = global.google_tag_data && global.google_tag_data.ics;
    if (!ics) return out; // Consent Mode not initialised yet

    if (ics.entries) {
      KEYS.forEach(function (k) {
        var e = ics.entries[k];
        if (!e) return;
        // ONLY these two fields are consent values. Ignore implicit/quiet.
        var v = norm(e.update);            // updated value wins if present
        if (v === undefined) v = norm(e.default);
        out[k] = v;
      });
    }
    // Fallback: resolved numeric getter (1=granted, 2=denied), if entries absent.
    if (typeof ics.getConsentState === "function") {
      KEYS.forEach(function (k) {
        if (out[k] === undefined) {
          try {
            var s = ics.getConsentState(k);
            out[k] = (s === 1) ? "granted" : (s === 2) ? "denied" : undefined;
          } catch (e) {}
        }
      });
    }
    return out;
  }

  /* ---- CROSS-CHECK: parse the real gcs from the last /collect hit --------- */
  // gcs = 'G' + status + ad_storage + analytics_storage  (e.g. G101)
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

  function activeGroups() { return global.OnetrustActiveGroups || "(none yet)"; }

  // Poll-based change detection (reliable; GTM replaces dataLayer.push).
  function onConsentChange(cb, intervalMs) {
    var last = JSON.stringify(readConsent());
    return setInterval(function () {
      var now = JSON.stringify(readConsent());
      if (now !== last) { last = now; cb(readConsent()); }
    }, intervalMs || 500);
  }

  global.LabConsent = {
    KEYS: KEYS,
    read: readConsent,
    latestGcs: latestGcs,
    decodeGcs: decodeGcs,
    activeGroups: activeGroups,
    onChange: onConsentChange
  };
})(window);
