/**
 * FocusTube - Popup Controller
 */

import { MODES, MESSAGE_ACTIONS } from '../config/constants.js';

const MODE_DESCRIPTIONS = {
  [MODES.STRICT]: 'Strict mode redirects Shorts URLs to the standard watch player and hides all navigation tabs, shelves, and cards.',
  [MODES.REDIRECT_ONLY]: 'Redirect Only mode redirects Shorts URLs to the regular watch player without hiding shelves or navigation links.',
  [MODES.CUSTOM]: 'Custom mode allows fine-grained control over which Shorts elements are hidden or redirected.'
};

let currentSettings = null;

// DOM Elements
const statCountEl = document.getElementById('stat-count');
const modeDescEl = document.getElementById('mode-desc');
const customSectionEl = document.getElementById('custom-section');
const btnOpenOptions = document.getElementById('btn-open-options');
const modeButtons = document.querySelectorAll('.mode-btn');
const toggleInputs = document.querySelectorAll('.toggle-item input[type="checkbox"]');

// Master Toggle Elements
const masterCardEl = document.getElementById('master-card');
const btnMasterToggle = document.getElementById('btn-master-toggle');
const powerBtnText = document.getElementById('power-btn-text');
const masterTitle = document.getElementById('master-title');
const masterSubtitle = document.getElementById('master-subtitle');
const stoppedNotice = document.getElementById('stopped-notice');
const controlsWrapper = document.getElementById('controls-wrapper');
const brandStatus = document.getElementById('brand-status');
const statusText = document.getElementById('status-text');

/**
 * Updates UI to reflect master enable/stop state
 * @param {boolean} enabled
 */
function updateMasterToggleUI(enabled) {
  const isEnabled = enabled !== false;

  if (masterCardEl) {
    masterCardEl.classList.toggle('is-stopped', !isEnabled);
  }

  if (btnMasterToggle) {
    btnMasterToggle.classList.toggle('btn-power-stop', isEnabled);
    btnMasterToggle.classList.toggle('btn-power-start', !isEnabled);
    btnMasterToggle.title = isEnabled ? 'Click to Stop FocusTube' : 'Click to Start FocusTube';
    btnMasterToggle.setAttribute('aria-label', isEnabled ? 'Stop FocusTube' : 'Start FocusTube');
  }

  if (powerBtnText) {
    powerBtnText.textContent = isEnabled ? 'Stop' : 'Start';
  }

  if (masterTitle) {
    masterTitle.textContent = isEnabled ? 'Protection Active' : 'FocusTube Stopped';
  }

  if (masterSubtitle) {
    masterSubtitle.textContent = isEnabled ? 'Shorts blocked & redirected' : 'Standard YouTube restored';
  }

  if (brandStatus) {
    brandStatus.classList.toggle('is-stopped', !isEnabled);
  }

  if (statusText) {
    statusText.textContent = isEnabled ? 'Active' : 'Stopped';
  }

  if (stoppedNotice) {
    stoppedNotice.classList.toggle('hidden', isEnabled);
  }

  if (controlsWrapper) {
    controlsWrapper.classList.toggle('is-stopped', !isEnabled);
  }
}

/**
 * Updates UI to reflect current mode
 * @param {string} mode
 */
function updateModeUI(mode) {
  modeButtons.forEach((btn) => {
    const isTarget = btn.getAttribute('data-mode') === mode;
    btn.classList.toggle('active', isTarget);
    btn.setAttribute('aria-checked', String(isTarget));
  });

  if (modeDescEl) {
    modeDescEl.textContent = MODE_DESCRIPTIONS[mode] || '';
  }

  if (customSectionEl) {
    if (mode === MODES.CUSTOM) {
      customSectionEl.classList.remove('hidden');
    } else {
      customSectionEl.classList.add('hidden');
    }
  }
}

/**
 * Populates granular toggle values
 * @param {Object} settings
 */
function populateToggles(settings) {
  toggleInputs.forEach((input) => {
    const key = input.getAttribute('data-key');
    if (key && typeof settings[key] === 'boolean') {
      input.checked = settings[key];
    }
  });
}

/**
 * Saves current settings state to background service worker
 * @param {Object} updatedSettings
 */
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
    console.warn('[FocusTube Popup] Failed to save settings:', error);
  }
}

/**
 * Attaches event listeners to interactive elements
 */
function attachEventListeners() {
  // Master Stop/Start Power Toggle button
  if (btnMasterToggle) {
    btnMasterToggle.addEventListener('click', () => {
      const currentEnabled = currentSettings?.enabled !== false;
      const nextEnabled = !currentEnabled;
      updateMasterToggleUI(nextEnabled);
      persistSettings({ enabled: nextEnabled });
    });
  }

  // Mode selection buttons
  modeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const selectedMode = btn.getAttribute('data-mode');
      if (!selectedMode || selectedMode === currentSettings?.mode) return;

      updateModeUI(selectedMode);
      persistSettings({ mode: selectedMode });
    });
  });

  // Granular custom toggles
  toggleInputs.forEach((input) => {
    input.addEventListener('change', () => {
      const key = input.getAttribute('data-key');
      if (!key) return;

      persistSettings({ [key]: input.checked });
    });
  });

  // Open Options page button
  if (btnOpenOptions) {
    btnOpenOptions.addEventListener('click', () => {
      if (chrome.runtime?.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      } else {
        window.open(chrome.runtime.getURL('src/options/options.html'));
      }
    });
  }
}

/**
 * Loads settings and statistics on initialization
 */
async function initPopup() {
  attachEventListeners();

  try {
    // 1. Fetch settings
    const settingsResponse = await chrome.runtime.sendMessage({ action: MESSAGE_ACTIONS.GET_SETTINGS });
    if (settingsResponse?.settings) {
      currentSettings = settingsResponse.settings;
      updateMasterToggleUI(currentSettings.enabled);
      updateModeUI(currentSettings.mode);
      populateToggles(currentSettings);
    }

    // 2. Fetch statistics
    const statsResponse = await chrome.runtime.sendMessage({ action: MESSAGE_ACTIONS.GET_STATS });
    if (statsResponse?.stats && statCountEl) {
      const count = statsResponse.stats.redirectedCount || 0;
      statCountEl.textContent = count > 9999 ? `${Math.floor(count / 1000)}k` : String(count);
    }
  } catch (error) {
    console.warn('[FocusTube Popup] Initialization error:', error);
  }
}

document.addEventListener('DOMContentLoaded', initPopup);
