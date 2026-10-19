import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import {
  rewriteSingleLink,
  revertSingleLink,
  scanAndRewriteLinks,
  revertAllRewrittenLinks
} from '../src/content/link-rewriter.js';
import { ATTRIBUTES } from '../src/config/constants.js';

test('rewriteSingleLink: rewrites valid shorts href to watch URL and marks as processed', () => {
  const dom = new JSDOM('<!DOCTYPE html><html><body><a id="test-link" href="/shorts/dQw4w9WgXcQ">Short</a></body></html>');
  global.HTMLAnchorElement = dom.window.HTMLAnchorElement;

  const anchor = dom.window.document.getElementById('test-link');
  rewriteSingleLink(anchor);

  assert.equal(anchor.getAttribute('href'), '/watch?v=dQw4w9WgXcQ');
  assert.equal(anchor.getAttribute(ATTRIBUTES.PROCESSED_LINK), 'true');
  assert.equal(anchor.getAttribute(ATTRIBUTES.ORIGINAL_HREF), '/shorts/dQw4w9WgXcQ');
});

test('rewriteSingleLink: does not alter regular watch links or unrelated URLs', () => {
  const dom = new JSDOM(`
    <!DOCTYPE html><html><body>
      <a id="watch-link" href="/watch?v=dQw4w9WgXcQ">Watch</a>
      <a id="sub-link" href="/feed/subscriptions">Subs</a>
      <a id="post-link" href="/post/Ugkx-1234567890">Post</a>
    </body></html>
  `);
  global.HTMLAnchorElement = dom.window.HTMLAnchorElement;

  const watchLink = dom.window.document.getElementById('watch-link');
  const subLink = dom.window.document.getElementById('sub-link');
  const postLink = dom.window.document.getElementById('post-link');

  rewriteSingleLink(watchLink);
  rewriteSingleLink(subLink);
  rewriteSingleLink(postLink);

  assert.equal(watchLink.getAttribute('href'), '/watch?v=dQw4w9WgXcQ');
  assert.equal(watchLink.hasAttribute(ATTRIBUTES.PROCESSED_LINK), false);
  assert.equal(subLink.getAttribute('href'), '/feed/subscriptions');
  assert.equal(postLink.getAttribute('href'), '/post/Ugkx-1234567890');
});

test('revertSingleLink: properly restores original href', () => {
  const dom = new JSDOM('<!DOCTYPE html><html><body><a id="link" href="/shorts/dQw4w9WgXcQ">Short</a></body></html>');
  global.HTMLAnchorElement = dom.window.HTMLAnchorElement;

  const anchor = dom.window.document.getElementById('link');
  rewriteSingleLink(anchor);
  assert.equal(anchor.getAttribute('href'), '/watch?v=dQw4w9WgXcQ');

  revertSingleLink(anchor);
  assert.equal(anchor.getAttribute('href'), '/shorts/dQw4w9WgXcQ');
  assert.equal(anchor.hasAttribute(ATTRIBUTES.PROCESSED_LINK), false);
  assert.equal(anchor.hasAttribute(ATTRIBUTES.ORIGINAL_HREF), false);
});

test('scanAndRewriteLinks: batches across complex YouTube feed fragments', () => {
  const dom = new JSDOM(`
    <!DOCTYPE html>
    <html><body>
      <div id="feed">
        <div class="card"><a class="shorts-link" href="/shorts/dQw4w9WgXcQ?t=10s">Video 1</a></div>
        <div class="card"><a class="normal-link" href="/watch?v=9bZkp7q19f0">Video 2</a></div>
        <div class="card"><a class="shorts-link" href="/shorts/lYBUbBu4W08">Video 3</a></div>
      </div>
    </body></html>
  `);
  global.HTMLAnchorElement = dom.window.HTMLAnchorElement;

  const feed = dom.window.document.getElementById('feed');
  scanAndRewriteLinks(feed, { preserveTimestamp: true });

  const links = feed.querySelectorAll('a');
  assert.equal(links[0].getAttribute('href'), '/watch?v=dQw4w9WgXcQ&t=10s');
  assert.equal(links[1].getAttribute('href'), '/watch?v=9bZkp7q19f0');
  assert.equal(links[2].getAttribute('href'), '/watch?v=lYBUbBu4W08');

  // Test full revert
  revertAllRewrittenLinks(feed);
  assert.equal(links[0].getAttribute('href'), '/shorts/dQw4w9WgXcQ?t=10s');
  assert.equal(links[2].getAttribute('href'), '/shorts/lYBUbBu4W08');
});
