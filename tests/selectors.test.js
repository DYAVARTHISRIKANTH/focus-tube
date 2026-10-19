import test from 'node:test';
import assert from 'node:assert/strict';
import { SELECTORS, generateHidingCSS } from '../src/config/selectors.js';

test('SELECTORS: contains defined and non-empty selector groups', () => {
  assert.ok(Array.isArray(SELECTORS.sidebar) && SELECTORS.sidebar.length > 0);
  assert.ok(Array.isArray(SELECTORS.feedShelves) && SELECTORS.feedShelves.length > 0);
  assert.ok(Array.isArray(SELECTORS.searchShorts) && SELECTORS.searchShorts.length > 0);
  assert.ok(Array.isArray(SELECTORS.watchNextShorts) && SELECTORS.watchNextShorts.length > 0);
  assert.ok(Array.isArray(SELECTORS.channelShortsTab) && SELECTORS.channelShortsTab.length > 0);
  assert.ok(Array.isArray(SELECTORS.exemptions) && SELECTORS.exemptions.length > 0);
});

test('generateHidingCSS: generates correct rules when all toggles are active', () => {
  const css = generateHidingCSS({
    hideSidebarShorts: true,
    hideFeedShelves: true,
    hideSearchShorts: true,
    hideWatchNextShorts: true,
    hideChannelShortsTab: true
  });

  assert.match(css, /display: none !important;/);
  assert.match(css, /ytd-guide-entry-renderer/);
  assert.match(css, /ytd-rich-section-renderer:has\(a\[href\^="\/shorts\/"\]\)/);
  assert.match(css, /ytd-search ytd-reel-shelf-renderer/);
  assert.match(css, /yt-tab-shape\[tab-title="Shorts"\]/);
});

test('generateHidingCSS: produces disabled output when all hiding is off', () => {
  const css = generateHidingCSS({
    hideSidebarShorts: false,
    hideFeedShelves: false,
    hideSearchShorts: false,
    hideWatchNextShorts: false,
    hideChannelShortsTab: false
  });

  assert.equal(css.includes('display: none'), false);
  assert.match(css, /Hiding disabled/);
});

test('generateHidingCSS: generates targeted rules for custom granular toggles', () => {
  const sidebarOnly = generateHidingCSS({
    hideSidebarShorts: true,
    hideFeedShelves: false,
    hideSearchShorts: false,
    hideWatchNextShorts: false,
    hideChannelShortsTab: false
  });

  assert.match(sidebarOnly, /ytd-guide-entry-renderer/);
  assert.equal(sidebarOnly.includes('ytd-rich-section-renderer:has(a[href^="/shorts/"])'), false);
  assert.equal(sidebarOnly.includes('ytd-search'), false);
});

test('SELECTORS: exemptions are never included in hiding rules', () => {
  const css = generateHidingCSS({
    hideSidebarShorts: true,
    hideFeedShelves: true,
    hideSearchShorts: true,
    hideWatchNextShorts: true,
    hideChannelShortsTab: true
  });

  // Verify critical content elements are NOT targeted
  assert.equal(css.includes('#comments'), false);
  assert.equal(css.includes('ytd-comment-thread-renderer'), false);
  assert.equal(css.includes('ytd-post-renderer'), false);
  assert.equal(css.includes('ytd-backstage-post-renderer'), false);
  assert.equal(css.includes('ytd-playlist-video-renderer'), false);
  assert.equal(css.includes('#movie_player'), false);
});
