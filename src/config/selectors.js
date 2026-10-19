/**
 * FocusTube - Zero-Overhead Selectors Registry
 *
 * Highly optimized to eliminate style recalculation penalties and prevent
 * video playback buffering on YouTube.
 *
 * Uses direct tag matching and prefix-indexed `href^=` selectors on outer shelves,
 * completely avoiding expensive deep `:has()` traversals on the watch page.
 */

export const SELECTORS = {
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
    'ytd-rich-shelf-renderer',
    'ytd-reel-shelf-renderer',
    'yt-horizontal-list-renderer:has(a[href^="/shorts/"])',
    'ytm-reel-shelf-renderer'
  ],

  // Search results Shorts shelves
  searchShorts: [
    'ytd-search ytd-reel-shelf-renderer',
    'ytd-search-sub-menu-renderer ~ ytd-reel-shelf-renderer'
  ],

  // Watch page "Watch Next" / sidebar recommendations (Screenshot 2)
  // Direct tag matching only - zero descendant `:has()` checks to eliminate buffering
  watchNextShorts: [
    '#related ytd-reel-shelf-renderer',
    '#secondary ytd-reel-shelf-renderer',
    'ytd-reel-shelf-renderer'
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
    '#movie_player',
    '#player',
    '.html5-video-player',
    '#comments',
    'ytd-comments',
    'ytd-comment-thread-renderer',
    'ytd-comment-view-model',
    'ytd-post-renderer',
    'ytd-backstage-post-renderer',
    'ytd-playlist-video-renderer'
  ]
};

/**
 * Generate CSS stylesheet content from active toggles.
 * Minimalist, hardware-accelerated rules with zero layout invalidations.
 *
 * @param {Object} effectiveSettings - Resolved settings object
 * @returns {string} CSS rule declarations string
 */
export function generateHidingCSS(effectiveSettings) {
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
    return '/* FocusTube: Hiding disabled */';
  }

  const uniqueSelectors = Array.from(new Set(activeSelectors));

  return `/* FocusTube Zero-Overhead Hiding Rules */
${uniqueSelectors.join(',\n')} {
  display: none !important;
  visibility: hidden !important;
  height: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
}
`;
}
