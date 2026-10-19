import test from 'node:test';
import assert from 'node:assert/strict';
import { redirectManager } from '../src/content/spa-navigator.js';
import { LIMITS } from '../src/config/constants.js';

test('RedirectManager: handles shorts URL and triggers redirect', () => {
  let replacedWith = null;
  global.window = {
    location: {
      replace: (url) => {
        replacedWith = url;
      }
    }
  };

  redirectManager.configure({ redirectShorts: true });
  redirectManager.redirectHistory = [];
  redirectManager.isCircuitBroken = false;
  redirectManager.lastRedirectedTarget = null;

  const didRedirect = redirectManager.handleUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ', 'test');
  assert.equal(didRedirect, true);
  assert.equal(replacedWith, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
});

test('RedirectManager: does not redirect if disabled in settings', () => {
  let replacedWith = null;
  global.window = {
    location: {
      replace: (url) => {
        replacedWith = url;
      }
    }
  };

  redirectManager.configure({ redirectShorts: false });
  const didRedirect = redirectManager.handleUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ', 'test');
  assert.equal(didRedirect, false);
  assert.equal(replacedWith, null);
});

test('RedirectManager: does not redirect non-shorts or invalid URLs', () => {
  let replacedWith = null;
  global.window = {
    location: {
      replace: (url) => {
        replacedWith = url;
      }
    }
  };

  redirectManager.configure({ redirectShorts: true });

  assert.equal(redirectManager.handleUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'test'), false);
  assert.equal(redirectManager.handleUrl('https://www.youtube.com/feed/subscriptions', 'test'), false);
  assert.equal(redirectManager.handleUrl('https://www.youtube.com/shorts/invalid', 'test'), false);
  assert.equal(replacedWith, null);
});

test('RedirectManager: circuit breaker trips on excessive redirects to avoid loops', () => {
  global.window = {
    location: {
      replace: () => {}
    }
  };

  redirectManager.configure({ redirectShorts: true });
  redirectManager.redirectHistory = [];
  redirectManager.isCircuitBroken = false;
  redirectManager.lastRedirectedTarget = null;

  // Max hops allowed is 3 within interval
  for (let i = 0; i < LIMITS.MAX_HOPS_PER_INTERVAL; i++) {
    // Unique URLs
    const id = `video_${String(i).padStart(5, '0')}`;
    const result = redirectManager.handleUrl(`https://www.youtube.com/shorts/${id}`, 'test');
    assert.equal(result, true);
  }

  // Next one should trip circuit breaker
  const tripResult = redirectManager.handleUrl('https://www.youtube.com/shorts/12345678901', 'test');
  assert.equal(tripResult, false);
  assert.equal(redirectManager.isCircuitBroken, true);

  // Clean up timer
  if (redirectManager.circuitBreakerResetTimeout) {
    clearTimeout(redirectManager.circuitBreakerResetTimeout);
  }
});
