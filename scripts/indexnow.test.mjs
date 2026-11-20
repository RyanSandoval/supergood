import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  MAX_URLS_PER_REQUEST,
  chunk,
  findKey,
  indexHtmlPathToUrl,
  isSiteUrl,
  pagesFromNameStatus,
  sitemapUrls,
} from './indexnow.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('maps index.html paths to clean trailing-slash URLs', () => {
  assert.equal(indexHtmlPathToUrl('index.html'), 'https://supergood.solutions/');
  assert.equal(
    indexHtmlPathToUrl('blog/build-an-agent-that-doubts-your-other-agent/index.html'),
    'https://supergood.solutions/blog/build-an-agent-that-doubts-your-other-agent/',
  );
  assert.equal(indexHtmlPathToUrl('pricing/index.html'), 'https://supergood.solutions/pricing/');
  assert.equal(indexHtmlPathToUrl('./blog/foo/index.html'), 'https://supergood.solutions/blog/foo/');
});

test('ignores files that are not page indexes', () => {
  assert.equal(indexHtmlPathToUrl('blog/foo/hero.jpg'), null);
  assert.equal(indexHtmlPathToUrl('blog/foo/index.md'), null);
  assert.equal(indexHtmlPathToUrl('scripts/indexnow.mjs'), null);
  assert.equal(indexHtmlPathToUrl('../index.html'), null);
  assert.equal(indexHtmlPathToUrl('/index.html'), null);
  assert.equal(indexHtmlPathToUrl('blog//index.html'), null);
});

test('reads added, modified, deleted, and renamed index.html files from git name-status', () => {
  const pages = pagesFromNameStatus([
    'A\tblog/new-post/index.html',
    'M\tblog/index.html',
    'M\tblog/new-post/hero.jpg',
    'D\told-page/index.html',
    'R100\tblog/old-slug/index.html\tblog/new-slug/index.html',
    'M\tindex.html',
  ].join('\n'));

  assert.deepEqual(pages, [
    { url: 'https://supergood.solutions/blog/new-post/', live: true },
    { url: 'https://supergood.solutions/blog/', live: true },
    { url: 'https://supergood.solutions/old-page/', live: false },
    { url: 'https://supergood.solutions/blog/old-slug/', live: false },
    { url: 'https://supergood.solutions/blog/new-slug/', live: true },
    { url: 'https://supergood.solutions/', live: true },
  ]);
});

test('parses sitemap locs on this host and drops anything else', () => {
  const urls = sitemapUrls(`<?xml version="1.0"?>
    <urlset>
      <loc>https://supergood.solutions/</loc>
      <loc>https://supergood.solutions/blog/example/</loc>
      <loc>https://example.com/nope/</loc>
      <loc>https://supergood.solutions/blog/example/</loc>
    </urlset>`);
  assert.deepEqual(urls, [
    'https://supergood.solutions/',
    'https://supergood.solutions/blog/example/',
  ]);
});

test('chunks url lists at 10,000', () => {
  const urls = Array.from({ length: 10001 }, (_, i) => `https://supergood.solutions/p/${i}/`);
  const batches = chunk(urls);
  assert.equal(batches.length, 2);
  assert.equal(batches[0].length, MAX_URLS_PER_REQUEST);
  assert.equal(batches[1].length, 1);
  assert.equal(chunk([]).length, 0);
});

test('accepts only https URLs on the site host', () => {
  assert.equal(isSiteUrl('https://supergood.solutions/blog/'), true);
  assert.equal(isSiteUrl('http://supergood.solutions/blog/'), false);
  assert.equal(isSiteUrl('https://www.supergood.solutions/blog/'), false);
  assert.equal(isSiteUrl('not a url'), false);
});

test('finds a root key file whose body is the key', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'indexnow-'));
  const key = '0123456789abcdef0123456789abcdef';
  writeFileSync(path.join(dir, `${key}.txt`), `${key}\n`);
  writeFileSync(path.join(dir, 'notes.txt'), '0123456789abcdef0123456789abcdef');
  assert.equal(findKey(dir), key);
});

test('the committed key file and sitemap are usable', () => {
  const key = findKey(root);
  assert.match(key, /^[0-9a-f]{32}$/);
  const urls = sitemapUrls(readFileSync(path.join(root, 'sitemap.xml'), 'utf8'));
  assert.ok(urls.length > 100);
  assert.ok(urls.includes('https://supergood.solutions/'));
  assert.ok(urls.every((url) => url.startsWith('https://supergood.solutions/')));
});
