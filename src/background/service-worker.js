/**
 * FocusTube - Background Service Worker (Manifest V3)
 *
 * Manages DeclarativeNetRequest dynamic rules for instant network-level redirection,
 * synchronizes settings across tabs, manages the extension badge, and tracks redirection stats.
 */

import { MESSAGE_ACTIONS } from '../config/constants.js';
import { DEFAULT_SETTINGS, resolveEffectiveSettings } from '../config/settings.js';
import { loadSettings, saveSettings, loadStats, incrementRedirectStat } from '../utils/storage.js';

const DNR_RULE_IDS = [1, 2];

/**
 * Updates declarativeNetRequest dynamic redirect rules to intercept Shorts navigation
 * at the network layer for zero-latency redirection on direct loads or new tabs.
 *
 * Uses memory-efficient RE2 regex filters compliant with Chrome's 2KB compile limit.
 *
 * @param {boolean} shouldRedirect - Whether redirection is currently active
 */
async function syncDeclarativeNetRequestRules(shouldRedirect) {
  if (typeof chrome === 'undefined' || !chrome.declarativeNetRequest) {
    return;
  }

  try {
    if (shouldRedirect) {
      // Rule 1: Clean Shorts URL with optional trailing slash (no query params)
      const redirectRuleNoQuery = {
        id: 1,
        priority: 1,
        action: {
          type: 'redirect',
          redirect: {
            regexSubstitution: 'https://www.youtube.com/watch?v=\\1'
          }
        },
        condition: {
          regexFilter: '^https?://[^/]+/shorts/([^/?#]{11})/?$',
          requestDomains: ['youtube.com'],
          resourceTypes: ['main_frame']
        }
      };

      // Rule 2: Shorts URL carrying query parameters (e.g. ?t=..., ?feature=...)
      const redirectRuleWithQuery = {
        id: 2,
        priority: 1,
        action: {
          type: 'redirect',
          redirect: {
            regexSubstitution: 'https://www.youtube.com/watch?v=\\1&\\2'
          }
        },
        condition: {
          regexFilter: '^https?://[^/]+/shorts/([^/?#]{11})\\?(.*)',
          requestDomains: ['youtube.com'],
          resourceTypes: ['main_frame']
        }
      };

      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: DNR_RULE_IDS,
        addRules: [redirectRuleNoQuery, redirectRuleWithQuery]
      });
      console.info('[FocusTube Background] DNR redirection rules registered.');
    } else {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: DNR_RULE_IDS
      });
      console.info('[FocusTube Background] DNR redirection rules removed.');
    }
  } catch (error) {
    console.error('[FocusTube Background] Failed to update DNR rules:', error);
  }
}

/**
 * Formats a numeric count into a short badge string (e.g. 1.2k, 999).
 * @param {number} count
 * @returns {string}
 */
function formatBadgeText(count) {
  if (!count || count <= 0) return '';
  if (count > 9999) return `${Math.floor(count / 1000)}k`;
  if (count > 999) return `${(count / 1000).toFixed(1)}k`;
  return String(count);
}

/**
 * Updates the Chrome extension action badge with current redirection statistics or stopped state.
 * @param {Object} [settings]
 */
async function updateActionBadge(settings) {
  if (typeof chrome === 'undefined' || !chrome.action) return;

  try {
    const currentSettings = settings || await loadSettings();
    if (currentSettings && currentSettings.enabled === false) {
      await chrome.action.setBadgeText({ text: 'OFF' });
      await chrome.action.setBadgeBackgroundColor({ color: '#64748b' });
      await chrome.action.setTitle({
        title: 'FocusTube: Stopped / Paused (Click popup to resume)'
      });
      return;
    }

    const stats = await loadStats();
    const count = stats.redirectedCount || 0;
    const badgeText = formatBadgeText(count);

    await chrome.action.setBadgeText({ text: badgeText });
    await chrome.action.setBadgeBackgroundColor({ color: '#FF0033' });
    await chrome.action.setTitle({
      title: `FocusTube: Active (${count} Shorts redirected to regular player)`
    });
  } catch (error) {
    console.warn('[FocusTube Background] Failed to update action badge:', error);
  }
}

/**
 * Broadcasts settings updates to all open YouTube tabs.
 * @param {Object} effectiveSettings
 */
async function broadcastSettingsToTabs(effectiveSettings) {
  if (typeof chrome === 'undefined' || !chrome.tabs) return;

  try {
    const tabs = await chrome.tabs.query({ url: '*://*.youtube.com/*' });
    for (const tab of tabs) {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, {
          action: MESSAGE_ACTIONS.SETTINGS_UPDATED,
          data: effectiveSettings
        }).catch(() => {
          // Tab may not be ready or active; ignore safely
        });
      }
    }
  } catch (error) {
    console.warn('[FocusTube Background] Tab broadcast error:', error);
  }
}

/**
 * Extension installation and startup handler
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  console.info(`[FocusTube] Extension installed / updated: reason=${details.reason}`);

  const settings = await loadSettings();
  const effective = resolveEffectiveSettings(settings);

  await syncDeclarativeNetRequestRules(effective.redirectShorts);
  await updateActionBadge(settings);
});

chrome.runtime.onStartup.addListener(async () => {
  const settings = await loadSettings();
  const effective = resolveEffectiveSettings(settings);

  await syncDeclarativeNetRequestRules(effective.redirectShorts);
  await updateActionBadge(settings);
});

/**
 * Message router for popup, options, and content scripts
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.action) return false;

  (async () => {
    switch (message.action) {
      case MESSAGE_ACTIONS.GET_SETTINGS: {
        const raw = await loadSettings();
        const effective = resolveEffectiveSettings(raw);
        sendResponse({ success: true, settings: raw, effectiveSettings: effective });
        break;
      }

      case MESSAGE_ACTIONS.SAVE_SETTINGS: {
        const saved = await saveSettings(message.data);
        const effective = resolveEffectiveSettings(saved);

        await syncDeclarativeNetRequestRules(effective.redirectShorts);
        await broadcastSettingsToTabs(effective);
        await updateActionBadge(saved);

        sendResponse({ success: true, settings: saved, effectiveSettings: effective });
        break;
      }

      case MESSAGE_ACTIONS.RESET_SETTINGS: {
        const saved = await saveSettings(DEFAULT_SETTINGS);
        const effective = resolveEffectiveSettings(saved);

        await syncDeclarativeNetRequestRules(effective.redirectShorts);
        await broadcastSettingsToTabs(effective);
        await updateActionBadge(saved);

        sendResponse({ success: true, settings: saved, effectiveSettings: effective });
        break;
      }

      case MESSAGE_ACTIONS.GET_STATS: {
        const stats = await loadStats();
        sendResponse({ success: true, stats });
        break;
      }

      case MESSAGE_ACTIONS.INCREMENT_REDIRECT_COUNT: {
        const updated = await incrementRedirectStat();
        await updateActionBadge();
        sendResponse({ success: true, stats: updated });
        break;
      }

      default:
        sendResponse({ success: false, error: 'Unknown action' });
        break;
    }
  })();

  return true; // Keep message channel open for async response
});
