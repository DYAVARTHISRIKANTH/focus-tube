/**
 * FocusTube - Options Page Controller
 */

import { MODES, MESSAGE_ACTIONS } from '../config/constants.js';
import { generateHidingCSS } from '../config/selectors.js';
import { resolveEffectiveSettings } from '../config/settings.js';

let currentSettings = null;
let currentEffectiveSettings = null;

// DOM Elements
const modeCards = document.querySelectorAll('.mode-card');
const settingInputs = document.querySelectorAll('.setting-card input[type="checkbox"]');
const cssPreviewEl = document.getElementById('css-preview');
const btnCopyCss = document.getElementById('btn-copy-css');
const btnExportSettings = document.getElementById('btn-export-settings');
const fileImportSettings = document.getElementById('file-import-settings');
const btnResetDefaults = document.getElementById('btn-reset-defaults');
const statsTotalRedirects = document.getElementById('stats-total-redirects');
const statsLastTime = document.getElementById('stats-last-time');
const statsDnrStatus = document.getElementById('stats-dnr-status');
const navItems = document.querySelectorAll('.nav-item');

// Master Banner Elements
const masterBannerEl = document.getElementById('opt-master-banner');
const btnOptMasterToggle = document.getElementById('btn-opt-master-toggle');
const optPowerText = document.getElementById('opt-power-text');
const optStatusLabel = document.getElementById('opt-status-label');
const optMasterTitle = document.getElementById('opt-master-title');
const optMasterDesc = document.getElementById('opt-master-desc');

/**
 * Updates UI to reflect master enable/stop state
 * @param {boolean} enabled
 */
function updateMasterToggleUI(enabled) {
  const isEnabled = enabled !== false;

  if (masterBannerEl) {
    masterBannerEl.classList.toggle('is-stopped', !isEnabled);
  }

  if (btnOptMasterToggle) {
    btnOptMasterToggle.classList.toggle('btn-stop', isEnabled);
    btnOptMasterToggle.classList.toggle('btn-start', !isEnabled);
    btnOptMasterToggle.title = isEnabled ? 'Click to Stop FocusTube' : 'Click to Start FocusTube';
  }

  if (optPowerText) {
    optPowerText.textContent = isEnabled ? 'Stop FocusTube' : 'Start FocusTube';
  }

  if (optStatusLabel) {
    optStatusLabel.textContent = isEnabled ? 'Extension Running' : 'Extension Stopped';
  }

  if (optMasterTitle) {
    optMasterTitle.textContent = isEnabled ? 'Shorts Protection is Active' : 'FocusTube is Stopped';
  }

  if (optMasterDesc) {
    optMasterDesc.textContent = isEnabled
      ? 'FocusTube is actively redirecting Shorts URLs and removing distraction shelves from YouTube.'
      : 'Extension is paused. Standard YouTube behavior is currently restored across all tabs.';
  }
}

/**
 * Updates UI to reflect current mode
 * @param {string} mode
 */
function updateModeUI(mode) {
  modeCards.forEach((card) => {
    const cardMode = card.getAttribute('data-mode');
    const isActive = cardMode === mode;
    card.classList.toggle('active', isActive);

    const statusEl = card.querySelector('.mode-card-status');
    if (statusEl) {
      statusEl.textContent = isActive ? 'Active' : 'Select';
    }
  });
}

/**
 * Populates checkboxes and disables them if not in custom mode
 * @param {Object} rawSettings
 * @param {Object} effectiveSettings
 */
function populateToggles(rawSettings, effectiveSettings) {
  const isCustom = rawSettings.mode === MODES.CUSTOM;

  settingInputs.forEach((input) => {
    const key = input.getAttribute('data-key');
    if (key && typeof effectiveSettings[key] === 'boolean') {
      input.checked = isCustom ? Boolean(rawSettings[key]) : effectiveSettings[key];
      input.disabled = !isCustom;
      input.closest('.setting-card').style.opacity = isCustom ? '1' : '0.65';
    }
  });
}

/**
 * Updates the live CSS preview box
 * @param {Object} effectiveSettings
 */
function updateCssPreview(effectiveSettings) {
  if (cssPreviewEl) {
    cssPreviewEl.textContent = generateHidingCSS(effectiveSettings);
  }
}

/**
 * Saves updated settings to background
 * @param {Object} delta
 */
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
    console.warn('[FocusTube Options] Failed to save settings:', error);
  }
}

/**
 * Updates DNR status display
 * @param {boolean} isRedirectActive
 */
function updateDnrStatus(isRedirectActive) {
  if (statsDnrStatus) {
    statsDnrStatus.textContent = isRedirectActive ? 'Active' : 'Disabled';
    statsDnrStatus.className = isRedirectActive ? 'stat-value text-accent' : 'stat-value';
  }
}

/**
 * Formats timestamp to human readable string
 * @param {number|null} timestamp
 * @returns {string}
 */
function formatTime(timestamp) {
  if (!timestamp) return 'Never';
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Attaches event listeners
 */
function attachEventListeners() {
  // Master Stop/Start Button
  if (btnOptMasterToggle) {
    btnOptMasterToggle.addEventListener('click', () => {
      const currentEnabled = currentSettings?.enabled !== false;
      const nextEnabled = !currentEnabled;
      updateMasterToggleUI(nextEnabled);
      persistSettings({ enabled: nextEnabled });
    });
  }

  // Mode selection cards
  modeCards.forEach((card) => {
    card.addEventListener('click', () => {
      const mode = card.getAttribute('data-mode');
      if (mode && mode !== currentSettings?.mode) {
        persistSettings({ mode });
      }
    });
  });

  // Granular setting checkboxes
  settingInputs.forEach((input) => {
    input.addEventListener('change', () => {
      if (currentSettings?.mode !== MODES.CUSTOM) return;

      const key = input.getAttribute('data-key');
      if (key) {
        persistSettings({ [key]: input.checked });
      }
    });
  });

  // Copy CSS button
  if (btnCopyCss) {
    btnCopyCss.addEventListener('click', async () => {
      if (cssPreviewEl?.textContent) {
        await navigator.clipboard.writeText(cssPreviewEl.textContent);
        const originalText = btnCopyCss.querySelector('span').textContent;
        btnCopyCss.querySelector('span').textContent = 'Copied!';
        setTimeout(() => {
          btnCopyCss.querySelector('span').textContent = originalText;
        }, 1800);
      }
    });
  }

  // Export settings as JSON
  if (btnExportSettings) {
    btnExportSettings.addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(currentSettings, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `focustube-settings-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  // Import settings from JSON
  if (fileImportSettings) {
    fileImportSettings.addEventListener('change', (event) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const parsed = JSON.parse(e.target.result);
          await persistSettings(parsed);
          alert('Settings successfully imported!');
        } catch {
          alert('Failed to parse settings file. Please verify it is a valid FocusTube JSON configuration.');
        }
      };
      reader.readAsText(file);
    });
  }

  // Reset to Defaults
  if (btnResetDefaults) {
    btnResetDefaults.addEventListener('click', async () => {
      if (confirm('Are you sure you want to reset all FocusTube settings to factory defaults?')) {
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

  // Navigation menu smooth scrolling
  navItems.forEach((item) => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = item.getAttribute('data-target');
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        navItems.forEach((n) => n.classList.remove('active'));
        item.classList.add('active');
        targetEl.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
}

/**
 * Initializes Options Page
 */
async function initOptions() {
  attachEventListeners();

  try {
    // Load Settings
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

    // Load Stats
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
    console.warn('[FocusTube Options] Initialization error:', error);
  }
}

document.addEventListener('DOMContentLoaded', initOptions);
