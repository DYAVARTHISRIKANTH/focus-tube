/**
 * FocusTube - Storage Utility Wrapper
 *
 * Provides a resilient Promise-based storage interface using chrome.storage.sync
 * with graceful fallback to chrome.storage.local.
 */

import { STORAGE_KEYS } from '../config/constants.js';
import { DEFAULT_SETTINGS, DEFAULT_STATS, sanitizeSettings } from '../config/settings.js';

function getStorageArea() {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    return chrome.storage.sync || chrome.storage.local;
  }
  return null;
}

/**
 * Loads user settings from storage.
 * @returns {Promise<Object>}
 */
export async function loadSettings() {
  const storage = getStorageArea();
  if (!storage) {
    return { ...DEFAULT_SETTINGS };
  }

  return new Promise((resolve) => {
    try {
      storage.get([STORAGE_KEYS.SETTINGS], (result) => {
        if (chrome.runtime?.lastError) {
          console.warn('[FocusTube] Storage read error:', chrome.runtime.lastError.message);
          resolve({ ...DEFAULT_SETTINGS });
          return;
        }

        const raw = result?.[STORAGE_KEYS.SETTINGS];
        resolve(sanitizeSettings(raw));
      });
    } catch {
      resolve({ ...DEFAULT_SETTINGS });
    }
  });
}

/**
 * Saves user settings to storage.
 * @param {Object} newSettings
 * @returns {Promise<Object>}
 */
export async function saveSettings(newSettings) {
  const sanitized = sanitizeSettings(newSettings);
  const storage = getStorageArea();

  if (!storage) {
    return sanitized;
  }

  return new Promise((resolve, reject) => {
    try {
      storage.set({ [STORAGE_KEYS.SETTINGS]: sanitized }, () => {
        if (chrome.runtime?.lastError) {
          console.error('[FocusTube] Storage write error:', chrome.runtime.lastError.message);
          reject(chrome.runtime.lastError);
          return;
        }
        resolve(sanitized);
      });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Loads redirect statistics from storage.
 * @returns {Promise<Object>}
 */
export async function loadStats() {
  const storage = getStorageArea();
  if (!storage) {
    return { ...DEFAULT_STATS };
  }

  return new Promise((resolve) => {
    try {
      storage.get([STORAGE_KEYS.STATS], (result) => {
        if (chrome.runtime?.lastError) {
          resolve({ ...DEFAULT_STATS });
          return;
        }
        resolve({ ...DEFAULT_STATS, ...(result?.[STORAGE_KEYS.STATS] || {}) });
      });
    } catch {
      resolve({ ...DEFAULT_STATS });
    }
  });
}

/**
 * Increments the redirected count statistic.
 * @returns {Promise<Object>}
 */
export async function incrementRedirectStat() {
  const current = await loadStats();
  const updated = {
    ...current,
    redirectedCount: (current.redirectedCount || 0) + 1,
    lastRedirectAt: Date.now()
  };

  const storage = getStorageArea();
  if (storage) {
    await new Promise((resolve) => {
      try {
        storage.set({ [STORAGE_KEYS.STATS]: updated }, resolve);
      } catch {
        resolve();
      }
    });
  }

  return updated;
}
