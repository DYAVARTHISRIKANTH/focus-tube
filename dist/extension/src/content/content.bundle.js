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
  var LIMITS = {
    MAX_HOPS_PER_INTERVAL: 3,
    HOP_INTERVAL_MS: 3e3,
    MUTATION_DEBOUNCE_MS: 50,
    VIDEO_ID_LENGTH: 11
  };
  var REGEX = {
    // Matches valid 11-char YouTube video ID
    VIDEO_ID: /^[a-zA-Z0-9_-]{11}$/,
    // Matches shorts path: /shorts/VIDEO_ID with optional query or trailing slash
    SHORTS_PATH: /^\/shorts\/([a-zA-Z0-9_-]{11})(?:[\/?&#]|$)/,
    // Full YouTube URL check
    YOUTUBE_HOST: /^(?:www\.|m\.)?youtube\.com$/i
  };
  var ATTRIBUTES = {
    PROCESSED_LINK: "data-focustube-processed",
    ORIGINAL_HREF: "data-focustube-original-href",
    STYLE_TAG_ID: "focustube-injected-styles"
  };

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

  // src/content/url-converter.js
  function isValidVideoId(id) {
    if (typeof id !== "string") return false;
    return REGEX.VIDEO_ID.test(id.trim());
  }
  function extractShortsVideoId(urlString) {
    if (!urlString || typeof urlString !== "string") return null;
    if (!urlString.includes("/shorts/")) return null;
    try {
      const base = "https://www.youtube.com";
      const parsed = new URL(urlString, base);
      if (urlString.startsWith("http://") || urlString.startsWith("https://")) {
        if (!REGEX.YOUTUBE_HOST.test(parsed.hostname)) {
          return null;
        }
      }
      const pathname = parsed.pathname;
      if (!pathname.startsWith("/shorts/")) {
        return null;
      }
      const segments = pathname.split("/").filter(Boolean);
      if (segments.length < 2 || segments[0] !== "shorts") {
        return null;
      }
      const candidateId = segments[1];
      if (isValidVideoId(candidateId)) {
        return candidateId;
      }
      return null;
    } catch {
      return null;
    }
  }
  function isShortsUrl(urlString) {
    return extractShortsVideoId(urlString) !== null;
  }
  function convertShortsToWatchUrl(urlString, options = { preserveTimestamp: true }) {
    if (!urlString || typeof urlString !== "string") return null;
    const videoId = extractShortsVideoId(urlString);
    if (!videoId) return null;
    try {
      const isRelative = !urlString.startsWith("http://") && !urlString.startsWith("https://");
      const dummyBase = "https://www.youtube.com";
      const parsed = new URL(urlString, dummyBase);
      const searchParams = new URLSearchParams(parsed.search);
      const watchParams = new URLSearchParams();
      watchParams.set("v", videoId);
      if (options.preserveTimestamp !== false) {
        const timeParam = searchParams.get("t") || searchParams.get("time_continue");
        if (timeParam) {
          watchParams.set("t", timeParam);
        }
      }
      if (searchParams.has("list")) {
        watchParams.set("list", searchParams.get("list"));
        if (searchParams.has("index")) {
          watchParams.set("index", searchParams.get("index"));
        }
      }
      const newQuery = watchParams.toString();
      const hash = parsed.hash || "";
      if (isRelative) {
        return `/watch?${newQuery}${hash}`;
      }
      return `${parsed.protocol}//${parsed.host}/watch?${newQuery}${hash}`;
    } catch {
      return null;
    }
  }

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

  // src/content/dom-filter.js
  var styleElement = null;
  function getOrCreateStyleTag() {
    if (styleElement && styleElement.isConnected) {
      if (document.head && styleElement.parentNode !== document.head) {
        document.head.appendChild(styleElement);
      }
      return styleElement;
    }
    const existing = document.getElementById(ATTRIBUTES.STYLE_TAG_ID);
    if (existing) {
      styleElement = existing;
      if (document.head && styleElement.parentNode !== document.head) {
        document.head.appendChild(styleElement);
      }
      return styleElement;
    }
    const style = document.createElement("style");
    style.id = ATTRIBUTES.STYLE_TAG_ID;
    style.type = "text/css";
    const targetParent = document.head || document.documentElement || document.body;
    if (targetParent) {
      targetParent.appendChild(style);
    }
    styleElement = style;
    return style;
  }
  function applyDOMFilter(effectiveSettings) {
    if (!effectiveSettings) return;
    const css = generateHidingCSS(effectiveSettings);
    const tag = getOrCreateStyleTag();
    if (tag && tag.textContent !== css) {
      tag.textContent = css;
    }
  }

  // src/content/spa-navigator.js
  var RedirectManager = class {
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
        console.warn("[FocusTube] Redirection circuit breaker active. Redirect blocked to prevent loop.");
        return false;
      }
      const now = Date.now();
      this.redirectHistory = this.redirectHistory.filter(
        (entry) => now - entry.time < LIMITS.HOP_INTERVAL_MS
      );
      if (this.redirectHistory.length >= LIMITS.MAX_HOPS_PER_INTERVAL) {
        this.tripCircuitBreaker();
        return false;
      }
      if (this.lastRedirectedTarget === targetUrl && this.redirectHistory.length > 0) {
        const lastEntry = this.redirectHistory[this.redirectHistory.length - 1];
        if (now - lastEntry.time < 1e3) {
          console.warn("[FocusTube] Immediate duplicate redirect detected. Skipping.");
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
        console.info("[FocusTube] Redirection circuit breaker reset.");
      }, 1e4);
    }
    /**
     * Executes a safe redirect if the provided URL is a Shorts URL.
     * @param {string} candidateUrl - Current or destination URL
     * @param {string} trigger - Source event (e.g. 'direct', 'yt-navigate-start', 'popstate')
     * @returns {boolean} True if redirected, false otherwise
     */
    handleUrl(candidateUrl, trigger = "unknown") {
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
      try {
        if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
          chrome.runtime.sendMessage({
            action: MESSAGE_ACTIONS.INCREMENT_REDIRECT_COUNT,
            data: { url: candidateUrl, watchUrl, trigger, timestamp: now }
          }).catch(() => {
          });
        }
      } catch {
      }
      if (typeof window !== "undefined" && window.location) {
        window.location.replace(watchUrl);
        return true;
      }
      return false;
    }
  };
  var redirectManager = new RedirectManager();
  function initSPANavigator(options = {}) {
    redirectManager.configure(options);
    if (typeof window !== "undefined" && window.location) {
      redirectManager.handleUrl(window.location.href, "direct");
    }
    window.addEventListener("yt-navigate-start", (event) => {
      const navUrl = event.detail?.url || window.location.href;
      redirectManager.handleUrl(navUrl, "yt-navigate-start");
    }, true);
    window.addEventListener("yt-navigate-finish", () => {
      redirectManager.handleUrl(window.location.href, "yt-navigate-finish");
    }, true);
    window.addEventListener("popstate", () => {
      redirectManager.handleUrl(window.location.href, "popstate");
    });
    document.addEventListener("click", (event) => {
      if (!redirectManager.enabled) return;
      if (event.target?.closest?.("#movie_player, #player, .html5-video-player")) return;
      const anchor = event.target?.closest ? event.target.closest('a[href^="/shorts/"]') : null;
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || !isShortsUrl(href)) return;
      const watchUrl = convertShortsToWatchUrl(href, redirectManager.options);
      if (watchUrl) {
        if (event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
          event.preventDefault();
          event.stopImmediatePropagation();
          redirectManager.handleUrl(href, "anchor-click");
        }
      }
    }, true);
  }

  // src/content/link-rewriter.js
  var isRewriterActive = false;
  var delegationAttached = false;
  function isInsidePlayerOrControls(element) {
    if (!element || !element.closest) return false;
    return Boolean(element.closest("#movie_player, #player, .html5-video-player, #chatframe, ytd-live-chat-frame"));
  }
  function rewriteSingleLink(anchor, options = { preserveTimestamp: true }) {
    if (!anchor || !(anchor instanceof HTMLAnchorElement)) return;
    if (anchor.getAttribute(ATTRIBUTES.PROCESSED_LINK) === "true") return;
    if (isInsidePlayerOrControls(anchor)) return;
    const currentHref = anchor.getAttribute("href");
    if (!currentHref || !currentHref.includes("/shorts/")) return;
    const watchUrl = convertShortsToWatchUrl(currentHref, options);
    if (!watchUrl) return;
    anchor.setAttribute(ATTRIBUTES.ORIGINAL_HREF, currentHref);
    anchor.setAttribute(ATTRIBUTES.PROCESSED_LINK, "true");
    anchor.setAttribute("href", watchUrl);
  }
  function revertSingleLink(anchor) {
    if (!anchor || !(anchor instanceof HTMLAnchorElement)) return;
    const originalHref = anchor.getAttribute(ATTRIBUTES.ORIGINAL_HREF);
    if (originalHref) {
      anchor.setAttribute("href", originalHref);
      anchor.removeAttribute(ATTRIBUTES.ORIGINAL_HREF);
      anchor.removeAttribute(ATTRIBUTES.PROCESSED_LINK);
    }
  }
  function revertAllRewrittenLinks(root = document) {
    if (!root || !root.querySelectorAll) return;
    const processedAnchors = root.querySelectorAll(`a[${ATTRIBUTES.PROCESSED_LINK}="true"]`);
    for (let i = 0; i < processedAnchors.length; i++) {
      revertSingleLink(processedAnchors[i]);
    }
  }
  function handleLinkInteraction(e) {
    if (!isRewriterActive) return;
    const target = e.target;
    if (!target || !target.closest) return;
    if (isInsidePlayerOrControls(target)) return;
    const anchor = target.closest('a[href^="/shorts/"]');
    if (anchor) {
      rewriteSingleLink(anchor);
    }
  }
  function attachEventDelegation() {
    if (delegationAttached || typeof document === "undefined") return;
    document.addEventListener("pointerover", handleLinkInteraction, { passive: true, capture: true });
    document.addEventListener("contextmenu", handleLinkInteraction, { passive: true, capture: true });
    document.addEventListener("auxclick", handleLinkInteraction, { passive: true, capture: true });
    delegationAttached = true;
  }
  function startLinkRewriter(options = { preserveTimestamp: true }) {
    isRewriterActive = true;
    attachEventDelegation();
  }
  function stopLinkRewriter() {
    isRewriterActive = false;
  }

  // src/content/content.js
  var currentEffectiveSettings = resolveEffectiveSettings(DEFAULT_SETTINGS);
  function checkImmediateShortsRedirect() {
    if (typeof window === "undefined" || !window.location) return;
    const currentHref = window.location.href;
    if (isShortsUrl(currentHref)) {
      const watchUrl = convertShortsToWatchUrl(currentHref, { preserveTimestamp: true });
      if (watchUrl) {
        window.location.replace(watchUrl);
      }
    }
  }
  function applySettingsState(effectiveSettings) {
    currentEffectiveSettings = effectiveSettings;
    applyDOMFilter(effectiveSettings);
    redirectManager.configure(effectiveSettings);
    if (effectiveSettings.rewriteLinks) {
      startLinkRewriter(effectiveSettings);
    } else {
      stopLinkRewriter();
      revertAllRewrittenLinks(document);
    }
  }
  function initContentScript() {
    checkImmediateShortsRedirect();
    applyDOMFilter(currentEffectiveSettings);
    initSPANavigator(currentEffectiveSettings);
    if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ action: MESSAGE_ACTIONS.GET_SETTINGS }, (response) => {
        if (chrome.runtime.lastError) {
          return;
        }
        if (response?.effectiveSettings) {
          applySettingsState(response.effectiveSettings);
        }
      });
      chrome.runtime.onMessage.addListener((message) => {
        if (message?.action === MESSAGE_ACTIONS.SETTINGS_UPDATED && message.data) {
          applySettingsState(message.data);
        }
      });
    }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
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
    window.addEventListener("yt-navigate-finish", () => {
      applyDOMFilter(currentEffectiveSettings);
    });
  }
  initContentScript();
})();
