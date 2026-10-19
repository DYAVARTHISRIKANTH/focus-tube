/**
 * FocusTube - SPA Navigator & Redirect Manager
 *
 * Intercepts YouTube SPA navigation events (yt-navigate-start, popstate, direct URL hits)
 * and safely redirects /shorts/ to /watch?v= with strict infinite-loop prevention.
 */

import { LIMITS, MESSAGE_ACTIONS } from '../config/constants.js';
import { convertShortsToWatchUrl, isShortsUrl } from './url-converter.js';

class RedirectManager {
  constructor() {
    this.redirectHistory = [];
    this.isCircuitBroken = false;
    this.circuitBreakerResetTimeout = null;
    this.lastRedirectedTarget = null;
    this.options = { preserveTimestamp: true };
    this.enabled = true;
  }

  /**
   * Updates operational options and enabled state.
   * @param {Object} options
   */
  configure(options = {}) {
    this.options = { ...this.options, ...options };
    this.enabled = Boolean(options.redirectShorts);
  }

  /**
   * Evaluates circuit breaker condition to prevent infinite loops.
   * @returns {boolean} True if redirect is permitted, false if blocked
   */
  canRedirect(targetUrl) {
    if (!this.enabled) return false;
    if (this.isCircuitBroken) {
      console.warn('[FocusTube] Redirection circuit breaker active. Redirect blocked to prevent loop.');
      return false;
    }

    const now = Date.now();
    // Prune entries older than interval
    this.redirectHistory = this.redirectHistory.filter(
      (entry) => now - entry.time < LIMITS.HOP_INTERVAL_MS
    );

    if (this.redirectHistory.length >= LIMITS.MAX_HOPS_PER_INTERVAL) {
      this.tripCircuitBreaker();
      return false;
    }

    // Check immediate duplicate redirect loop
    if (this.lastRedirectedTarget === targetUrl && this.redirectHistory.length > 0) {
      const lastEntry = this.redirectHistory[this.redirectHistory.length - 1];
      if (now - lastEntry.time < 1000) {
        console.warn('[FocusTube] Immediate duplicate redirect detected. Skipping.');
        return false;
      }
    }

    return true;
  }

  /**
   * Activates circuit breaker cooldown.
   */
  tripCircuitBreaker() {
    this.isCircuitBroken = true;
    console.warn(`[FocusTube] Excessive redirects detected (>${LIMITS.MAX_HOPS_PER_INTERVAL} in ${LIMITS.HOP_INTERVAL_MS}ms). Tripping circuit breaker for 10s.`);

    if (this.circuitBreakerResetTimeout) {
      clearTimeout(this.circuitBreakerResetTimeout);
    }

    this.circuitBreakerResetTimeout = setTimeout(() => {
      this.isCircuitBroken = false;
      this.redirectHistory = [];
      console.info('[FocusTube] Redirection circuit breaker reset.');
    }, 10000);
  }

  /**
   * Executes a safe redirect if the provided URL is a Shorts URL.
   * @param {string} candidateUrl - Current or destination URL
   * @param {string} trigger - Source event (e.g. 'direct', 'yt-navigate-start', 'popstate')
   * @returns {boolean} True if redirected, false otherwise
   */
  handleUrl(candidateUrl, trigger = 'unknown') {
    if (!this.enabled) return false;
    if (!candidateUrl || !isShortsUrl(candidateUrl)) return false;

    const watchUrl = convertShortsToWatchUrl(candidateUrl, this.options);
    if (!watchUrl) return false;

    if (!this.canRedirect(watchUrl)) {
      return false;
    }

    const now = Date.now();
    this.redirectHistory.push({ url: watchUrl, time: now });
    this.lastRedirectedTarget = watchUrl;

    // Send statistics increment message to background service worker
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage({
          action: MESSAGE_ACTIONS.INCREMENT_REDIRECT_COUNT,
          data: { url: candidateUrl, watchUrl, trigger, timestamp: now }
        }).catch(() => {
          // Extension context might be reloaded; safely ignore
        });
      }
    } catch {
      // Ignored
    }

    // Execute location replace to preserve browser history back-button behavior
    if (typeof window !== 'undefined' && window.location) {
      window.location.replace(watchUrl);
      return true;
    }

    return false;
  }
}

export const redirectManager = new RedirectManager();

/**
 * Initializes SPA navigation listeners.
 * @param {Object} options
 */
export function initSPANavigator(options = {}) {
  redirectManager.configure(options);

  // 1. Immediate check on load (run_at: document_start)
  if (typeof window !== 'undefined' && window.location) {
    redirectManager.handleUrl(window.location.href, 'direct');
  }

  // 2. YouTube custom navigation start event
  window.addEventListener('yt-navigate-start', (event) => {
    const navUrl = event.detail?.url || window.location.href;
    redirectManager.handleUrl(navUrl, 'yt-navigate-start');
  }, true);

  // 3. YouTube custom navigation finish event (fallback safety)
  window.addEventListener('yt-navigate-finish', () => {
    redirectManager.handleUrl(window.location.href, 'yt-navigate-finish');
  }, true);

  // 4. Browser back/forward navigation
  window.addEventListener('popstate', () => {
    redirectManager.handleUrl(window.location.href, 'popstate');
  });

  // 5. Intercept anchor clicks on YouTube for immediate redirection
  document.addEventListener('click', (event) => {
    if (!redirectManager.enabled) return;

    // Fast bailout: never process clicks inside the video player
    if (event.target?.closest?.('#movie_player, #player, .html5-video-player')) return;

    const anchor = event.target?.closest ? event.target.closest('a[href^="/shorts/"]') : null;
    if (!anchor) return;

    const href = anchor.getAttribute('href');
    if (!href || !isShortsUrl(href)) return;

    const watchUrl = convertShortsToWatchUrl(href, redirectManager.options);
    if (watchUrl) {
      // If regular left click without modifier keys (ctrl, cmd, shift)
      if (event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
        event.preventDefault();
        event.stopImmediatePropagation();
        redirectManager.handleUrl(href, 'anchor-click');
      }
    }
  }, true);
}
