/**
 * FocusTube - YouTube Shorts-to-Regular-Player
 * Global Constants & Configurations
 */

export const STORAGE_KEYS = {
  SETTINGS: 'focustube_settings',
  STATS: 'focustube_stats',
  SELECTOR_OVERRIDES: 'focustube_selector_overrides'
};

export const MODES = {
  STRICT: 'strict',
  REDIRECT_ONLY: 'redirect_only',
  CUSTOM: 'custom'
};

export const MESSAGE_ACTIONS = {
  GET_SETTINGS: 'GET_SETTINGS',
  SAVE_SETTINGS: 'SAVE_SETTINGS',
  RESET_SETTINGS: 'RESET_SETTINGS',
  GET_STATS: 'GET_STATS',
  INCREMENT_REDIRECT_COUNT: 'INCREMENT_REDIRECT_COUNT',
  SETTINGS_UPDATED: 'SETTINGS_UPDATED',
  LOG_EVENT: 'LOG_EVENT'
};

export const LIMITS = {
  MAX_HOPS_PER_INTERVAL: 3,
  HOP_INTERVAL_MS: 3000,
  MUTATION_DEBOUNCE_MS: 50,
  VIDEO_ID_LENGTH: 11
};

export const REGEX = {
  // Matches valid 11-char YouTube video ID
  VIDEO_ID: /^[a-zA-Z0-9_-]{11}$/,
  // Matches shorts path: /shorts/VIDEO_ID with optional query or trailing slash
  SHORTS_PATH: /^\/shorts\/([a-zA-Z0-9_-]{11})(?:[\/?&#]|$)/,
  // Full YouTube URL check
  YOUTUBE_HOST: /^(?:www\.|m\.)?youtube\.com$/i
};

export const ATTRIBUTES = {
  PROCESSED_LINK: 'data-focustube-processed',
  ORIGINAL_HREF: 'data-focustube-original-href',
  STYLE_TAG_ID: 'focustube-injected-styles'
};
