// Live tests. Read-only GETs plus ONE call to the sandbox, which never sends mail.
// Nothing here may reach /api/v1/intake. Set SUPERGOOD_OFFLINE=1 to skip.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getPricing, getServices, submitFitCheck } from '../src/index.js';

const skip = process.env.SUPERGOOD_OFFLINE === '1' ? 'SUPERGOOD_OFFLINE=1' : false;

test('live: getPricing and getServices return the documented shape', { skip }, async () => {
  const pricing = await getPricing();
  assert.equal(typeof pricing.provider, 'string');
  assert.equal(pricing.currency, 'USD');
  assert.match(pricing.updated, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(Array.isArray(pricing.offers) && pricing.offers.length > 0);
  for (const o of pricing.offers) {
    for (const k of ['id', 'name', 'unit', 'summary']) assert.equal(typeof o[k], 'string', `offer.${k}`);
    assert.ok(typeof o.price === 'number' || typeof o.priceFrom === 'number');
  }
  assert.ok(pricing.offers.some((o) => o.id === 'quick-scan'));

  const services = await getServices();
  assert.equal(typeof services.provider, 'string');
  assert.ok(Array.isArray(services.services) && services.services.length > 0);
  for (const s of services.services) {
    for (const k of ['id', 'name', 'url', 'summary']) assert.equal(typeof s[k], 'string', `service.${k}`);
  }
});

test('live: one sandbox fit check validates and sends nothing', { skip }, async () => {
  const res = await submitFitCheck(
    { name: 'SDK Test', email: 'sdk-test@example.com', handoff: 'Automated sandbox check from the supergood-solutions test suite.', paysForTools: 'Yes' },
    { sandbox: true },
  );
  assert.equal(res.ok, true);
  assert.equal(res.sandbox, true);
});
