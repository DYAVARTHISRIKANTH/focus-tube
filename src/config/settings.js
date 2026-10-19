/**
 * FocusTube - Settings and Mode Resolution Engine
 */

import { MODES } from './constants.js';

export const DEFAULT_SETTINGS = {
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

export const DEFAULT_STATS = {
  redirectedCount: 0,
  lastRedirectAt: null,
  installedAt: null
};

/**
 * Resolves the effective operational flags based on user mode and master switch.
 *
 * @param {Object} rawSettings - The settings object stored in chrome.storage
 * @returns {Object} Fully resolved operational settings
 */
export function resolveEffectiveSettings(rawSettings) {
  const merged = { ...DEFAULT_SETTINGS, ...(rawSettings || {}) };

  // Master Stop Switch: if disabled, all protection and redirection is shut off
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

/**
 * Sanitize and validate incoming settings object
 * @param {Object} input - Input settings
 * @returns {Object} Validated and cleaned settings
 */
export function sanitizeSettings(input) {
  if (!input || typeof input !== 'object') {
    return { ...DEFAULT_SETTINGS };
  }

  const validModes = Object.values(MODES);
  const mode = validModes.includes(input.mode) ? input.mode : DEFAULT_SETTINGS.mode;

  return {
    enabled: typeof input.enabled === 'boolean' ? input.enabled : DEFAULT_SETTINGS.enabled,
    mode,
    redirectShorts: typeof input.redirectShorts === 'boolean' ? input.redirectShorts : DEFAULT_SETTINGS.redirectShorts,
    hideSidebarShorts: typeof input.hideSidebarShorts === 'boolean' ? input.hideSidebarShorts : DEFAULT_SETTINGS.hideSidebarShorts,
    hideFeedShelves: typeof input.hideFeedShelves === 'boolean' ? input.hideFeedShelves : DEFAULT_SETTINGS.hideFeedShelves,
    hideSearchShorts: typeof input.hideSearchShorts === 'boolean' ? input.hideSearchShorts : DEFAULT_SETTINGS.hideSearchShorts,
    hideWatchNextShorts: typeof input.hideWatchNextShorts === 'boolean' ? input.hideWatchNextShorts : DEFAULT_SETTINGS.hideWatchNextShorts,
    hideChannelShortsTab: typeof input.hideChannelShortsTab === 'boolean' ? input.hideChannelShortsTab : DEFAULT_SETTINGS.hideChannelShortsTab,
    preserveTimestamp: typeof input.preserveTimestamp === 'boolean' ? input.preserveTimestamp : DEFAULT_SETTINGS.preserveTimestamp,
    rewriteLinks: typeof input.rewriteLinks === 'boolean' ? input.rewriteLinks : DEFAULT_SETTINGS.rewriteLinks,
    debugLogging: typeof input.debugLogging === 'boolean' ? input.debugLogging : DEFAULT_SETTINGS.debugLogging
  };
}
