/**
 * FocusTube - Content Script Orchestrator (Zero-Buffering Optimized)
 *
 * Runs at `document_start` on youtube.com.
 * Injects declarative CSS hiding once, handles SPA navigation, and ensures
 * zero JavaScript execution during video playback.
 */

import { MESSAGE_ACTIONS } from '../config/constants.js';
import { DEFAULT_SETTINGS, resolveEffectiveSettings } from '../config/settings.js';
import { isShortsUrl, convertShortsToWatchUrl } from './url-converter.js';
import { applyDOMFilter, removeDOMFilter } from './dom-filter.js';
import { initSPANavigator, redirectManager } from './spa-navigator.js';
import { startLinkRewriter, stopLinkRewriter, revertAllRewrittenLinks } from './link-rewriter.js';

let currentEffectiveSettings = resolveEffectiveSettings(DEFAULT_SETTINGS);

/**
 * Immediate synchronous check at document_start.
 * Redirects immediately if the user lands directly on a Shorts URL.
 */
function checkImmediateShortsRedirect() {
  if (typeof window === 'undefined' || !window.location) return;

  const currentHref = window.location.href;
  if (isShortsUrl(currentHref)) {
    const watchUrl = convertShortsToWatchUrl(currentHref, { preserveTimestamp: true });
    if (watchUrl) {
      window.location.replace(watchUrl);
    }
  }
}

/**
 * Synchronizes the content script state with active settings.
 * @param {Object} effectiveSettings
 */
function applySettingsState(effectiveSettings) {
  currentEffectiveSettings = effectiveSettings;

  // 1. Update DOM Filter CSS rules
  applyDOMFilter(effectiveSettings);

  // 2. Configure SPA Navigator
  redirectManager.configure(effectiveSettings);

  // 3. Configure Link Rewriter
  if (effectiveSettings.rewriteLinks) {
    startLinkRewriter(effectiveSettings);
  } else {
    stopLinkRewriter();
    revertAllRewrittenLinks(document);
  }
}

/**
 * Initializes the FocusTube content script.
 */
function initContentScript() {
  // Step 1: Immediate redirect check
  checkImmediateShortsRedirect();

  // Step 2: Apply default CSS hiding rules immediately to prevent layout pop-in
  applyDOMFilter(currentEffectiveSettings);

  // Step 3: Initialize SPA Navigator listeners
  initSPANavigator(currentEffectiveSettings);

  // Step 4: Query background worker for persisted user settings
  if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
    chrome.runtime.sendMessage({ action: MESSAGE_ACTIONS.GET_SETTINGS }, (response) => {
      if (chrome.runtime.lastError) {
        return;
      }
      if (response?.effectiveSettings) {
        applySettingsState(response.effectiveSettings);
      }
    });

    // Step 5: Listen for real-time setting updates from popup or options
    chrome.runtime.onMessage.addListener((message) => {
      if (message?.action === MESSAGE_ACTIONS.SETTINGS_UPDATED && message.data) {
        applySettingsState(message.data);
      }
    });
  }

  // Step 6: Ensure CSS is in place on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      applyDOMFilter(currentEffectiveSettings);
      if (currentEffectiveSettings.rewriteLinks) {
        startLinkRewriter(currentEffectiveSettings);
      }
    }, { once: true });
  } else {
    applyDOMFilter(currentEffectiveSettings);
    if (currentEffectiveSettings.rewriteLinks) {
      startLinkRewriter(currentEffectiveSettings);
    }
  }

  // Step 7: Only update on full SPA page change, NEVER during continuous playback
  window.addEventListener('yt-navigate-finish', () => {
    applyDOMFilter(currentEffectiveSettings);
  });
}

// Auto-boot
initContentScript();
