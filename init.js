/* =============================================================================
 * init.js  —  Head initialiser. Runs on EVERY page, AFTER config.js.
 * -----------------------------------------------------------------------------
 * !!! ORDER IS CRITICAL !!!  Load this file synchronously in <head>, right
 * after config.js and BEFORE any visible content. The whole point of a
 * consent-mode lab is that the DEFAULT (denied) state is set BEFORE any tag
 * has a chance to fire.
 *
 * Responsibilities, in order:
 *   1. Create dataLayer + gtag()
 *   2. Set Google Consent Mode v2 DEFAULTS = denied
 *   3. Instrument dataLayer so the debug dashboard can SEE every consent update
 *   4. Define OptanonWrapper() so we capture OneTrust group changes
 *   5. Inject the OneTrust SDK (it will UPDATE consent when the user chooses)
 *   6. Inject Google Tag Manager
 * ========================================================================== */
(function () {
  "use strict";

  var cfg = window.LAB_CONFIG || {};

  /* ---- 0. Tiny in-memory log so the debug page can show what happened ----- */
  window.__lab = window.__lab || { consentLog: [], events: [] };
  function logConsent(source, payload) {
    window.__lab.consentLog.push({
      time: new Date().toISOString(),
      source: source,     // "default" | "update" | "OptanonWrapper"
      payload: payload
    });
  }
  window.__labLogConsent = logConsent;

  /* ---- 1. dataLayer + gtag shim ------------------------------------------ */
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;

  /* ---- 2. Consent Mode v2 DEFAULT (everything denied except security) ----
   * This MUST run before GTM / GA / any pixel loads. OneTrust will later send
   * a gtag('consent','update', ...) reflecting the user's real choice.       */
  var defaultConsent = {
    ad_storage:             "denied",
    ad_user_data:           "denied",
    ad_personalization:     "denied",
    analytics_storage:      "denied",
    functionality_storage:  "denied",
    personalization_storage:"denied",
    security_storage:       "granted"   // security is always allowed
  };
  var defaultArgs = {};
  for (var k in defaultConsent) { defaultArgs[k] = defaultConsent[k]; }
  defaultArgs.wait_for_update = cfg.CONSENT_WAIT_FOR_UPDATE || 500;

  gtag("consent", "default", defaultArgs);
  gtag("set", "ads_data_redaction", true); // redact ad data while denied
  gtag("set", "url_passthrough", true);    // keep click IDs in URL while denied
  logConsent("default", defaultConsent);

  /* ---- 3. Wrap dataLayer.push so we can OBSERVE every consent 'update' ---- */
  var _push = window.dataLayer.push;
  window.dataLayer.push = function () {
    try {
      var a = arguments[0];
      // Consent Mode calls look like: gtag('consent','update',{...})
      // which land in dataLayer as an arguments object [ 'consent','update',{} ]
      if (a && (a[0] === "consent") && (a[1] === "update")) {
        logConsent("update", a[2]);
      }
    } catch (e) { /* never break the page for logging */ }
    return _push.apply(window.dataLayer, arguments);
  };

  /* ---- 4. OneTrust callback -----------------------------------------------
   * OneTrust calls window.OptanonWrapper() once after it loads AND again every
   * time the user saves a consent choice. We use it to:
   *   - log the currently active groups (e.g. "C0001,C0002,C0003")
   *   - push a dataLayer event so GTM triggers can react to OneTrust directly */
  window.OptanonWrapper = function () {
    try {
      var groups = window.OnetrustActiveGroups || "";
      logConsent("OptanonWrapper", groups);
      window.dataLayer.push({
        event: "OneTrustGroupsUpdated",
        OnetrustActiveGroups: groups
      });
    } catch (e) { /* ignore */ }
  };

  /* ---- 5. Inject the OneTrust SDK ---------------------------------------- */
  if (cfg.OT_DOMAIN_SCRIPT && cfg.OT_DOMAIN_SCRIPT.indexOf("00000000") !== 0) {
    // 5a. Optional auto-blocking script (blocks untagged scripts pre-consent)
    if (cfg.USE_OT_AUTOBLOCK) {
      var ab = document.createElement("script");
      ab.src = "https://cdn.cookielaw.org/consent/" +
               cfg.OT_DOMAIN_SCRIPT + "/OtAutoBlock.js";
      document.head.appendChild(ab);
    }
    // 5b. The main OneTrust stub (renders the banner + preference centre)
    var ot = document.createElement("script");
    ot.src = "https://cdn.cookielaw.org/scripttemplates/otSDKStub.js";
    ot.type = "text/javascript";
    ot.charset = "UTF-8";
    ot.setAttribute("data-domain-script", cfg.OT_DOMAIN_SCRIPT);
    document.head.appendChild(ot);
  } else {
    console.warn("[lab] OT_DOMAIN_SCRIPT not set in config.js — banner will not load.");
  }

  /* ---- 6. Inject Google Tag Manager -------------------------------------- */
  if (cfg.GTM_ID && cfg.GTM_ID.indexOf("GTM-") === 0 &&
      cfg.GTM_ID !== "GTM-XXXXXXX") {
    (function (w, d, s, l, i) {
      w[l] = w[l] || [];
      w[l].push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
      var f = d.getElementsByTagName(s)[0],
          j = d.createElement(s),
          dl = (l !== "dataLayer") ? "&l=" + l : "";
      j.async = true;
      j.src = "https://www.googletagmanager.com/gtm.js?id=" + i + dl;
      f.parentNode.insertBefore(j, f);
    })(window, document, "script", "dataLayer", cfg.GTM_ID);
  } else {
    console.warn("[lab] GTM_ID not set in config.js — GTM will not load.");
  }
})();
