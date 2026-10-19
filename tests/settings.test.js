import test from 'node:test';
import assert from 'node:assert/strict';
import { MODES } from '../src/config/constants.js';
import {
  DEFAULT_SETTINGS,
  resolveEffectiveSettings,
  sanitizeSettings
} from '../src/config/settings.js';

test('resolveEffectiveSettings: Strict mode sets all blocking and redirecting active', () => {
  const strict = resolveEffectiveSettings({ mode: MODES.STRICT });

  assert.equal(strict.mode, MODES.STRICT);
  assert.equal(strict.redirectShorts, true);
  assert.equal(strict.hideSidebarShorts, true);
  assert.equal(strict.hideFeedShelves, true);
  assert.equal(strict.hideSearchShorts, true);
  assert.equal(strict.hideWatchNextShorts, true);
  assert.equal(strict.hideChannelShortsTab, true);
  assert.equal(strict.rewriteLinks, true);
});

test('resolveEffectiveSettings: Redirect Only mode redirects but does not hide any UI elements', () => {
  const redirectOnly = resolveEffectiveSettings({ mode: MODES.REDIRECT_ONLY });

  assert.equal(redirectOnly.mode, MODES.REDIRECT_ONLY);
  assert.equal(redirectOnly.redirectShorts, true);
  assert.equal(redirectOnly.hideSidebarShorts, false);
  assert.equal(redirectOnly.hideFeedShelves, false);
  assert.equal(redirectOnly.hideSearchShorts, false);
  assert.equal(redirectOnly.hideWatchNextShorts, false);
  assert.equal(redirectOnly.hideChannelShortsTab, false);
  assert.equal(redirectOnly.rewriteLinks, true);
});

test('resolveEffectiveSettings: Custom mode honors exact granular toggles', () => {
  const custom = resolveEffectiveSettings({
    mode: MODES.CUSTOM,
    redirectShorts: true,
    hideSidebarShorts: true,
    hideFeedShelves: false,
    hideSearchShorts: true,
    hideWatchNextShorts: false,
    hideChannelShortsTab: false,
    preserveTimestamp: false,
    rewriteLinks: false
  });

  assert.equal(custom.mode, MODES.CUSTOM);
  assert.equal(custom.redirectShorts, true);
  assert.equal(custom.hideSidebarShorts, true);
  assert.equal(custom.hideFeedShelves, false);
  assert.equal(custom.hideSearchShorts, true);
  assert.equal(custom.hideWatchNextShorts, false);
  assert.equal(custom.hideChannelShortsTab, false);
  assert.equal(custom.preserveTimestamp, false);
  assert.equal(custom.rewriteLinks, false);
});

test('resolveEffectiveSettings: Master Stop switch (enabled: false) shuts off all redirection and UI hiding across all modes', () => {
  // Test with Strict mode
  const stoppedStrict = resolveEffectiveSettings({ enabled: false, mode: MODES.STRICT });
  assert.equal(stoppedStrict.enabled, false);
  assert.equal(stoppedStrict.redirectShorts, false);
  assert.equal(stoppedStrict.hideSidebarShorts, false);
  assert.equal(stoppedStrict.hideFeedShelves, false);
  assert.equal(stoppedStrict.hideSearchShorts, false);
  assert.equal(stoppedStrict.hideWatchNextShorts, false);
  assert.equal(stoppedStrict.hideChannelShortsTab, false);
  assert.equal(stoppedStrict.rewriteLinks, false);

  // Test with Custom mode
  const stoppedCustom = resolveEffectiveSettings({
    enabled: false,
    mode: MODES.CUSTOM,
    redirectShorts: true,
    hideSidebarShorts: true,
    hideFeedShelves: true
  });
  assert.equal(stoppedCustom.enabled, false);
  assert.equal(stoppedCustom.redirectShorts, false);
  assert.equal(stoppedCustom.hideSidebarShorts, false);
  assert.equal(stoppedCustom.hideFeedShelves, false);
  assert.equal(stoppedCustom.rewriteLinks, false);
});

test('sanitizeSettings: handles malformed or partial settings', () => {
  const empty = sanitizeSettings(null);
  assert.deepEqual(empty, DEFAULT_SETTINGS);

  const corrupted = sanitizeSettings({
    enabled: false,
    mode: 'INVALID_MODE',
    redirectShorts: 'yes', // should be boolean
    hideSidebarShorts: false
  });
  assert.equal(corrupted.enabled, false);
  assert.equal(corrupted.mode, MODES.STRICT);
  assert.equal(corrupted.redirectShorts, true); // fallback to default
  assert.equal(corrupted.hideSidebarShorts, false); // valid boolean preserved
});
