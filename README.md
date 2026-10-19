# FocusTube - YouTube Shorts to Regular Player (Chrome MV3)

[![Manifest V3 Compliant](https://img.shields.io/badge/Manifest-V3-success.svg)](#technical-specifications)
[![Test Suite](https://img.shields.io/badge/Tests-33%20Passed-brightgreen.svg)](#test-results)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**FocusTube** is a high-performance, production-ready Google Chrome extension built on **Manifest V3** that automatically redirects YouTube Shorts (`/shorts/VIDEO_ID`) to the standard desktop video player (`/watch?v=VIDEO_ID`) and provides granular controls to hide Shorts navigation links, feed carousels, and recommendation cards.

---

## 🌟 Key Features

1. **Zero-Latency Network Redirection**:
   - Leverages `chrome.declarativeNetRequest` (DNR) to intercept direct URLs, external links, and new tabs before the browser issues network requests.
   - Synchronous fallback check at `run_at: document_start` stops Shorts playback immediately without page flash.
2. **Seamless SPA Navigation Interception**:
   - Intercepts YouTube Polymer Single Page Application events (`yt-navigate-start`, `popstate`, `hashchange`, and history hooks).
   - Preserves timestamps (`?t=...`, `?time_continue=...`) and playlist context (`?list=...&index=...`).
3. **Three Distinct Operational Modes**:
   - 🛡️ **Strict Blocking**: Full distraction-free experience. Redirects Shorts and completely hides sidebar links, feed shelves, search cards, and recommendation carousels.
   - 🔄 **Redirect Only**: Redirects `/shorts/` to `/watch?v=` while leaving YouTube's native UI elements and shelves untouched.
   - 🎛️ **Custom**: Granular per-feature toggles for every component.
4. **Non-Thrashing Dynamic DOM Filtering**:
   - Injects pure CSS rules (`display: none !important;`) rather than deleting DOM nodes, preventing YouTube Polymer framework rendering errors.
   - Zero layout thrashing, zero observer loops.
5. **Debounced Link Rewriting**:
   - Automatically updates `a[href*="/shorts/"]` elements to `/watch?v=...` on hover and dynamic feed scroll.
   - Ensures middle-clicks, Ctrl-clicks, and right-click "Copy Link Address" target the regular desktop player.
6. **Modern Dark-Mode UI**:
   - Glassmorphic popup with segmented mode controls and real-time redirect counter.
   - Full options page with diagnostics, live CSS rule inspector, settings import/export, and factory reset.

---

## 📁 Project Structure

```
FocusTube/
├── manifest.json                     # Chrome Extension Manifest V3 configuration
├── package.json                      # Build scripts and test dependencies
├── README.md                         # Documentation & submission guide
├── dist/                             # Packaged zip ready for Chrome Web Store
│   └── focustube-v1.0.0.zip
├── icons/                            # Extension icons (16, 32, 48, 128 px)
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
├── src/
│   ├── background/
│   │   ├── service-worker.js         # Service worker source (DNR sync, storage, badge)
│   │   └── service-worker.bundle.js  # Bundled production service worker
│   ├── content/
│   │   ├── content.js                # Content script orchestrator
│   │   ├── content.bundle.js         # Bundled production content script (IIFE)
│   │   ├── url-converter.js          # URL parser and 11-char video ID validator
│   │   ├── dom-filter.js             # High-performance CSS injection engine
│   │   ├── link-rewriter.js          # Safe MutationObserver link transformer
│   │   └── spa-navigator.js          # YouTube SPA & history event manager
│   ├── config/
│   │   ├── constants.js              # Global constants, regexes, limits, storage keys
│   │   ├── selectors.js              # Centralized YouTube component selector registry
│   │   └── settings.js               # Settings schema and mode resolution engine
│   ├── popup/
│   │   ├── popup.html                # Modern popup HTML interface
│   │   ├── popup.css                 # Glassmorphic dark styling
│   │   ├── popup.js                  # Popup controller logic
│   │   └── popup.bundle.js           # Production bundled popup script
│   ├── options/
│   │   ├── options.html              # Settings and diagnostics dashboard
│   │   ├── options.css               # Options styling
│   │   ├── options.js                # Options controller logic
│   │   └── options.bundle.js         # Production bundled options script
│   └── utils/
│       └── storage.js                # Resilient chrome.storage.sync wrapper
├── scripts/
│   ├── generate-icons.js             # High-resolution PNG icon generator
│   └── package.js                    # Web Store distribution packager
└── tests/
    ├── url-converter.test.js         # Video ID validation, parsing, timestamps
    ├── settings.test.js              # Mode resolution and sanitization
    ├── selectors.test.js             # Selector coverage and CSS generation
    ├── dom-filter.test.js            # JSDOM dynamic style injection
    ├── link-rewriter.test.js         # JSDOM link rewriting and mutation batching
    ├── spa-navigation.test.js        # History & SPA redirect circuit-breakers
    └── edge-cases.test.js            # Posts, comments, search, and new tabs
```

---

## 🛠️ Installation & Development

### Method 1: Interactive Localhost Studio & Testbench
Preview and interactively test the extension UI, options, and simulated YouTube feed right in your browser:
```bash
# Start the local studio server
npm run dev
# Open in your browser: http://localhost:3030
```

### Method 2: Load Unpacked Extension (in Chrome)
1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** using the toggle switch in the top-right corner.
3. Click **Load unpacked**.
4. Select the `FocusTube` project folder.
5. The FocusTube icon will appear in your Chrome toolbar. Pin it for quick access!

### Method 3: Build & Package from Source
Ensure **Node.js (v18+)** and **npm** are installed:
```bash
# Install dependencies
npm install

# Run the full build (bundles scripts and generates icons)
npm run build

# Package production zip for Chrome Web Store upload
npm run package
```
The output zip file will be located at `dist/focustube-v1.0.0.zip`.

---

## 🧪 Test Results

The test suite runs using Node's native test runner (`node:test`) and `jsdom` for simulated browser DOM testing.

To run tests:
```bash
npm test
```

### Verified Test Results (33 Passed / 0 Failed)

| Suite | Tests | Description |
|---|---|---|
| `url-converter.test.js` | 9 | 11-char ID regex, absolute/relative paths, query params, timestamps, invalid URLs |
| `settings.test.js` | 4 | Strict, Redirect Only, and Custom mode resolution; input sanitization |
| `selectors.test.js` | 5 | Selector coverage, CSS generation, exemption safety (comments/posts) |
| `dom-filter.test.js` | 2 | JSDOM style injection, dynamic mode updates, style tag removal |
| `link-rewriter.test.js` | 4 | Link transformation, attribute preservation (`data-focustube-processed`), revert |
| `spa-navigation.test.js` | 4 | Redirection flow, circuit-breaker on excessive loops, duplicate suppression |
| `edge-cases.test.js` | 5 | Post replies, comments with timestamps, search results, DNR regex, popstate |
| **Total** | **33** | **100% Pass Rate** |

---

## ⚙️ Centralized Selectors & Maintenance

YouTube frequently updates its class names and internal web component tags. To accommodate this, all selectors are isolated inside [`src/config/selectors.js`](src/config/selectors.js):

```javascript
export const SELECTORS = {
  sidebar: [
    'ytd-guide-entry-renderer:has(a[href^="/shorts"])',
    'ytd-mini-guide-entry-renderer:has(a[href^="/shorts"])'
  ],
  feedShelves: [
    'ytd-rich-shelf-renderer[is-shorts]',
    'ytd-rich-section-renderer:has(ytd-rich-shelf-renderer[is-shorts])',
    'ytd-reel-shelf-renderer:not(ytd-search ytd-reel-shelf-renderer)'
  ],
  searchShorts: [
    'ytd-search ytd-reel-shelf-renderer',
    'ytd-search ytd-video-renderer:has(a[href^="/shorts/"])'
  ],
  watchNextShorts: [
    'ytd-watch-next-secondary-results-renderer ytd-reel-shelf-renderer',
    'ytd-compact-video-renderer:has(a[href^="/shorts/"])'
  ],
  channelShortsTab: [
    'yt-tab-shape[tab-title="Shorts"]',
    'tp-yt-paper-tab:has(a[href*="/shorts"])'
  ]
};
```
Whenever YouTube updates its layout, modify this single file and run `npm run build`.

---

## 🌐 Hosting & Deployment Options

You have two things you can host:

### Option A: Host & Distribute the Chrome Extension
1. **Chrome Web Store (Official Store)**:
   - Run `npm run package` to generate the production zip: [`dist/focustube-v1.0.0.zip`](dist/focustube-v1.0.0.zip).
   - Go to [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole).
   - Click **New Item**, upload `dist/focustube-v1.0.0.zip`, and publish.
2. **GitHub Releases (Self-Hosting)**:
   - Create a GitHub Release tag (e.g. `v1.0.0`) and attach `dist/focustube-v1.0.0.zip`.
   - Users download the zip, extract it, and load it via `chrome://extensions/` -> **Load unpacked**.

### Option B: Host the Interactive Web Studio / Demo Online
1. **Vercel (Instant Deploy)**:
   - Run: `npx vercel`
   - Configured via [`vercel.json`](vercel.json).
2. **GitHub Pages (Free)**:
   - Push code to GitHub; the automated workflow [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) will build and deploy the demo to your `github.io` page automatically.
3. **Docker / Cloud VPS**:
   - Run: `docker build -t focustube-studio . && docker run -p 3030:3030 focustube-studio`
   - Configured via [`Dockerfile`](Dockerfile).

---

## 🚀 Chrome Web Store Submission Guide

FocusTube is engineered strictly following Chrome Web Store developer policies:
- **No Remote Code Execution**: All JavaScript is bundled locally; no `eval()`, external scripts, or CDNs.
- **Minimal Permissions**: Uses only `"storage"` and `"declarativeNetRequest"`.
- **Targeted Host Permissions**: Limited strictly to `*://*.youtube.com/*`.
- **Manifest V3 Compliant**: Uses standard service worker background and declarative network interception.

### Submission Steps:
1. Run `npm run package` to generate `dist/focustube-v1.0.0.zip`.
2. Go to the [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole).
3. Click **New Item** and upload `dist/focustube-v1.0.0.zip`.
4. In the **Privacy** tab:
   - DeclarativeNetRequest justification: *"Used to redirect YouTube Shorts URLs to the standard watch player before page load."*
   - Storage justification: *"Used to store user preferences and redirect statistics locally."*
5. Fill in descriptions, screenshots (1280x800 px), and submit for review.

---

## 🔍 Verification & Remaining Manual Browser Tests

While unit and regression tests comprehensively verify URL conversion, loop prevention, and DOM manipulation, the following manual checks should be conducted in a live browser session:
- **Direct Address Bar Entry**: Enter `https://www.youtube.com/shorts/dQw4w9WgXcQ` directly in Chrome's address bar to verify instant DeclarativeNetRequest redirection.
- **Middle-Click / New Tab**: Middle-click a Shorts thumbnail on YouTube Home to confirm the new tab opens `/watch?v=...`.
- **Browser History**: Click browser **Back** after redirection to confirm it does not bounce back in an infinite loop.
- **Live YouTube Comment Interaction**: Post and view timestamp comments (e.g. `1:20`) to verify they play smoothly in the regular player.
#   f o c u s - t u b e  
 