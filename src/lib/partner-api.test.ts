import assert from 'node:assert/strict';
import test from 'node:test';
import {
  authenticatePartnerApi,
  parsePositiveInteger,
  readPartnerApiKey,
  resetPartnerApiRateLimitsForTests,
} from './partner-api';
import { createSongSchema, titleToApiSlug, updateSongSchema } from './partner-api-songs';

test('accepts Bearer and X-API-Key authentication for configured partners', () => {
  resetPartnerApiRateLimitsForTests();
  const environment = { CANTOLICO_API_KEY: 'hermes-secret' };

  const bearer = authenticatePartnerApi(new Headers({ authorization: 'Bearer hermes-secret' }), environment);
  const header = authenticatePartnerApi(new Headers({ 'x-api-key': 'hermes-secret' }), environment);

  assert.equal(bearer.ok, true);
  assert.equal(header.ok, true);
});

test('does not enable the partner API without a configured key', () => {
  resetPartnerApiRateLimitsForTests();
  const result = authenticatePartnerApi(new Headers({ 'x-api-key': 'anything' }), {});

  assert.deepEqual(result, { ok: false, code: 'api_not_configured', status: 503 });
});

test('rejects missing and invalid API keys', () => {
  resetPartnerApiRateLimitsForTests();
  const environment = { CANTOLICO_API_KEY: 'hermes-secret' };

  const missing = authenticatePartnerApi(new Headers(), environment);
  const invalid = authenticatePartnerApi(new Headers({ 'x-api-key': 'wrong' }), environment);
  assert.ok(!missing.ok);
  assert.ok(!invalid.ok);
  assert.equal(missing.code, 'authentication_required');
  assert.equal(invalid.code, 'invalid_api_key');
  assert.equal(readPartnerApiKey(new Headers({ authorization: 'Bearer ' })), null);
});

test('enforces a bounded per-key rate limit', () => {
  resetPartnerApiRateLimitsForTests();
  const environment = { CANTOLICO_API_KEY: 'hermes-secret', CANTOLICO_API_RATE_LIMIT: '2' };
  const headers = new Headers({ 'x-api-key': 'hermes-secret' });

  assert.equal(authenticatePartnerApi(headers, environment, 1_000).ok, true);
  assert.equal(authenticatePartnerApi(headers, environment, 1_001).ok, true);
  const blocked = authenticatePartnerApi(headers, environment, 1_002);
  assert.equal(blocked.ok, false);
  assert.equal(blocked.code, 'rate_limit_exceeded');
});

test('only parses positive bounded pagination values', () => {
  assert.equal(parsePositiveInteger(null, 20, 100), 20);
  assert.equal(parsePositiveInteger('100', 20, 100), 100);
  assert.equal(parsePositiveInteger('0', 20, 100), null);
  assert.equal(parsePositiveInteger('1.5', 20, 100), null);
  assert.equal(parsePositiveInteger('101', 20, 100), null);
});

test('enforces explicit write and delete scopes for administrative keys', () => {
  resetPartnerApiRateLimitsForTests();
  const environment = {
    CANTOLICO_API_KEYS: JSON.stringify([
      { name: 'hermes', key: 'read-token', scopes: ['songs:read'] },
      { name: 'admin', key: 'admin-token', scopes: ['songs:write', 'songs:delete'] },
    ]),
  };

  const readKey = authenticatePartnerApi(new Headers({ 'x-api-key': 'read-token' }), environment, 1_000, 'songs:write');
  const writeKey = authenticatePartnerApi(new Headers({ 'x-api-key': 'admin-token' }), environment, 1_000, 'songs:write');
  const deleteKey = authenticatePartnerApi(new Headers({ 'x-api-key': 'admin-token' }), environment, 1_000, 'songs:delete');

  assert.ok(!readKey.ok);
  assert.equal(readKey.code, 'insufficient_scope');
  assert.equal(writeKey.ok, true);
  assert.equal(deleteKey.ok, true);
});

test('rejects malformed scoped-key configuration instead of weakening access control', () => {
  resetPartnerApiRateLimitsForTests();
  const result = authenticatePartnerApi(
    new Headers({ 'x-api-key': 'anything' }),
    { CANTOLICO_API_KEYS: '[not-json' },
  );

  assert.deepEqual(result, { ok: false, code: 'api_misconfigured', status: 503 });
});

test('validates the administrative music contract and produces URL-safe slugs', () => {
  const created = createSongSchema.safeParse({
    title: 'Glória a Deus',
    type: 'ACORDES',
    main_instrument: 'GUITARRA',
    moments: ['GLORIA'],
    version: { source_text: '[G]Glória a Deus' },
  });
  const invalidUpdate = updateSongSchema.safeParse({ unexpected: true });

  assert.equal(created.success, true);
  assert.equal(invalidUpdate.success, false);
  assert.equal(titleToApiSlug(' Glória a Deus! '), 'gloria-a-deus');
});
