import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { applyDOMFilter, removeDOMFilter } from '../src/content/dom-filter.js';
import { ATTRIBUTES } from '../src/config/constants.js';

test('applyDOMFilter: injects style tag into document head with hiding rules', () => {
  const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
  global.document = dom.window.document;

  applyDOMFilter({
    hideSidebarShorts: true,
    hideFeedShelves: true,
    hideSearchShorts: false,
    hideWatchNextShorts: false,
    hideChannelShortsTab: false
  });

  const styleTag = dom.window.document.getElementById(ATTRIBUTES.STYLE_TAG_ID);
  assert.ok(styleTag);
  assert.match(styleTag.textContent, /display: none !important;/);
  assert.match(styleTag.textContent, /ytd-guide-entry-renderer/);
  assert.match(styleTag.textContent, /ytd-rich-section-renderer:has\(a\[href\^="\/shorts\/"\]\)/);

  // Clean up
  removeDOMFilter();
  assert.equal(dom.window.document.getElementById(ATTRIBUTES.STYLE_TAG_ID), null);
});

test('applyDOMFilter: handles Redirect Only mode by disabling hiding rules', () => {
  const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
  global.document = dom.window.document;

  applyDOMFilter({
    hideSidebarShorts: false,
    hideFeedShelves: false,
    hideSearchShorts: false,
    hideWatchNextShorts: false,
    hideChannelShortsTab: false
  });

  const styleTag = dom.window.document.getElementById(ATTRIBUTES.STYLE_TAG_ID);
  assert.ok(styleTag);
  assert.equal(styleTag.textContent.includes('display: none'), false);
  assert.match(styleTag.textContent, /Hiding disabled/);

  removeDOMFilter();
});
