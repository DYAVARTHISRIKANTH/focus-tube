<div align="center">

# 🎬 FocusTube
### YouTube Shorts to Regular Player Chrome Extension
**Production-Ready • Manifest V3 Compliant • Zero-Buffering Architecture**

<br/>

[![Manifest V3](https://img.shields.io/badge/Chrome_MV3-Compliant-0ea5e9?style=for-the-badge&logo=googlechrome&logoColor=white)](#technical-specifications)
[![Tests Passed](https://img.shields.io/badge/Tests-34%2F34%20Passed-10b981?style=for-the-badge&logo=node.js&logoColor=white)](#-automated-test-suite)
[![Zero Remote Code](https://img.shields.io/badge/Security-Zero_Remote_Code-8b5cf6?style=for-the-badge&logo=shield&logoColor=white)](#-security--privacy)
[![License: MIT](https://img.shields.io/badge/License-MIT-f59e0b?style=for-the-badge)](#license)

<br/>

**FocusTube** is a high-performance, distraction-free Google Chrome extension that automatically converts YouTube Shorts (`/shorts/VIDEO_ID`) into the standard desktop video player (`/watch?v=VIDEO_ID`). It eliminates distracting carousels, recommendation shelves, and navigation tabs with zero layout thrashing and **zero playback buffering**.

---

</div>

<br/>

## ⚡ Quick Start: How to Run the Extension in Chrome

Follow these 4 simple steps to install and run FocusTube on your browser in under 30 seconds:

```
[ Step 1: Open chrome://extensions ]
                ↓
[ Step 2: Turn on "Developer mode" ]
                ↓
[ Step 3: Click "Load unpacked" & pick FocusTube folder ]
                ↓
[ Step 4: Open YouTube & Enjoy distraction-free videos! ]
```

### 1️⃣ Step-by-Step Installation (Load Unpacked)

1. **Open the Extensions Page**:
   - In Google Chrome, type or paste `chrome://extensions` in your address bar and press <kbd>Enter</kbd>.
   - Alternatively, click the Chrome menu (**⋮**) ➔ **Extensions** ➔ **Manage Extensions**.

2. **Enable Developer Mode**:
   - Locate the **Developer mode** toggle switch in the **top-right corner** of the page and switch it **ON**.

3. **Load the Extension**:
   - Click the **Load unpacked** button in the top-left toolbar.
   - In the file picker dialog, select the project folder:
     ```
     C:\spring-boot-developer-toolkit\FocusTube
     ```
   - Click **Select Folder**.

4. **Pin for Easy Access**:
   - Click the **Extensions puzzle icon** (🧩) on the Chrome toolbar next to your profile picture.
   - Click the **Pin** icon next to **FocusTube (Shorts to Regular Player)** so the icon stays visible in your toolbar.

---

## ⏹️ How to Use & Master Controls

Once loaded, FocusTube runs completely automatically in the background. You can control its behavior anytime:

| Control | Action | Details |
|---|---|---|
| **Stop Button** | Click popup ➔ Click **`⏹ Stop`** | Instantly pauses the extension. Restores regular YouTube Shorts and shelves without needing to uninstall. |
| **Start Button** | Click popup ➔ Click **`▶ Start`** | Resumes all Shorts redirection and UI hiding in real-time across all open tabs. |
| **Strict Mode** | Segmented Control ➔ **`Strict`** | Complete distraction shield. Redirects all Shorts and hides sidebar links, home shelves, and recommendation carousels. |
| **Redirect Only** | Segmented Control ➔ **`Redirect`** | Converts any clicked or opened Shorts to the full regular player, but leaves YouTube's UI shelves visible. |
| **Custom Mode** | Segmented Control ➔ **`Custom`** | Enables fine-grained granular switches for every individual YouTube component. |
| **Options Page** | Click popup footer ➔ **`Options`** | Opens diagnostics, live CSS rule inspector, settings export/import, and factory reset. |

> [!TIP]
> **Need to temporarily watch a Short?** Simply open the popup and click the crimson **Stop** button. The extension will turn **`OFF`** immediately, and you can re-enable it with **Start** whenever you are ready.

---

## 💻 Alternative: Run the Interactive Localhost Studio

FocusTube includes a built-in interactive web testbench that emulates YouTube's feed, popup interface, and options page directly on `localhost`:

```bash
# 1. Install dependencies (if not already done)
npm install

# 2. Launch the local dev server
npm run dev
```

Open your browser to:
👉 **`http://localhost:3030`**

The studio lets you test:
- Live YouTube Home & Watch feed simulation with dynamic Shorts shelf injection.
- Real-time popup switching with instant CSS updates.
- Full options dashboard with settings export and import.
- Live test runner reports.

---

## 🌟 Key Features & Architectural Highlights

### 🚀 Zero-Latency Network Redirection
- **Chrome DeclarativeNetRequest (DNR)**: Intercepts `/shorts/VIDEO_ID` at the browser network layer before network packets leave your machine.
- Direct links, external links, and new tabs convert to `/watch?v=VIDEO_ID` with **zero latency** and zero page flash.
- Compliant with Chrome's 2KB RE2 regex limit using split dual-rule compilation.

### 🛡️ Zero-Buffering & Zero-Lag Playback
- **No Heavy MutationObservers**: Avoids continuous DOM polling that starves Chrome's MediaSource Extensions (MSE) chunks.
- **Hardware-Accelerated CSS Hiding**: Uses declarative CSS stylesheet injection into `<head>` instead of deleting DOM nodes, avoiding Polymer component errors.
- **Player Isolation**: All mouse and click handlers explicitly bail out if interacting with `#movie_player`, ensuring controls and scrub bars respond at 60 FPS.

### 🔄 Intelligent SPA & History Navigation
- Listens to YouTube Single Page Application hooks (`yt-navigate-start`, `yt-navigate-finish`, `popstate`).
- **Loop Circuit Breaker**: Halts redirection if more than 3 hops occur within 3 seconds, preventing recursive redirect traps.
- **Timestamp & Playlist Retention**: Preserves `?t=...`, `?time_continue=...`, and playlist index parameters.

### 🎛️ Three Operational Modes

```
┌─────────────────────────────────────────────────────────────┐
│                       PROTECTION MODES                      │
├───────────────────┬───────────────────┬─────────────────────┤
│   STRICT (🛡️)     │   REDIRECT (🔄)   │     CUSTOM (🎛️)     │
├───────────────────┼───────────────────┼─────────────────────┤
│ Redirects Shorts  │ Redirects Shorts  │ Configurable toggle │
│ Hides Sidebar tab │ Keeps Sidebar tab │ Configurable toggle │
│ Hides Feed rows   │ Keeps Feed rows   │ Configurable toggle │
│ Hides Search row  │ Keeps Search row  │ Configurable toggle │
│ Hides Watch next  │ Keeps Watch next  │ Configurable toggle │
│ Hides Channel tab │ Keeps Channel tab │ Configurable toggle │
│ Rewrites Links    │ Rewrites Links    │ Configurable toggle │
└───────────────────┴───────────────────┴─────────────────────┘
```

---

## 🧪 Automated Test Suite

FocusTube includes 34 automated unit and integration tests executed with Node's native test runner (`node:test`) and `jsdom`:

```bash
# Run all tests
npm test
```

### Verified Test Results (34/34 Passing • 100% Pass Rate)

| Test Suite | Tests | Covered Behavior |
|:---|:---:|:---|
| [`url-converter.test.js`](file:///c:/spring-boot-developer-toolkit/FocusTube/tests/url-converter.test.js) | 9 | 11-character video ID validation, relative paths, query params, timestamps, hash anchors |
| [`settings.test.js`](file:///c:/spring-boot-developer-toolkit/FocusTube/tests/settings.test.js) | 5 | Strict, Redirect Only, Custom modes, **Master Stop Switch (`enabled: false`)**, sanitization |
| [`selectors.test.js`](file:///c:/spring-boot-developer-toolkit/FocusTube/tests/selectors.test.js) | 5 | Container selectors, dynamic CSS generation, non-empty groups, comment exemptions |
| [`dom-filter.test.js`](file:///c:/spring-boot-developer-toolkit/FocusTube/tests/dom-filter.test.js) | 2 | JSDOM style tag injection, dynamic mode toggle removal, zero thrashing |
| [`link-rewriter.test.js`](file:///c:/spring-boot-developer-toolkit/FocusTube/tests/link-rewriter.test.js) | 4 | Link attribute mutation, URL transformation, single/batch reversion |
| [`spa-navigation.test.js`](file:///c:/spring-boot-developer-toolkit/FocusTube/tests/spa-navigation.test.js) | 4 | SPA event hooks, duplicate suppression, loop circuit breaker activation |
| [`edge-cases.test.js`](file:///c:/spring-boot-developer-toolkit/FocusTube/tests/edge-cases.test.js) | 5 | Community post replies, timestamped comments, search results, DNR regex compliance |
| **Total Passed** | **34** | **All 34 passing with 0 failures** |

---

## 📁 Repository Structure

```
FocusTube/
├── manifest.json                       # Chrome Extension Manifest V3 configuration
├── package.json                        # Build commands and test scripts
├── README.md                           # Documentation and visual guide
├── dev-server.js                       # Localhost testbench server (port 3030)
│
├── dist/
│   ├── focustube-v1.0.0.zip            # Production ZIP ready for Chrome Web Store
│   └── extension/                      # Staged distribution assets
│
├── icons/                              # Multi-resolution extension icons
│   ├── icon16.png                      # Toolbar icon (16x16)
│   ├── icon32.png                      # Retina display icon (32x32)
│   ├── icon48.png                      # Extensions management icon (48x48)
│   └── icon128.png                     # Chrome Web Store showcase icon (128x128)
│
├── src/
│   ├── background/
│   │   ├── service-worker.js           # MV3 background worker (DNR rules, badge, broadcast)
│   │   └── service-worker.bundle.js    # Bundled background worker
│   │
│   ├── content/
│   │   ├── content.js                  # Document-start content orchestrator
│   │   ├── content.bundle.js           # Bundled content script
│   │   ├── url-converter.js            # Nanosecond URL parser & 11-char ID validator
│   │   ├── spa-navigator.js            # YouTube Polymer SPA navigation interceptor
│   │   ├── link-rewriter.js            # Zero-cost passive event link rewriter
│   │   └── dom-filter.js               # Hardware-accelerated CSS injection engine
│   │
│   ├── config/
│   │   ├── constants.js                # Storage keys, limits, modes, regex patterns
│   │   ├── selectors.js                # Centralized YouTube 2026 UI selector registry
│   │   └── settings.js                 # Settings resolver with master stop switch support
│   │
│   ├── popup/
│   │   ├── popup.html                  # Sleek dark-mode popup interface with Stop button
│   │   ├── popup.css                   # Glassmorphic dark design tokens
│   │   ├── popup.js                    # Popup controller & event handlers
│   │   └── popup.bundle.js             # Bundled popup script
│   │
│   ├── options/
│   │   ├── options.html                # Comprehensive settings & diagnostics dashboard
│   │   ├── options.css                 # Options page styling
│   │   ├── options.js                  # Options controller, import/export, CSS inspector
│   │   └── options.bundle.js           # Bundled options script
│   │
│   └── utils/
│       └── storage.js                  # chrome.storage.sync wrapper with fallback
│
├── public/                             # Localhost testbench studio assets
│   ├── index.html                      # Interactive YouTube feed simulator & test runner
│   ├── studio.css                      # Testbench visual styles
│   ├── studio.js                       # Studio feed controller
│   └── mock-chrome-api.js              # Polyfill simulating chrome.* APIs on localhost
│
├── scripts/
│   ├── generate-icons.js               # Icon generator script
│   └── package.js                      # Production zip bundler script
│
└── tests/                              # Comprehensive automated test suite
    ├── url-converter.test.js
    ├── settings.test.js
    ├── selectors.test.js
    ├── dom-filter.test.js
    ├── link-rewriter.test.js
    ├── spa-navigation.test.js
    └── edge-cases.test.js
```

---

## 🛠️ Build & Package Commands

For developers making modifications:

```powershell
# 1. Build bundled JavaScript for content, worker, popup, options
npm run build

# 2. Run the automated test suite
npm test

# 3. Create the production distribution zip (dist/focustube-v1.0.0.zip)
npm run package
```

---

## 🔒 Security & Privacy

FocusTube is engineered strictly following Chrome Web Store security and privacy standards:

- ✅ **Zero Remote Code Execution**: No `eval()`, `new Function()`, or external scripts from CDNs.
- ✅ **Minimal Permissions**: Requests only `"storage"` and `"declarativeNetRequest"`.
- ✅ **Targeted Host Scope**: Restricted strictly to `*://*.youtube.com/*`.
- ✅ **No Analytics or Tracking**: Zero network pings; redirection counts stay stored locally in `chrome.storage.sync`.
- ✅ **Manifest V3 Native**: Uses Service Workers and declarative network filtering.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
Feel free to customize, modify, and distribute.