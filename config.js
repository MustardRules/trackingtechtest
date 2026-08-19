/* =============================================================================
 * config.js  —  SINGLE SOURCE OF TRUTH for all test IDs
 * -----------------------------------------------------------------------------
 * This file is loaded FIRST (synchronously) on EVERY page, before init.js.
 * Replace the placeholder values below with your OWN *TEST* IDs.
 *
 * WHERE TO FIND EACH ID:
 *   OT_DOMAIN_SCRIPT : OneTrust > Cookie Compliance > Scripts > (your TEST site)
 *                      It is the value of the "data-domain-script" attribute.
 *                      A TEST/staging script usually ends with "-test".
 *   GTM_ID           : Google Tag Manager > Admin > "GTM-XXXXXXX"
 *   GA4_ID           : GA4 > Admin > Data Streams > "G-XXXXXXXXXX"
 *                      (Only used if you fire GA4 directly. Normally GTM does it.)
 *   META / LINKEDIN / CLARITY : optional, only for tag-lab.html
 * ========================================================================== */
window.LAB_CONFIG = {

  // --- REQUIRED -------------------------------------------------------------
  OT_DOMAIN_SCRIPT: "01a01ab2-26bc-7061-8c44-e58f9f993707-test", // <-- CHANGE ME
  GTM_ID:           "GTM-WQ99GFDZ",                                // <-- CHANGE ME

  // --- OPTIONAL -------------------------------------------------------------
  GA4_ID:              "G-71WZDQB18Y", // only if you fire GA4 outside of GTM
  META_PIXEL_ID:       "",             // e.g. "1234567890123456"
  LINKEDIN_PARTNER_ID: "",             // e.g. "1234567"
  CLARITY_ID:          "",             // e.g. "abcdefghij"

  // --- BEHAVIOUR ------------------------------------------------------------
  // Load OneTrust auto-blocking script (recommended so untagged scripts are
  // blocked until consent). Set to false if you tag everything manually.
  USE_OT_AUTOBLOCK: false,

  // Consent Mode: how long (ms) Google waits for OneTrust to send an update
  // before firing with the default (denied) state.
  CONSENT_WAIT_FOR_UPDATE: 500
};
