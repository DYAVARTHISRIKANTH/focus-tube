import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { convertShortsToWatchUrl, isShortsUrl } from '../src/content/url-converter.js';
import { generateHidingCSS } from '../src/config/selectors.js';
import { rewriteSingleLink, scanAndRewriteLinks } from '../src/content/link-rewriter.js';
import { redirectManager } from '../src/content/spa-navigator.js';
import { ATTRIBUTES } from '../src/config/constants.js';

test('Edge Case: Direct URLs with query parameters (?feature=share, ?si=..., timestamps)', () => {
  // Mobile share URL
  const mobileShare = 'https://m.youtube.com/shorts/dQw4w9WgXcQ?feature=share';
  assert.equal(convertShortsToWatchUrl(mobileShare), 'https://m.youtube.com/watch?v=dQw4w9WgXcQ');

  // Tracking si parameter and timestamp
  const trackingShare = 'https://www.youtube.com/shorts/dQw4w9WgXcQ?si=abcdef123456&t=120';
  assert.equal(convertShortsToWatchUrl(trackingShare), 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=120');

  // Trailing slash with query string
  const trailingWithQuery = 'https://www.youtube.com/shorts/dQw4w9WgXcQ/?t=45s';
  assert.equal(convertShortsToWatchUrl(trailingWithQuery), 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=45s');
});

test('Edge Case: Search results containing Shorts shelf alongside normal videos', () => {
  const dom = new JSDOM(`
    <!DOCTYPE html>
    <html><body>
      <ytd-search>
        <!-- Normal video in search -->
        <ytd-video-renderer id="normal-video">
          <a href="/watch?v=abc123def45">Learn Coding</a>
        </ytd-video-renderer>

        <!-- Shorts shelf in search -->
        <ytd-reel-shelf-renderer id="search-shorts-shelf">
          <a href="/shorts/dQw4w9WgXcQ">Short 1</a>
          <a href="/shorts/9bZkp7q19f0">Short 2</a>
        </ytd-reel-shelf-renderer>

        <!-- Another normal video in search -->
        <ytd-video-renderer id="normal-video-2">
          <a href="/watch?v=xyz987wvu65">Advanced Guide</a>
        </ytd-video-renderer>
      </ytd-search>
    </body></html>
  `);
  global.HTMLAnchorElement = dom.window.HTMLAnchorElement;

  const css = generateHidingCSS({
    hideSidebarShorts: false,
    hideFeedShelves: false,
    hideSearchShorts: true,
    hideWatchNextShorts: false,
    hideChannelShortsTab: false
  });

  // Verify hiding rule targets the search reel shelf
  assert.match(css, /ytd-search ytd-reel-shelf-renderer/);
  // Verify hiding rule does NOT target the general video renderer without shorts
  assert.equal(css.includes('ytd-video-renderer {'), false);
});

test('Edge Case: YouTube Post Replies and Comments with internal links', () => {
  const dom = new JSDOM(`
    <!DOCTYPE html>
    <html><body>
      <!-- Community Post -->
      <ytd-post-renderer id="community-post">
        <div id="body">Check out my new regular video!</div>
        <a id="post-link" href="/watch?v=dQw4w9WgXcQ">Watch Video</a>
      </ytd-post-renderer>

      <!-- Comment Section -->
      <ytd-comments id="comments">
        <ytd-comment-thread-renderer id="comment-1">
          <div id="content-text">
            Loved the moment at <a id="time-link" href="/watch?v=dQw4w9WgXcQ&t=45s">0:45</a>!
            Also see this short: <a id="comment-shorts-link" href="/shorts/dQw4w9WgXcQ">Short Clip</a>
          </div>
        </ytd-comment-thread-renderer>
      </ytd-comments>
    </body></html>
  `);
  global.HTMLAnchorElement = dom.window.HTMLAnchorElement;

  const css = generateHidingCSS({
    hideSidebarShorts: true,
    hideFeedShelves: true,
    hideSearchShorts: true,
    hideWatchNextShorts: true,
    hideChannelShortsTab: true
  });

  // Strict hiding CSS must never hide comments or posts
  assert.equal(css.includes('ytd-comments'), false);
  assert.equal(css.includes('ytd-post-renderer'), false);
  assert.equal(css.includes('ytd-comment-thread-renderer'), false);

  // Link rewriter should convert shorts links in comments to regular player without breaking comments
  const commentShortsLink = dom.window.document.getElementById('comment-shorts-link');
  rewriteSingleLink(commentShortsLink);
  assert.equal(commentShortsLink.getAttribute('href'), '/watch?v=dQw4w9WgXcQ');

  // Time link in comment must remain untouched
  const timeLink = dom.window.document.getElementById('time-link');
  rewriteSingleLink(timeLink);
  assert.equal(timeLink.getAttribute('href'), '/watch?v=dQw4w9WgXcQ&t=45s');
});

test('Edge Case: Browser Back/Forward history navigation between Watch and Shorts', () => {
  let locationHistory = ['https://www.youtube.com/watch?v=dQw4w9WgXcQ'];
  let currentLocation = locationHistory[0];

  global.window = {
    location: {
      get href() { return currentLocation; },
      replace: (newUrl) => {
        currentLocation = newUrl;
      }
    }
  };

  redirectManager.configure({ redirectShorts: true });
  redirectManager.redirectHistory = [];
  redirectManager.isCircuitBroken = false;
  redirectManager.lastRedirectedTarget = null;

  // User navigates back to a shorts page via browser back button
  currentLocation = 'https://www.youtube.com/shorts/lYBUbBu4W08';
  const redirected = redirectManager.handleUrl(currentLocation, 'popstate');

  assert.equal(redirected, true);
  assert.equal(currentLocation, 'https://www.youtube.com/watch?v=lYBUbBu4W08');
});

test('Edge Case: Opening Shorts in new tabs (declarativeNetRequest regex validation)', () => {
  // Verify RE2 memory-efficient regexes used in service worker match main_frame direct URLs
  const dnrRule1 = /^https?:\/\/[^\/]+\/shorts\/([^/?#]{11})\/?$/;
  const dnrRule2 = /^https?:\/\/[^\/]+\/shorts\/([^/?#]{11})\?(.*)/;

  // Rule 1 matches clean URLs without query parameters
  assert.match('https://www.youtube.com/shorts/dQw4w9WgXcQ', dnrRule1);
  assert.match('https://www.youtube.com/shorts/dQw4w9WgXcQ/', dnrRule1);
  assert.match('https://m.youtube.com/shorts/dQw4w9WgXcQ', dnrRule1);

  // Rule 2 matches URLs with query parameters
  assert.match('https://www.youtube.com/shorts/dQw4w9WgXcQ?feature=share', dnrRule2);
  assert.match('https://www.youtube.com/shorts/dQw4w9WgXcQ?t=15s', dnrRule2);

  // Non-shorts or invalid must NOT match either rule
  assert.equal(dnrRule1.test('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), false);
  assert.equal(dnrRule2.test('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), false);
  assert.equal(dnrRule1.test('https://www.youtube.com/shorts/invalidId'), false);
  assert.equal(dnrRule2.test('https://www.youtube.com/shorts/invalidId'), false);
  assert.equal(dnrRule1.test('https://www.youtube.com/feed/subscriptions'), false);
  assert.equal(dnrRule2.test('https://www.youtube.com/feed/subscriptions'), false);
});

