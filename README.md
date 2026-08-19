# trackingtechtest
Lab for testing tracking tech on a website with OT banner and GA/GTM


# OneTrust / Consent Mode v2 Test Lab

A minimal static site to validate end-to-end: **OneTrust banner → Google Consent Mode v2 → GTM → GA4** (plus optional Meta / LinkedIn / Clarity).

## Files
| File | Purpose |
|------|---------|
| `config.js` | **Edit this.** All your test IDs in one place. |
| `init.js` | Head initialiser: sets Consent Mode defaults, then injects OneTrust + GTM. Ordering is critical — do not add `async`/`defer`. |
| `common.js` | Read-only inspection helpers + reset actions. |
| `styles.css` | Cosmetic only. |
| `index.html` | Main page — normal site behaviour + live snapshot. |
| `debug.html` | Dashboard — Consent Mode, OneTrust groups, cookies, storage, dataLayer, event timeline. |
| `events.html` | Event generator — pushes named `dataLayer` events. |
| `tag-lab.html` | Non-Google tags (Meta / LinkedIn / Clarity), gated on OneTrust groups. |
| `reset.html` | Clean-room controls — clear cookies/storage, reopen banner. |

## Setup (≈15 min)
1. **Edit `config.js`** — set `OT_DOMAIN_SCRIPT` (your *test* script) and `GTM_ID`. Add optional pixel IDs if needed.
2. **Publish to GitHub Pages**
   ```bash
   git init && git add . && git commit -m "onetrust lab"
   git branch -M main
   git remote add origin https://github.com/<you>/onetrust-lab.git
   git push -u origin main
   ```
   Then: repo → **Settings → Pages → Deploy from branch → main → /(root)**.
   Your URL: `https://<you>.github.io/onetrust-lab/`
3. **Add that URL as a test domain** in OneTrust, GTM, and GA4.
4. Open the site, use the banner, watch `debug.html`.

## What to verify
- Before any choice: all Consent Mode signals `denied` (except `security_storage`).
- **Accept All** → `analytics_storage`, `ad_storage`, `ad_user_data`, `ad_personalization` flip to `granted`.
- **Reject All** → signals stay `denied`; GA4 sends a **cookieless ping** (see `g/collect` with `gcs=G100` in DevTools → Network) and sets **no** analytics cookies.
- `OptanonConsent` cookie is written after a choice.
- Non-Google tags on `tag-lab.html` stay **blocked** until their OneTrust group is active.

## Verification tools
- Chrome DevTools → Application (cookies/storage) + Network (`collect`, `gcs=` param).
- GA4 **DebugView**.
- **Tag Assistant** (tagassistant.google.com).

## Caveats
- `google_tag_data.ics` (raw Consent Mode store on debug page) is **undocumented** and may be empty depending on Google's build — the *computed* table is the reliable one for this lab.
- Some OneTrust cookies (`.cookielaw.org`, HttpOnly) can only be deleted from DevTools, not by `reset.html`.
- The `gcs` signal appears on GA hits only after GTM/GA actually fire.
