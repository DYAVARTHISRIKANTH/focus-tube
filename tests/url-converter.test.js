import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidVideoId,
  extractShortsVideoId,
  isShortsUrl,
  convertShortsToWatchUrl
} from '../src/content/url-converter.js';

test('isValidVideoId: validates authentic 11-char YouTube video IDs', () => {
  // Standard valid IDs
  assert.equal(isValidVideoId('dQw4w9WgXcQ'), true);
  assert.equal(isValidVideoId('12345678901'), true);
  assert.equal(isValidVideoId('_-AbCdEfG12'), true);
  assert.equal(isValidVideoId('a-b_c-d_e12'), true);

  // Invalid lengths
  assert.equal(isValidVideoId('short'), false);
  assert.equal(isValidVideoId('1234567890'), false); // 10 chars
  assert.equal(isValidVideoId('123456789012'), false); // 12 chars
  assert.equal(isValidVideoId(''), false);

  // Invalid characters
  assert.equal(isValidVideoId('dQw4w9WgXc!'), false);
  assert.equal(isValidVideoId('dQw4w9 WgXc'), false);
  assert.equal(isValidVideoId('dQw4w9WgXc?'), false);

  // Non-string types
  assert.equal(isValidVideoId(null), false);
  assert.equal(isValidVideoId(undefined), false);
  assert.equal(isValidVideoId(12345678901), false);
});

test('extractShortsVideoId: extracts valid 11-char ID from various Shorts formats', () => {
  assert.equal(
    extractShortsVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ'),
    'dQw4w9WgXcQ'
  );
  assert.equal(
    extractShortsVideoId('https://youtube.com/shorts/dQw4w9WgXcQ'),
    'dQw4w9WgXcQ'
  );
  assert.equal(
    extractShortsVideoId('https://m.youtube.com/shorts/dQw4w9WgXcQ'),
    'dQw4w9WgXcQ'
  );
  assert.equal(
    extractShortsVideoId('/shorts/dQw4w9WgXcQ'),
    'dQw4w9WgXcQ'
  );
  assert.equal(
    extractShortsVideoId('/shorts/dQw4w9WgXcQ/'),
    'dQw4w9WgXcQ'
  );
  assert.equal(
    extractShortsVideoId('/shorts/dQw4w9WgXcQ?feature=share'),
    'dQw4w9WgXcQ'
  );
});

test('extractShortsVideoId: rejects non-shorts or invalid URLs', () => {
  assert.equal(extractShortsVideoId('https://www.youtube.com/shorts'), null);
  assert.equal(extractShortsVideoId('https://www.youtube.com/shorts/'), null);
  assert.equal(extractShortsVideoId('https://www.youtube.com/shorts/invalidId'), null);
  assert.equal(extractShortsVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), null);
  assert.equal(extractShortsVideoId('https://www.youtube.com/results?search_query=shorts'), null);
  assert.equal(extractShortsVideoId('https://www.google.com/shorts/dQw4w9WgXcQ'), null);
  assert.equal(extractShortsVideoId('https://www.youtube.com/post/Ugkx-1234567890'), null);
  assert.equal(extractShortsVideoId(''), null);
  assert.equal(extractShortsVideoId(null), null);
});

test('convertShortsToWatchUrl: converts absolute URLs to regular player', () => {
  const result = convertShortsToWatchUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ');
  assert.equal(result, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
});

test('convertShortsToWatchUrl: converts relative URLs preserving relative format', () => {
  const result = convertShortsToWatchUrl('/shorts/dQw4w9WgXcQ');
  assert.equal(result, '/watch?v=dQw4w9WgXcQ');
});

test('convertShortsToWatchUrl: preserves timestamps when enabled', () => {
  const withT = convertShortsToWatchUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ?t=35s&feature=share');
  assert.equal(withT, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=35s');

  const withContinue = convertShortsToWatchUrl('/shorts/dQw4w9WgXcQ?time_continue=42');
  assert.equal(withContinue, '/watch?v=dQw4w9WgXcQ&t=42');

  const disabled = convertShortsToWatchUrl('/shorts/dQw4w9WgXcQ?t=35s', { preserveTimestamp: false });
  assert.equal(disabled, '/watch?v=dQw4w9WgXcQ');
});

test('convertShortsToWatchUrl: preserves playlist parameters', () => {
  const result = convertShortsToWatchUrl('/shorts/dQw4w9WgXcQ?list=PL12345&index=3&feature=share');
  assert.equal(result, '/watch?v=dQw4w9WgXcQ&list=PL12345&index=3');
});

test('convertShortsToWatchUrl: preserves hash anchors', () => {
  const result = convertShortsToWatchUrl('/shorts/dQw4w9WgXcQ#comments');
  assert.equal(result, '/watch?v=dQw4w9WgXcQ#comments');
});

test('convertShortsToWatchUrl: returns null for invalid or non-shorts inputs', () => {
  assert.equal(convertShortsToWatchUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), null);
  assert.equal(convertShortsToWatchUrl('/watch?v=dQw4w9WgXcQ'), null);
  assert.equal(convertShortsToWatchUrl('/shorts/not11chars'), null);
  assert.equal(convertShortsToWatchUrl('/shorts/'), null);
  assert.equal(convertShortsToWatchUrl(''), null);
});
