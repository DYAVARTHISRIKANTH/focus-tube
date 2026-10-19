/**
 * FocusTube - URL Converter & Video ID Validator
 *
 * Provides robust URL parsing, strict 11-character YouTube video ID validation,
 * and translation of /shorts/ URLs to standard /watch?v= URLs while preserving
 * timestamp and playlist parameters.
 */

import { REGEX } from '../config/constants.js';

/**
 * Validates whether a candidate string is an authentic YouTube 11-character video ID.
 * @param {string} id - The candidate string
 * @returns {boolean}
 */
export function isValidVideoId(id) {
  if (typeof id !== 'string') return false;
  return REGEX.VIDEO_ID.test(id.trim());
}

/**
 * Extracts a valid 11-char YouTube Video ID from a Shorts URL (relative or absolute).
 * @param {string} urlString - URL to extract from
 * @returns {string|null} Video ID or null if not a valid shorts URL
 */
export function extractShortsVideoId(urlString) {
  if (!urlString || typeof urlString !== 'string') return null;
  // Fast string pre-check to bypass expensive URL parsing on regular videos
  if (!urlString.includes('/shorts/')) return null;

  try {
    // Handle relative paths by giving a dummy base
    const base = 'https://www.youtube.com';
    const parsed = new URL(urlString, base);

    // If host is provided in original URL, ensure it is youtube.com
    if (urlString.startsWith('http://') || urlString.startsWith('https://')) {
      if (!REGEX.YOUTUBE_HOST.test(parsed.hostname)) {
        return null;
      }
    }

    // Must start with /shorts/
    const pathname = parsed.pathname;
    if (!pathname.startsWith('/shorts/')) {
      return null;
    }

    // Extract path segment after /shorts/
    // e.g. /shorts/dQw4w9WgXcQ/ or /shorts/dQw4w9WgXcQ
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length < 2 || segments[0] !== 'shorts') {
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

/**
 * Checks whether a URL is a valid YouTube Shorts URL with a valid video ID.
 * @param {string} urlString
 * @returns {boolean}
 */
export function isShortsUrl(urlString) {
  return extractShortsVideoId(urlString) !== null;
}

/**
 * Converts a Shorts URL to a standard YouTube /watch?v= URL.
 * Preserves timestamp (`t`, `time_continue`) and playlist (`list`, `index`) parameters.
 * Cleans up ephemeral sharing parameters like `feature=share` or `si=...`.
 *
 * @param {string} urlString - Source shorts URL (absolute or relative)
 * @param {Object} options - Conversion options
 * @param {boolean} [options.preserveTimestamp=true] - Whether to retain timestamp param
 * @returns {string|null} The converted /watch URL, or null if not convertible
 */
export function convertShortsToWatchUrl(urlString, options = { preserveTimestamp: true }) {
  if (!urlString || typeof urlString !== 'string') return null;

  const videoId = extractShortsVideoId(urlString);
  if (!videoId) return null;

  try {
    const isRelative = !urlString.startsWith('http://') && !urlString.startsWith('https://');
    const dummyBase = 'https://www.youtube.com';
    const parsed = new URL(urlString, dummyBase);

    const searchParams = new URLSearchParams(parsed.search);
    const watchParams = new URLSearchParams();

    // 1. Primary video parameter
    watchParams.set('v', videoId);

    // 2. Preserved timestamps
    if (options.preserveTimestamp !== false) {
      const timeParam = searchParams.get('t') || searchParams.get('time_continue');
      if (timeParam) {
        watchParams.set('t', timeParam);
      }
    }

    // 3. Preserved playlist parameters
    if (searchParams.has('list')) {
      watchParams.set('list', searchParams.get('list'));
      if (searchParams.has('index')) {
        watchParams.set('index', searchParams.get('index'));
      }
    }

    const newQuery = watchParams.toString();
    const hash = parsed.hash || '';

    if (isRelative) {
      return `/watch?${newQuery}${hash}`;
    }

    return `${parsed.protocol}//${parsed.host}/watch?${newQuery}${hash}`;
  } catch {
    return null;
  }
}
