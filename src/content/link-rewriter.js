/**
 * FocusTube - Zero-Overhead Link Rewriter Engine
 *
 * Rewrites Shorts links strictly on-demand when hovered or clicked.
 * Explicitly ignores all events originating from the video player to guarantee
 * 100% buffer-free, smooth video playback.
 */

import { ATTRIBUTES } from '../config/constants.js';
import { convertShortsToWatchUrl } from './url-converter.js';

let isRewriterActive = false;
let delegationAttached = false;

/**
 * Checks whether an element is inside the video player or player controls.
 * @param {Element} element
 * @returns {boolean}
 */
function isInsidePlayerOrControls(element) {
  if (!element || !element.closest) return false;
  return Boolean(element.closest('#movie_player, #player, .html5-video-player, #chatframe, ytd-live-chat-frame'));
}

/**
 * Rewrites a single anchor element to point to the regular watch URL.
 * @param {HTMLAnchorElement} anchor
 * @param {Object} options
 */
export function rewriteSingleLink(anchor, options = { preserveTimestamp: true }) {
  if (!anchor || !(anchor instanceof HTMLAnchorElement)) return;
  if (anchor.getAttribute(ATTRIBUTES.PROCESSED_LINK) === 'true') return;
  if (isInsidePlayerOrControls(anchor)) return;

  const currentHref = anchor.getAttribute('href');
  if (!currentHref || !currentHref.includes('/shorts/')) return;

  const watchUrl = convertShortsToWatchUrl(currentHref, options);
  if (!watchUrl) return;

  anchor.setAttribute(ATTRIBUTES.ORIGINAL_HREF, currentHref);
  anchor.setAttribute(ATTRIBUTES.PROCESSED_LINK, 'true');
  anchor.setAttribute('href', watchUrl);
}

/**
 * Reverts a previously rewritten anchor back to its original href.
 * @param {HTMLAnchorElement} anchor
 */
export function revertSingleLink(anchor) {
  if (!anchor || !(anchor instanceof HTMLAnchorElement)) return;
  const originalHref = anchor.getAttribute(ATTRIBUTES.ORIGINAL_HREF);
  if (originalHref) {
    anchor.setAttribute('href', originalHref);
    anchor.removeAttribute(ATTRIBUTES.ORIGINAL_HREF);
    anchor.removeAttribute(ATTRIBUTES.PROCESSED_LINK);
  }
}

/**
 * Scans a specific container for unprocessed Shorts links.
 * @param {ParentNode} root
 * @param {Object} options
 */
export function scanAndRewriteLinks(root = document, options = { preserveTimestamp: true }) {
  if (!root || !root.querySelectorAll) return;

  const matchingAnchors = root.querySelectorAll(`a[href^="/shorts/"]:not([${ATTRIBUTES.PROCESSED_LINK}="true"])`);
  for (let i = 0; i < matchingAnchors.length; i++) {
    rewriteSingleLink(matchingAnchors[i], options);
  }
}

/**
 * Reverts all rewritten links in the document.
 */
export function revertAllRewrittenLinks(root = document) {
  if (!root || !root.querySelectorAll) return;

  const processedAnchors = root.querySelectorAll(`a[${ATTRIBUTES.PROCESSED_LINK}="true"]`);
  for (let i = 0; i < processedAnchors.length; i++) {
    revertSingleLink(processedAnchors[i]);
  }
}

/**
 * Ultra-fast on-demand delegation handler.
 * Exits immediately if event is anywhere near the video player.
 */
function handleLinkInteraction(e) {
  if (!isRewriterActive) return;

  const target = e.target;
  if (!target || !target.closest) return;

  // Immediate 0ms bailout if mouse is over the video player or player controls
  if (isInsidePlayerOrControls(target)) return;

  const anchor = target.closest('a[href^="/shorts/"]');
  if (anchor) {
    rewriteSingleLink(anchor);
  }
}

/**
 * Attaches passive event delegation listeners.
 */
function attachEventDelegation() {
  if (delegationAttached || typeof document === 'undefined') return;

  // Passive hover listener
  document.addEventListener('pointerover', handleLinkInteraction, { passive: true, capture: true });
  // Right-click context menu
  document.addEventListener('contextmenu', handleLinkInteraction, { passive: true, capture: true });
  // Middle-click
  document.addEventListener('auxclick', handleLinkInteraction, { passive: true, capture: true });

  delegationAttached = true;
}

/**
 * Starts on-demand link rewriting with idle scheduling.
 * @param {Object} options
 */
export function startLinkRewriter(options = { preserveTimestamp: true }) {
  isRewriterActive = true;
  attachEventDelegation();
}

/**
 * Stops the link rewriter.
 */
export function stopLinkRewriter() {
  isRewriterActive = false;
}
