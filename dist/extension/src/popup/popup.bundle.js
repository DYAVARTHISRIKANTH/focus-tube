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

  // src/popup/popup.js
  var MODE_DESCRIPTIONS = {
    [MODES.STRICT]: "Strict mode redirects Shorts URLs to the standard watch player and hides all navigation tabs, shelves, and cards.",
    [MODES.REDIRECT_ONLY]: "Redirect Only mode redirects Shorts URLs to the regular watch player without hiding shelves or navigation links.",
    [MODES.CUSTOM]: "Custom mode allows fine-grained control over which Shorts elements are hidden or redirected."
  };
  var currentSettings = null;
  var statCountEl = document.getElementById("stat-count");
  var modeDescEl = document.getElementById("mode-desc");
  var customSectionEl = document.getElementById("custom-section");
  var btnOpenOptions = document.getElementById("btn-open-options");
  var modeButtons = document.querySelectorAll(".mode-btn");
  var toggleInputs = document.querySelectorAll('.toggle-item input[type="checkbox"]');
  var masterCardEl = document.getElementById("master-card");
  var btnMasterToggle = document.getElementById("btn-master-toggle");
  var powerBtnText = document.getElementById("power-btn-text");
  var masterTitle = document.getElementById("master-title");
  var masterSubtitle = document.getElementById("master-subtitle");
  var stoppedNotice = document.getElementById("stopped-notice");
  var controlsWrapper = document.getElementById("controls-wrapper");
  var brandStatus = document.getElementById("brand-status");
  var statusText = document.getElementById("status-text");
  function updateMasterToggleUI(enabled) {
    const isEnabled = enabled !== false;
    if (masterCardEl) {
      masterCardEl.classList.toggle("is-stopped", !isEnabled);
    }
    if (btnMasterToggle) {
      btnMasterToggle.classList.toggle("btn-power-stop", isEnabled);
      btnMasterToggle.classList.toggle("btn-power-start", !isEnabled);
      btnMasterToggle.title = isEnabled ? "Click to Stop FocusTube" : "Click to Start FocusTube";
      btnMasterToggle.setAttribute("aria-label", isEnabled ? "Stop FocusTube" : "Start FocusTube");
    }
    if (powerBtnText) {
      powerBtnText.textContent = isEnabled ? "Stop" : "Start";
    }
    if (masterTitle) {
      masterTitle.textContent = isEnabled ? "Protection Active" : "FocusTube Stopped";
    }
    if (masterSubtitle) {
      masterSubtitle.textContent = isEnabled ? "Shorts blocked & redirected" : "Standard YouTube restored";
    }
    if (brandStatus) {
      brandStatus.classList.toggle("is-stopped", !isEnabled);
    }
    if (statusText) {
      statusText.textContent = isEnabled ? "Active" : "Stopped";
    }
    if (stoppedNotice) {
      stoppedNotice.classList.toggle("hidden", isEnabled);
    }
    if (controlsWrapper) {
      controlsWrapper.classList.toggle("is-stopped", !isEnabled);
    }
  }
  function updateModeUI(mode) {
    modeButtons.forEach((btn) => {
      const isTarget = btn.getAttribute("data-mode") === mode;
      btn.classList.toggle("active", isTarget);
      btn.setAttribute("aria-checked", String(isTarget));
    });
    if (modeDescEl) {
      modeDescEl.textContent = MODE_DESCRIPTIONS[mode] || "";
    }
    if (customSectionEl) {
      if (mode === MODES.CUSTOM) {
        customSectionEl.classList.remove("hidden");
      } else {
        customSectionEl.classList.add("hidden");
      }
    }
  }
  function populateToggles(settings) {
    toggleInputs.forEach((input) => {
      const key = input.getAttribute("data-key");
      if (key && typeof settings[key] === "boolean") {
        input.checked = settings[key];
      }
    });
  }
  async function persistSettings(updatedSettings) {
    currentSettings = { ...currentSettings, ...updatedSettings };
    try {
      const response = await chrome.runtime.sendMessage({
        action: MESSAGE_ACTIONS.SAVE_SETTINGS,
        data: currentSettings
      });
      if (response?.settings) {
        currentSettings = response.settings;
        populateToggles(currentSettings);
      }
    } catch (error) {
      console.warn("[FocusTube Popup] Failed to save settings:", error);
    }
  }
  function attachEventListeners() {
    if (btnMasterToggle) {
      btnMasterToggle.addEventListener("click", () => {
        const currentEnabled = currentSettings?.enabled !== false;
        const nextEnabled = !currentEnabled;
        updateMasterToggleUI(nextEnabled);
        persistSettings({ enabled: nextEnabled });
      });
    }
    modeButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const selectedMode = btn.getAttribute("data-mode");
        if (!selectedMode || selectedMode === currentSettings?.mode) return;
        updateModeUI(selectedMode);
        persistSettings({ mode: selectedMode });
      });
    });
    toggleInputs.forEach((input) => {
      input.addEventListener("change", () => {
        const key = input.getAttribute("data-key");
        if (!key) return;
        persistSettings({ [key]: input.checked });
      });
    });
    if (btnOpenOptions) {
      btnOpenOptions.addEventListener("click", () => {
        if (chrome.runtime?.openOptionsPage) {
          chrome.runtime.openOptionsPage();
        } else {
          window.open(chrome.runtime.getURL("src/options/options.html"));
        }
      });
    }
  }
  async function initPopup() {
    attachEventListeners();
    try {
      const settingsResponse = await chrome.runtime.sendMessage({ action: MESSAGE_ACTIONS.GET_SETTINGS });
      if (settingsResponse?.settings) {
        currentSettings = settingsResponse.settings;
        updateMasterToggleUI(currentSettings.enabled);
        updateModeUI(currentSettings.mode);
        populateToggles(currentSettings);
      }
      const statsResponse = await chrome.runtime.sendMessage({ action: MESSAGE_ACTIONS.GET_STATS });
      if (statsResponse?.stats && statCountEl) {
        const count = statsResponse.stats.redirectedCount || 0;
        statCountEl.textContent = count > 9999 ? `${Math.floor(count / 1e3)}k` : String(count);
      }
    } catch (error) {
      console.warn("[FocusTube Popup] Initialization error:", error);
    }
  }
  document.addEventListener("DOMContentLoaded", initPopup);
})();
