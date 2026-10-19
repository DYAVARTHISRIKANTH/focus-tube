/**
 * FocusTube - Zero-Overhead DOM Filter Engine
 *
 * Injects declarative CSS rules once and avoids continuous MutationObservers.
 * Relies on Chrome's native C++ styling engine for 0ms layout cost.
 */

import { ATTRIBUTES } from '../config/constants.js';
import { generateHidingCSS } from '../config/selectors.js';

let styleElement = null;

/**
 * Ensures the style tag exists and is properly attached to document.head.
 * @returns {HTMLStyleElement}
 */
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

  const style = document.createElement('style');
  style.id = ATTRIBUTES.STYLE_TAG_ID;
  style.type = 'text/css';

  const targetParent = document.head || document.documentElement || document.body;
  if (targetParent) {
    targetParent.appendChild(style);
  }

  styleElement = style;
  return style;
}

/**
 * Applies CSS hiding rules according to effective settings.
 * @param {Object} effectiveSettings - Resolved settings object
 */
export function applyDOMFilter(effectiveSettings) {
  if (!effectiveSettings) return;

  const css = generateHidingCSS(effectiveSettings);
  const tag = getOrCreateStyleTag();

  if (tag && tag.textContent !== css) {
    tag.textContent = css;
  }
}

/**
 * Removes injected hiding rules completely.
 */
export function removeDOMFilter() {
  const existing = document.getElementById(ATTRIBUTES.STYLE_TAG_ID);
  if (existing) {
    existing.remove();
  }
  styleElement = null;
}
