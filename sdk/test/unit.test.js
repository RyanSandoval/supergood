import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getPricing, getServices, submitFitCheck, mcpConfig, createClient, SupergoodError } from '../src/index.js';
import { run } from '../src/cli.js';

const json = (body, init = {}) =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' }, ...init });

function stub(...responses) {
  const calls = [];
  const fn = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    const next = responses.length > 1 ? responses.shift() : responses[0];
    return typeof next === 'function' ? next() : next.clone();
  };
  fn.calls = calls;
  return fn;
}

const BODY = { name: 'Ada', email: 'ada@example.com', handoff: 'A Monday report' };
const noSleep = async () => {};

test('getPricing and getServices parse JSON from the static host', async () => {
  const f = stub(json({ provider: 'x', offers: [] }));
  assert.deepEqual(await getPricing({ fetch: f }), { provider: 'x', offers: [] });
  assert.equal(f.calls[0].url, 'https://supergood.solutions/pricing.json');
  await getServices({ fetch: f, baseUrl: 'https://example.test/' });
  assert.equal(f.calls[1].url, 'https://example.test/services.json');
});

test('submitFitCheck defaults to the sandbox endpoint', async () => {
  const f = stub(json({ ok: true, sandbox: true, message: 'ok' }));
  const res = await submitFitCheck(BODY, { fetch: f });
  assert.equal(res.sandbox, true);
  assert.equal(f.calls[0].url, 'https://api.supergood.solutions/api/v1/sandbox/intake');
  assert.equal(JSON.parse(f.calls[0].init.body).company, '');
});

test('only sandbox:false reaches the real intake endpoint', async () => {
  for (const sandbox of [undefined, true, 'false', 0, null, 'no']) {
    const f = stub(json({ ok: true, sandbox: true, message: 'ok' }));
    await submitFitCheck(BODY, { fetch: f, sandbox });
    assert.match(f.calls[0].url, /\/api\/v1\/sandbox\/intake$/, `sandbox=${String(sandbox)} must stay in the sandbox`);
  }
  const f = stub(json({ ok: true }));
  await submitFitCheck(BODY, { fetch: f, sandbox: false });
  assert.equal(f.calls[0].url, 'https://api.supergood.solutions/api/v1/intake');
});

test('Idempotency-Key header is sent when provided and omitted otherwise', async () => {
  const f = stub(json({ ok: true, sandbox: true, message: 'ok' }));
  await submitFitCheck(BODY, { fetch: f, idempotencyKey: 'key-123' });
  assert.equal(f.calls[0].init.headers['idempotency-key'], 'key-123');
  await submitFitCheck(BODY, { fetch: f });
  assert.equal(f.calls[1].init.headers['idempotency-key'], undefined);
});

test('API error envelope becomes a SupergoodError with status, code, hint and request id', async () => {
  const envelope = { ok: false, error: 'email', message: 'Bad email', hint: 'Send a full address' };
  const f = stub(json(envelope, { status: 400, headers: { 'x-vercel-id': 'sfo1::abc' } }));
  await assert.rejects(submitFitCheck(BODY, { fetch: f }), (e) => {
    assert.ok(e instanceof SupergoodError);
    assert.equal(e.status, 400);
    assert.equal(e.code, 'email');
    assert.equal(e.hint, 'Send a full address');
    assert.deepEqual(e.body, envelope);
    assert.equal(e.requestId, 'sfo1::abc');
    return true;
  });
});

test('non-JSON error pages and network failures are typed too', async () => {
  const html = stub(new Response('<html>404</html>', { status: 404 }));
  await assert.rejects(getPricing({ fetch: html }), (e) => e.status === 404 && e.code === 'http_error' && e.body === null);
  const down = async () => { throw new Error('ECONNREFUSED'); };
  await assert.rejects(getPricing({ fetch: down }), (e) => e instanceof SupergoodError && e.code === 'network' && e.status === 0);
});

test('429 is retried once after Retry-After, then succeeds', async () => {
  const f = stub(
    json({ ok: false, error: 'rate_limited', message: 'slow', hint: 'wait' }, { status: 429, headers: { 'retry-after': '2' } }),
    json({ ok: true, sandbox: true, message: 'ok' }),
  );
  const waits = [];
  const res = await submitFitCheck(BODY, { fetch: f, sleep: async (ms) => waits.push(ms) });
  assert.equal(res.ok, true);
  assert.equal(f.calls.length, 2);
  assert.deepEqual(waits, [2000]);
});

test('429 retries at most once, then throws', async () => {
  const f = stub(json({ ok: false, error: 'rate_limited', message: 'slow', hint: 'wait' }, { status: 429, headers: { 'retry-after': '1' } }));
  await assert.rejects(submitFitCheck(BODY, { fetch: f, sleep: noSleep }), (e) => e.status === 429 && e.code === 'rate_limited' && e.retryAfter === 1);
  assert.equal(f.calls.length, 2);
});

test('429 with a Retry-After above the cap throws without waiting', async () => {
  const f = stub(json({ ok: false, error: 'rate_limited', message: 'slow', hint: 'wait' }, { status: 429, headers: { 'retry-after': '600' } }));
  await assert.rejects(submitFitCheck(BODY, { fetch: f, sleep: noSleep }), (e) => e.status === 429);
  assert.equal(f.calls.length, 1);
});

test('submitFitCheck rejects a non-object body', () => {
  assert.throws(() => submitFitCheck('hi'), TypeError);
});

test('mcpConfig describes the hosted server', () => {
  const cfg = mcpConfig();
  assert.equal(cfg.url, 'https://api.supergood.solutions/api/mcp');
  assert.equal(cfg.transport, 'streamable-http');
  assert.deepEqual(cfg.tools, ['get_pricing', 'get_services', 'submit_fit_check']);
  assert.equal(cfg.clientConfig.mcpServers.supergood.url, cfg.url);
  assert.equal(mcpConfig({ apiUrl: 'http://localhost:3000/' }).url, 'http://localhost:3000/api/mcp');
});

test('createClient binds default options', async () => {
  const f = stub(json({ ok: true, sandbox: true, message: 'ok' }));
  await createClient({ fetch: f, apiUrl: 'https://staging.test' }).submitFitCheck(BODY);
  assert.equal(f.calls[0].url, 'https://staging.test/api/v1/sandbox/intake');
});

// CLI

function cli(args, f) {
  let stdout = '';
  let stderr = '';
  return run(args, { fetch: f, sleep: noSleep, stdout: (s) => (stdout += s), stderr: (s) => (stderr += s) }).then((code) => ({ code, stdout, stderr }));
}

const PRICING = {
  provider: 'Supergood Solutions', url: 'https://supergood.solutions/pricing/', currency: 'USD', updated: '2026-01-01', tooling: 'Clients pay for tools.',
  offers: [
    { id: 'fit-check', name: 'Fit check', price: 0, unit: 'one-time', summary: 'Free.' },
    { id: 'build', name: 'Build', priceFrom: 4000, unit: 'workflow', summary: 'Per workflow.' },
  ],
};

test('cli pricing prints a table, --json prints raw JSON', async () => {
  const human = await cli(['pricing'], stub(json(PRICING)));
  assert.equal(human.code, 0);
  assert.match(human.stdout, /Fit check\s+Free\s+one-time/);
  assert.match(human.stdout, /Build\s+from \$4,000\s+workflow/);
  const machine = await cli(['pricing', '--json'], stub(json(PRICING)));
  assert.deepEqual(JSON.parse(machine.stdout), PRICING);
});

test('cli fit-check is a sandbox dry run by default and never warns', async () => {
  const f = stub(json({ ok: true, sandbox: true, message: 'Validated.' }));
  const r = await cli(['fit-check', '--name', 'Ada', '--email', 'ada@example.com', '--message', 'Report'], f);
  assert.equal(r.code, 0);
  assert.match(f.calls[0].url, /\/api\/v1\/sandbox\/intake$/);
  assert.equal(r.stderr, '');
  assert.match(r.stdout, /Sandbox OK/);
  const sent = JSON.parse(f.calls[0].init.body);
  assert.equal(sent.handoff, 'Report');
});

test('cli --sandbox is explicit and still hits the sandbox', async () => {
  const f = stub(json({ ok: true, sandbox: true, message: 'ok' }));
  await cli(['fit-check', '--sandbox', '--name', 'A', '--email', 'a@b.co', '--message', 'm'], f);
  assert.match(f.calls[0].url, /sandbox\/intake$/);
});

test('cli --live is the only way to the real endpoint and prints a one-line warning', async () => {
  const f = stub(json({ ok: true }));
  const r = await cli(['fit-check', '--live', '--name', 'A', '--email', 'a@b.co', '--message', 'm'], f);
  assert.equal(r.code, 0);
  assert.equal(f.calls[0].url, 'https://api.supergood.solutions/api/v1/intake');
  assert.match(r.stderr, /^WARNING: --live sends a real email to Ryan/);
  assert.equal(r.stderr.trim().split('\n').length, 1);
  assert.ok(f.calls[0].init.headers['idempotency-key'], 'live runs always send an Idempotency-Key');
});

test('cli --live with --sandbox is a usage error and sends nothing', async () => {
  const f = stub(json({ ok: true }));
  const r = await cli(['fit-check', '--live', '--sandbox', '--name', 'A', '--email', 'a@b.co', '--message', 'm'], f);
  assert.equal(r.code, 1);
  assert.equal(f.calls.length, 0);
});

test('cli usage errors exit 1 and send nothing', async () => {
  const f = stub(json({ ok: true }));
  assert.equal((await cli(['fit-check', '--name', 'A'], f)).code, 1);
  assert.equal((await cli(['nope'], f)).code, 1);
  assert.equal((await cli(['--bogus'], f)).code, 1);
  assert.equal((await cli([], f)).code, 1);
  assert.equal(f.calls.length, 0);
});

test('cli API errors exit 2 and show hint and request id', async () => {
  const f = stub(json({ ok: false, error: 'email', message: 'Bad email', hint: 'Fix it' }, { status: 400, headers: { 'x-vercel-id': 'req-1' } }));
  const r = await cli(['fit-check', '--name', 'A', '--email', 'nope', '--message', 'm'], f);
  assert.equal(r.code, 2);
  assert.match(r.stderr, /Error 400 \(email\): Bad email/);
  assert.match(r.stderr, /Hint: Fix it/);
  assert.match(r.stderr, /Request id: req-1/);
});

test('cli --help and --version exit 0 and --help has no em dashes', async () => {
  const h = await cli(['--help']);
  assert.equal(h.code, 0);
  assert.ok(!h.stdout.includes('—'));
  assert.match(h.stdout, /--live/);
  const v = await cli(['--version']);
  assert.match(v.stdout, /^0\.1\.0$/m);
});

test('cli mcp prints url, tools and a JSON snippet', async () => {
  const r = await cli(['mcp']);
  assert.equal(r.code, 0);
  assert.match(r.stdout, /https:\/\/api\.supergood\.solutions\/api\/mcp/);
  assert.match(r.stdout, /get_pricing, get_services, submit_fit_check/);
});
