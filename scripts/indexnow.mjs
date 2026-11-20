#!/usr/bin/env node
// Notify IndexNow about pages on https://supergood.solutions.
//
//   node scripts/indexnow.mjs              # URLs for index.html files in the latest push
//   node scripts/indexnow.mjs --all        # every URL in sitemap.xml
//   node scripts/indexnow.mjs --wait       # after a production deploy, then submit the push
//   node scripts/indexnow.mjs --dry-run    # print the payload, do not POST
//
// The latest push is git diff of INDEXNOW_BEFORE..INDEXNOW_SHA (GitHub Actions
// sets these from the push event). Locally, with those unset, the range is
// HEAD^..HEAD. Changed */index.html paths become clean URLs with a trailing
// slash. Requests carry at most 10,000 URLs. IndexNow and network errors are
// logged and do not fail the process.

import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const HOST = 'supergood.solutions';
export const ORIGIN = `https://${HOST}`;
export const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';
export const MAX_URLS_PER_REQUEST = 10000;
const WAIT_MS = 10 * 60 * 1000;
const POLL_MS = 15 * 1000;
const EMPTY_TREE = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function findKey(dir = root) {
  const names = readdirSync(dir)
    .filter((name) => /^[0-9a-f]{32}\.txt$/i.test(name))
    .sort();
  const keys = [];
  for (const name of names) {
    const key = name.slice(0, -4);
    const body = readFileSync(path.join(dir, name), 'utf8').trim();
    if (body === key) keys.push(key);
  }
  if (keys.length !== 1) {
    throw new Error(`Expected one IndexNow key file at the site root, found ${keys.length}`);
  }
  return keys[0];
}

export function indexHtmlPathToUrl(filePath) {
  if (typeof filePath !== 'string' || filePath.length === 0) return null;
  const normalized = filePath.replaceAll('\\', '/').replace(/^\.\//, '');
  if (normalized.startsWith('/') || normalized.includes('\0')) return null;
  const parts = normalized.split('/');
  if (parts.some((part) => part === '' || part === '.' || part === '..')) return null;
  if (normalized === 'index.html') return `${ORIGIN}/`;
  if (!normalized.endsWith('/index.html')) return null;
  return `${ORIGIN}/${normalized.slice(0, -'index.html'.length)}`;
}

export function isSiteUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === HOST;
  } catch {
    return false;
  }
}

function unquoteGitPath(value) {
  if (value.startsWith('"') && value.endsWith('"')) {
    try {
      return JSON.parse(value);
    } catch {
      return value.slice(1, -1);
    }
  }
  return value;
}

// `text` is `git diff --name-status` output. Renames contribute both paths.
// `live` is false for deletions (and the old path of a rename).
export function pagesFromNameStatus(text) {
  const pages = [];
  const seen = new Set();
  for (const line of text.split(/\r?\n/)) {
    if (!line) continue;
    const parts = line.split('\t');
    const status = parts[0] ?? '';
    const rawPaths = /^[RC]/i.test(status) ? parts.slice(1) : parts.slice(1, 2);
    rawPaths.forEach((raw, index) => {
      const url = indexHtmlPathToUrl(unquoteGitPath(raw));
      if (!url || seen.has(url)) return;
      seen.add(url);
      const deleted = status.startsWith('D') || (status.startsWith('R') && index === 0);
      pages.push({ url, live: !deleted });
    });
  }
  return pages;
}

export function sitemapUrls(xml) {
  const urls = [];
  const seen = new Set();
  for (const match of xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)) {
    const url = match[1].trim();
    if (!isSiteUrl(url) || seen.has(url)) continue;
    seen.add(url);
    urls.push(url);
  }
  return urls;
}

export function chunk(list, size = MAX_URLS_PER_REQUEST) {
  if (size < 1) throw new Error('chunk size must be at least 1');
  const batches = [];
  for (let i = 0; i < list.length; i += size) batches.push(list.slice(i, i + size));
  return batches;
}

function git(args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' });
}

function pushRange() {
  const before = process.env.INDEXNOW_BEFORE || '';
  const sha = process.env.INDEXNOW_SHA || 'HEAD';
  if (/^0+$/.test(before)) return [EMPTY_TREE, sha];
  if (before) return [before, sha];
  return ['HEAD^', sha];
}

export function changedPages() {
  const [before, sha] = pushRange();
  let text = '';
  try {
    text = git([
      'diff',
      '--name-status',
      '--find-renames',
      '--diff-filter=ACMRD',
      before,
      sha,
    ]);
  } catch (err) {
    console.log(`Could not diff ${before}..${sha}: ${err.message}`);
    return [];
  }
  console.log(`IndexNow diff ${before}..${sha}`);
  return pagesFromNameStatus(text);
}

function urlsToSubmit(all) {
  if (all) {
    const xml = readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
    return sitemapUrls(xml);
  }
  return changedPages().map((page) => page.url);
}

function ghHeaders(token) {
  return {
    accept: 'application/vnd.github+json',
    authorization: `Bearer ${token}`,
    'x-github-api-version': '2022-11-28',
    'user-agent': 'supergood-indexnow',
  };
}

async function productionState(repo, sha, token) {
  const listUrl = `https://api.github.com/repos/${repo}/deployments?sha=${encodeURIComponent(sha)}&per_page=20`;
  const listed = await fetch(listUrl, { headers: ghHeaders(token), signal: AbortSignal.timeout(20000) });
  if (!listed.ok) {
    const detail = (await listed.text()).slice(0, 300);
    return { kind: 'unknown', detail: `deployments API HTTP ${listed.status} ${detail}` };
  }
  const deployments = await listed.json();
  const production = (Array.isArray(deployments) ? deployments : []).filter((item) => {
    const environment = String(item.environment || '').toLowerCase();
    return environment === 'github-pages' || environment === 'production';
  });
  if (production.length === 0) return { kind: 'pending' };

  let pending = false;
  let failure = false;
  for (const deployment of production) {
    const statusRes = await fetch(deployment.statuses_url, {
      headers: ghHeaders(token),
      signal: AbortSignal.timeout(20000),
    });
    if (!statusRes.ok) {
      return { kind: 'unknown', detail: `deployment statuses HTTP ${statusRes.status}` };
    }
    const statuses = await statusRes.json();
    const state = String(statuses[0]?.state || 'pending');
    if (state === 'success') {
      return { kind: 'success', environment: deployment.environment, id: deployment.id };
    }
    if (state === 'failure' || state === 'error') failure = true;
    else pending = true;
  }
  if (pending) return { kind: 'pending' };
  if (failure) return { kind: 'failure' };
  return { kind: 'pending' };
}

async function fetchStatus(url) {
  try {
    return await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(20000) });
  } catch (err) {
    console.log(`Fetch failed for ${url}: ${err.message}`);
    return null;
  }
}

async function keyFileReady(key) {
  const keyUrl = `${ORIGIN}/${key}.txt`;
  const res = await fetchStatus(keyUrl);
  if (!res) return false;
  if (res.status >= 300 && res.status < 400) {
    console.log(`Key file redirected HTTP ${res.status} to ${res.headers.get('location') || '(no location)'}`);
    return false;
  }
  const body = (await res.text()).trim();
  if (res.status !== 200 || body !== key) {
    console.log(`Key file not ready: HTTP ${res.status}`);
    return false;
  }
  console.log(`Key file OK ${keyUrl}`);
  return true;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Resolves true when it is reasonable to submit. False means skip the POST
// (deployment failed, or the key file never became reachable).
export async function waitForProduction(key, liveUrls) {
  const deadline = Date.now() + WAIT_MS;
  const repo = process.env.GITHUB_REPOSITORY || '';
  const sha = process.env.INDEXNOW_SHA || process.env.GITHUB_SHA || '';
  const token = process.env.GITHUB_TOKEN || '';

  if (repo && sha && token) {
    console.log(`Waiting for the production deployment of ${sha}`);
    let deployState = 'pending';
    while (Date.now() < deadline) {
      let state;
      try {
        state = await productionState(repo, sha, token);
      } catch (err) {
        console.log(`Deployment status check failed: ${err.message}`);
        state = { kind: 'unknown', detail: err.message };
      }
      if (state.kind === 'success') {
        console.log(`Production deployment ${state.id} (${state.environment}) succeeded`);
        deployState = 'success';
        break;
      }
      if (state.kind === 'failure') {
        console.log('Production deployment failed. Skipping IndexNow.');
        return false;
      }
      if (state.kind === 'unknown') {
        console.log(`Could not read deployment status (${state.detail}). Waiting on the public URLs only.`);
        deployState = 'unknown';
        break;
      }
      console.log('Production deployment not ready yet');
      await sleep(Math.min(POLL_MS, Math.max(0, deadline - Date.now())));
    }
    if (deployState === 'pending') {
      console.log('Timed out waiting for the production deployment. Checking the key file anyway.');
    }
  } else {
    console.log('No GitHub deployment context. Waiting on the public key file.');
  }

  let keyReady = await keyFileReady(key);
  while (!keyReady && Date.now() < deadline) {
    await sleep(Math.min(POLL_MS, Math.max(0, deadline - Date.now())));
    keyReady = await keyFileReady(key);
  }
  if (!keyReady) {
    console.log('Key file did not return 200 with the key. Skipping IndexNow.');
    return false;
  }

  for (const url of liveUrls) {
    let ready = false;
    while (Date.now() < deadline) {
      const res = await fetchStatus(url);
      if (res && res.status === 200) {
        console.log(`Changed URL OK ${url}`);
        ready = true;
        await res.text().catch(() => {});
        break;
      }
      console.log(`Changed URL not ready: ${url} HTTP ${res ? res.status : 'error'}`);
      if (res) await res.text().catch(() => {});
      await sleep(Math.min(POLL_MS, Math.max(0, deadline - Date.now())));
    }
    if (!ready) console.log(`Timed out waiting for ${url}. Submitting anyway.`);
  }
  return true;
}

async function postBatch(payload) {
  try {
    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000),
    });
    const body = await res.text();
    console.log(`IndexNow HTTP ${res.status}`);
    if (body) console.log(body.slice(0, 4000));
    return res.status;
  } catch (err) {
    console.log(`IndexNow request failed: ${err.message}`);
    return 0;
  }
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const all = args.has('--all');
  const wait = args.has('--wait');
  const dryRun = args.has('--dry-run');

  let key;
  try {
    key = findKey();
  } catch (err) {
    console.log(err.message);
    return;
  }

  const pages = all ? [] : changedPages();
  const urls = (all ? urlsToSubmit(true) : pages.map((page) => page.url)).filter(isSiteUrl);
  if (wait) {
    const liveUrls = pages.filter((page) => page.live).map((page) => page.url);
    const ready = await waitForProduction(key, all ? [] : liveUrls);
    if (!ready) return;
  }

  if (urls.length === 0) {
    console.log(all ? 'Sitemap listed no URLs. Nothing to submit.' : 'No changed index.html URLs. Nothing to submit.');
    return;
  }

  const batches = chunk(urls);
  console.log(
    `${dryRun ? 'Dry run' : 'Submitting'} ${urls.length} URL${urls.length === 1 ? '' : 's'} ` +
      `in ${batches.length} request${batches.length === 1 ? '' : 's'} ` +
      `(${ORIGIN}/${key}.txt)`,
  );
  if (urls.length <= 30) {
    for (const url of urls) console.log(`  ${url}`);
  }

  if (dryRun) return;

  for (let i = 0; i < batches.length; i += 1) {
    if (batches.length > 1) console.log(`Batch ${i + 1}/${batches.length} (${batches[i].length} URLs)`);
    await postBatch({
      host: HOST,
      key,
      keyLocation: `${ORIGIN}/${key}.txt`,
      urlList: batches[i],
    });
  }
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (invokedDirectly) {
  main()
    .catch((err) => {
      console.log(`IndexNow failed: ${err instanceof Error ? err.message : String(err)}`);
    })
    .finally(() => {
      process.exitCode = 0;
    });
}
