(() => {
  // src/config/constants.js
  var MODES = {
    STRICT: "strict",
    REDIRECT_ONLY: "redirect_only",
    CUSTOM: "custom"
  };
  var MESSAGE_ACTIONS = {
    GET_SETTINGS: "GET_SETTINGS",
    SAVE_SETTINGS: "SAVE_SETTINGS",
    RESET_SETTINGS: "RESET_SETTINGS",
    GET_STATS: "GET_STATS",
    INCREMENT_REDIRECT_COUNT: "INCREMENT_REDIRECT_COUNT",
    SETTINGS_UPDATED: "SETTINGS_UPDATED",
    LOG_EVENT: "LOG_EVENT"
  };

  // src/config/selectors.js
  var SELECTORS = {
    // Navigation sidebar Shorts entry points
    sidebar: [
      'ytd-guide-entry-renderer:has(a[href^="/shorts"])',
      'ytd-guide-entry-renderer a[href^="/shorts"]',
      'ytd-mini-guide-entry-renderer:has(a[href^="/shorts"])',
      'ytd-mini-guide-entry-renderer a[href^="/shorts"]',
      'yt-guide-entry-view-model:has(a[href^="/shorts"])',
      'ytm-pivot-bar-item-renderer:has(a[href^="/shorts"])'
    ],
    // Home & Subscriptions feed Shorts shelves/sections
    feedShelves: [
      // Direct Home Feed Shorts section (Screenshot 1)
      'ytd-rich-section-renderer:has(a[href^="/shorts/"])',
      "ytd-rich-shelf-renderer",
      "ytd-reel-shelf-renderer",
      'yt-horizontal-list-renderer:has(a[href^="/shorts/"])',
      "ytm-reel-shelf-renderer"
    ],
    // Search results Shorts shelves
    searchShorts: [
      "ytd-search ytd-reel-shelf-renderer",
      "ytd-search-sub-menu-renderer ~ ytd-reel-shelf-renderer"
    ],
    // Watch page "Watch Next" / sidebar recommendations (Screenshot 2)
    // Direct tag matching only - zero descendant `:has()` checks to eliminate buffering
    watchNextShorts: [
      "#related ytd-reel-shelf-renderer",
      "#secondary ytd-reel-shelf-renderer",
      "ytd-reel-shelf-renderer"
    ],
    // Channel pages "Shorts" tab
    channelShortsTab: [
      'yt-tab-shape[tab-title="Shorts"]',
      'tp-yt-paper-tab:has(a[href^="/shorts"])',
      'ytd-channel-sub-menu-renderer tp-yt-paper-tab:has([href^="/shorts"])'
    ],
    // Link selectors for on-demand link-rewriter to target
    shortsLinks: [
      'a[href^="/shorts/"]'
    ],
    // Elements that must NEVER be hidden or filtered (safety guards)
    exemptions: [
      "#movie_player",
      "#player",
      ".html5-video-player",
      "#comments",
      "ytd-comments",
      "ytd-comment-thread-renderer",
      "ytd-comment-view-model",
      "ytd-post-renderer",
      "ytd-backstage-post-renderer",
      "ytd-playlist-video-renderer"
    ]
  };
  function generateHidingCSS(effectiveSettings) {
    const activeSelectors = [];
    if (effectiveSettings.hideSidebarShorts) {
      activeSelectors.push(...SELECTORS.sidebar);
    }
    if (effectiveSettings.hideFeedShelves) {
      activeSelectors.push(...SELECTORS.feedShelves);
    }
    if (effectiveSettings.hideSearchShorts) {
      activeSelectors.push(...SELECTORS.searchShorts);
    }
    if (effectiveSettings.hideWatchNextShorts) {
      activeSelectors.push(...SELECTORS.watchNextShorts);
    }
    if (effectiveSettings.hideChannelShortsTab) {
      activeSelectors.push(...SELECTORS.channelShortsTab);
    }
    if (activeSelectors.length === 0) {
      return "/* FocusTube: Hiding disabled */";
    }
    const uniqueSelectors = Array.from(new Set(activeSelectors));
    return `/* FocusTube Zero-Overhead Hiding Rules */
${uniqueSelectors.join(",\n")} {
  display: none !important;
  visibility: hidden !important;
  height: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
}
`;
  }

  // src/config/settings.js
  var DEFAULT_SETTINGS = {
    enabled: true,
    mode: MODES.STRICT,
    redirectShorts: true,
    hideSidebarShorts: true,
    hideFeedShelves: true,
    hideSearchShorts: true,
    hideWatchNextShorts: true,
    hideChannelShortsTab: true,
    preserveTimestamp: true,
    rewriteLinks: true,
    debugLogging: false
  };
  function resolveEffectiveSettings(rawSettings) {
    const merged = { ...DEFAULT_SETTINGS, ...rawSettings || {} };
    if (merged.enabled === false) {
      return {
        ...merged,
        enabled: false,
        redirectShorts: false,
        hideSidebarShorts: false,
        hideFeedShelves: false,
        hideSearchShorts: false,
        hideWatchNextShorts: false,
        hideChannelShortsTab: false,
        rewriteLinks: false
      };
    }
    switch (merged.mode) {
      case MODES.STRICT:
        return {
          ...merged,
          enabled: true,
          redirectShorts: true,
          hideSidebarShorts: true,
          hideFeedShelves: true,
          hideSearchShorts: true,
          hideWatchNextShorts: true,
          hideChannelShortsTab: true,
          preserveTimestamp: true,
          rewriteLinks: true
        };
      case MODES.REDIRECT_ONLY:
        return {
          ...merged,
          enabled: true,
          redirectShorts: true,
          hideSidebarShorts: false,
          hideFeedShelves: false,
          hideSearchShorts: false,
          hideWatchNextShorts: false,
          hideChannelShortsTab: false,
          preserveTimestamp: Boolean(merged.preserveTimestamp),
          rewriteLinks: Boolean(merged.rewriteLinks)
        };
      case MODES.CUSTOM:
        return {
          ...merged,
          enabled: true,
          redirectShorts: Boolean(merged.redirectShorts),
          hideSidebarShorts: Boolean(merged.hideSidebarShorts),
          hideFeedShelves: Boolean(merged.hideFeedShelves),
          hideSearchShorts: Boolean(merged.hideSearchShorts),
          hideWatchNextShorts: Boolean(merged.hideWatchNextShorts),
          hideChannelShortsTab: Boolean(merged.hideChannelShortsTab),
          preserveTimestamp: Boolean(merged.preserveTimestamp),
          rewriteLinks: Boolean(merged.rewriteLinks)
        };
      default:
        return resolveEffectiveSettings({ ...merged, mode: MODES.STRICT });
    }
  }

  // src/options/options.js
  var currentSettings = null;
  var currentEffectiveSettings = null;
  var modeCards = document.querySelectorAll(".mode-card");
  var settingInputs = document.querySelectorAll('.setting-card input[type="checkbox"]');
  var cssPreviewEl = document.getElementById("css-preview");
  var btnCopyCss = document.getElementById("btn-copy-css");
  var btnExportSettings = document.getElementById("btn-export-settings");
  var fileImportSettings = document.getElementById("file-import-settings");
  var btnResetDefaults = document.getElementById("btn-reset-defaults");
  var statsTotalRedirects = document.getElementById("stats-total-redirects");
  var statsLastTime = document.getElementById("stats-last-time");
  var statsDnrStatus = document.getElementById("stats-dnr-status");
  var navItems = document.querySelectorAll(".nav-item");
  var masterBannerEl = document.getElementById("opt-master-banner");
  var btnOptMasterToggle = document.getElementById("btn-opt-master-toggle");
  var optPowerText = document.getElementById("opt-power-text");
  var optStatusLabel = document.getElementById("opt-status-label");
  var optMasterTitle = document.getElementById("opt-master-title");
  var optMasterDesc = document.getElementById("opt-master-desc");
  function updateMasterToggleUI(enabled) {
    const isEnabled = enabled !== false;
    if (masterBannerEl) {
      masterBannerEl.classList.toggle("is-stopped", !isEnabled);
    }
    if (btnOptMasterToggle) {
      btnOptMasterToggle.classList.toggle("btn-stop", isEnabled);
      btnOptMasterToggle.classList.toggle("btn-start", !isEnabled);
      btnOptMasterToggle.title = isEnabled ? "Click to Stop FocusTube" : "Click to Start FocusTube";
    }
    if (optPowerText) {
      optPowerText.textContent = isEnabled ? "Stop FocusTube" : "Start FocusTube";
    }
    if (optStatusLabel) {
      optStatusLabel.textContent = isEnabled ? "Extension Running" : "Extension Stopped";
    }
    if (optMasterTitle) {
      optMasterTitle.textContent = isEnabled ? "Shorts Protection is Active" : "FocusTube is Stopped";
    }
    if (optMasterDesc) {
      optMasterDesc.textContent = isEnabled ? "FocusTube is actively redirecting Shorts URLs and removing distraction shelves from YouTube." : "Extension is paused. Standard YouTube behavior is currently restored across all tabs.";
    }
  }
  function updateModeUI(mode) {
    modeCards.forEach((card) => {
      const cardMode = card.getAttribute("data-mode");
      const isActive = cardMode === mode;
      card.classList.toggle("active", isActive);
      const statusEl = card.querySelector(".mode-card-status");
      if (statusEl) {
        statusEl.textContent = isActive ? "Active" : "Select";
      }
    });
  }
  function populateToggles(rawSettings, effectiveSettings) {
    const isCustom = rawSettings.mode === MODES.CUSTOM;
    settingInputs.forEach((input) => {
      const key = input.getAttribute("data-key");
      if (key && typeof effectiveSettings[key] === "boolean") {
        input.checked = isCustom ? Boolean(rawSettings[key]) : effectiveSettings[key];
        input.disabled = !isCustom;
        input.closest(".setting-card").style.opacity = isCustom ? "1" : "0.65";
      }
    });
  }
  function updateCssPreview(effectiveSettings) {
    if (cssPreviewEl) {
      cssPreviewEl.textContent = generateHidingCSS(effectiveSettings);
    }
  }
  async function persistSettings(delta) {
    currentSettings = { ...currentSettings, ...delta };
    try {
      const response = await chrome.runtime.sendMessage({
        action: MESSAGE_ACTIONS.SAVE_SETTINGS,
        data: currentSettings
      });
      if (response?.settings) {
        currentSettings = response.settings;
        currentEffectiveSettings = response.effectiveSettings;
        updateModeUI(currentSettings.mode);
        updateMasterToggleUI(currentSettings.enabled);
        populateToggles(currentSettings, currentEffectiveSettings);
        updateCssPreview(currentEffectiveSettings);
        updateDnrStatus(currentEffectiveSettings.redirectShorts);
      }
    } catch (error) {
      console.warn("[FocusTube Options] Failed to save settings:", error);
    }
  }
  function updateDnrStatus(isRedirectActive) {
    if (statsDnrStatus) {
      statsDnrStatus.textContent = isRedirectActive ? "Active" : "Disabled";
      statsDnrStatus.className = isRedirectActive ? "stat-value text-accent" : "stat-value";
    }
  }
  function formatTime(timestamp) {
    if (!timestamp) return "Never";
    const date = new Date(timestamp);
    return date.toLocaleDateString(void 0, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }
  function attachEventListeners() {
    if (btnOptMasterToggle) {
      btnOptMasterToggle.addEventListener("click", () => {
        const currentEnabled = currentSettings?.enabled !== false;
        const nextEnabled = !currentEnabled;
        updateMasterToggleUI(nextEnabled);
        persistSettings({ enabled: nextEnabled });
      });
    }
    modeCards.forEach((card) => {
      card.addEventListener("click", () => {
        const mode = card.getAttribute("data-mode");
        if (mode && mode !== currentSettings?.mode) {
          persistSettings({ mode });
        }
      });
    });
    settingInputs.forEach((input) => {
      input.addEventListener("change", () => {
        if (currentSettings?.mode !== MODES.CUSTOM) return;
        const key = input.getAttribute("data-key");
        if (key) {
          persistSettings({ [key]: input.checked });
        }
      });
    });
    if (btnCopyCss) {
      btnCopyCss.addEventListener("click", async () => {
        if (cssPreviewEl?.textContent) {
          await navigator.clipboard.writeText(cssPreviewEl.textContent);
          const originalText = btnCopyCss.querySelector("span").textContent;
          btnCopyCss.querySelector("span").textContent = "Copied!";
          setTimeout(() => {
            btnCopyCss.querySelector("span").textContent = originalText;
          }, 1800);
        }
      });
    }
    if (btnExportSettings) {
      btnExportSettings.addEventListener("click", () => {
        const blob = new Blob([JSON.stringify(currentSettings, null, 2)], {
          type: "application/json"
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `focustube-settings-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      });
    }
    if (fileImportSettings) {
      fileImportSettings.addEventListener("change", (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const parsed = JSON.parse(e.target.result);
            await persistSettings(parsed);
            alert("Settings successfully imported!");
          } catch {
            alert("Failed to parse settings file. Please verify it is a valid FocusTube JSON configuration.");
          }
        };
        reader.readAsText(file);
      });
    }
    if (btnResetDefaults) {
      btnResetDefaults.addEventListener("click", async () => {
        if (confirm("Are you sure you want to reset all FocusTube settings to factory defaults?")) {
          const response = await chrome.runtime.sendMessage({ action: MESSAGE_ACTIONS.RESET_SETTINGS });
          if (response?.settings) {
            currentSettings = response.settings;
            currentEffectiveSettings = response.effectiveSettings;
            updateModeUI(currentSettings.mode);
            updateMasterToggleUI(currentSettings.enabled);
            populateToggles(currentSettings, currentEffectiveSettings);
            updateCssPreview(currentEffectiveSettings);
            updateDnrStatus(currentEffectiveSettings.redirectShorts);
          }
        }
      });
    }
    navItems.forEach((item) => {
      item.addEventListener("click", (e) => {
        e.preventDefault();
        const targetId = item.getAttribute("data-target");
        const targetEl = document.getElementById(targetId);
        if (targetEl) {
          navItems.forEach((n) => n.classList.remove("active"));
          item.classList.add("active");
          targetEl.scrollIntoView({ behavior: "smooth" });
        }
      });
    });
  }
  async function initOptions() {
    attachEventListeners();
    try {
      const settingsResponse = await chrome.runtime.sendMessage({ action: MESSAGE_ACTIONS.GET_SETTINGS });
      if (settingsResponse?.settings) {
        currentSettings = settingsResponse.settings;
        currentEffectiveSettings = settingsResponse.effectiveSettings || resolveEffectiveSettings(currentSettings);
        updateModeUI(currentSettings.mode);
        updateMasterToggleUI(currentSettings.enabled);
        populateToggles(currentSettings, currentEffectiveSettings);
        updateCssPreview(currentEffectiveSettings);
        updateDnrStatus(currentEffectiveSettings.redirectShorts);
      }
      const statsResponse = await chrome.runtime.sendMessage({ action: MESSAGE_ACTIONS.GET_STATS });
      if (statsResponse?.stats) {
        const stats = statsResponse.stats;
        if (statsTotalRedirects) {
          statsTotalRedirects.textContent = String(stats.redirectedCount || 0);
        }
        if (statsLastTime) {
          statsLastTime.textContent = formatTime(stats.lastRedirectAt);
        }
      }
    } catch (error) {
      console.warn("[FocusTube Options] Initialization error:", error);
    }
  }
  document.addEventListener("DOMContentLoaded", initOptions);
})();
