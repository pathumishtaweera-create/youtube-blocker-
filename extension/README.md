# YouTube Recommendation Blocker

A lightweight, privacy-first Google Chrome extension (Manifest V3) that removes distraction feeds on YouTube without interfering with search, playback, comments, descriptions, subscriptions, channels, playlists, live chat, ads, Shorts, or end-screen recommendations.

## What It Blocks

1. **YouTube Homepage (`/`)**: Hides the recommended video grid/feed (`ytd-rich-grid-renderer`).
2. **YouTube Watch Page (`/watch`)**: Hides suggested videos in the right-hand sidebar (`#related` / `ytd-watch-next-secondary-results-renderer`).

## Privacy & Permissions

- Uses only the `storage` permission (`chrome.storage.local`) and runs exclusively on `https://www.youtube.com/*`.
- No user accounts, no backend servers, no analytics, no tracking, and no external network requests.
- Settings remain strictly on your device.

## Project Files

- `manifest.json` — Chrome Extension Manifest V3 configuration
- `popup.html` — Extension popup markup
- `popup.css` — Extension popup styles
- `popup.js` — Popup toggle logic and `chrome.storage.local` persistence
- `content.js` — YouTube SPA route detection, storage listener, and scoped `MutationObserver`
- `content.css` — Scoped CSS rules for hiding and restoring recommendations
- `icons/` — Extension icons (`16x16`, `32x32`, `48x48`, `128x128` PNGs)
- `README.md` — Installation, testing, and selector documentation

## How to Install in Google Chrome (Windows)

1. Extract the downloaded ZIP file (or locate the `extension` folder) on your computer so that `manifest.json` is directly inside the extracted folder.
2. Open Google Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** using the toggle in the top-right corner.
4. Click **Load unpacked**.
5. Select the folder containing `manifest.json`.
6. Pin **YouTube Recommendation Blocker** from the Chrome Extensions toolbar icon if desired.

## How to Test

1. **Popup state**: Click the extension icon. Verify the title (`YouTube Recommendation Blocker`), `Block recommendations` toggle, `ON` / `OFF` status indicator, and privacy message (`Your settings stay on your device.`).
2. **Homepage blocking**: Open `https://www.youtube.com/` with blocking `ON`. The homepage recommendation grid should be hidden while the top search bar and left navigation menu stay visible.
3. **Watch page sidebar blocking**: Open any video (`https://www.youtube.com/watch?v=...`). Verify the right-hand suggested videos list is hidden while the video player, controls, description, comments, playlists, and live chat work normally.
4. **Instant toggle OFF / ON**: Click the extension popup toggle to `OFF`. Both the homepage feed and watch sidebar suggestions should reappear immediately without refreshing. Flip back to `ON` to hide them again.
5. **SPA navigation**: Click from Home → Search → Watch → Subscriptions → Channel → Home without reloading the browser tab. Verify blocking only applies on `/` and `/watch`.
6. **Persistence**: Set the toggle to `OFF` (or `ON`), completely close Chrome, reopen Chrome, and verify the popup toggle and YouTube behavior remember your saved setting.
7. **Preserved areas**: Confirm Search (`/results`), Subscriptions (`/feed/subscriptions`), Channel pages, Shorts (`/shorts/...`), and video end-screens continue working normally.

## YouTube DOM Selectors & Verification Notes

YouTube is a Polymer/Web Components single-page application whose internal DOM can evolve over time. This extension avoids brittle generated class names and relies on structural custom elements and IDs scoped strictly to `html[data-yrb-blocked="true"]` and `data-yrb-page`:

- **Homepage feed**:
  - Primary: `ytd-browse[page-subtype="home"] ytd-rich-grid-renderer`
  - Fallback: `ytd-browse[page-subtype="home"] #primary > ytd-section-list-renderer`
  - *Verification note*: If YouTube changes the `page-subtype="home"` attribute or replaces `ytd-rich-grid-renderer`, inspect `ytd-browse` on `https://www.youtube.com/` in DevTools to confirm the homepage container tag.
- **Watch page right sidebar**:
  - Primary: `ytd-watch-flexy #related` and `ytd-watch-flexy ytd-watch-next-secondary-results-renderer`
  - Defensive (for newer watch grid experiments): `ytd-watch-grid #related` and `ytd-watch-grid ytd-watch-next-secondary-results-renderer`
  - *Verification note*: Deliberately targets `#related` instead of `#secondary` so Playlists (`#playlist`) and Live Chat (`ytd-live-chat-frame`) in the right sidebar remain functional. If YouTube renames `#related` or `ytd-watch-next-secondary-results-renderer`, inspect `<ytd-watch-flexy>` in DevTools to verify the suggested-videos container ID/tag.
