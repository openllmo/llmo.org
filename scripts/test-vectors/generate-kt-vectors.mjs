#!/usr/bin/env node
// Generator for LIP-4 Key Transparency test vectors. Produces one
// positive vector per signature algorithm (ES256, ES384, EdDSA) and
// one negative vector per defined error code from the implementer
// spec at /spec/v0.1/kt-registry-endpoints/. Each vector is a JSON
// envelope naming what is being tested, the expected validator
// outcome, and the compact-JWS artifact under test.
//
// Vectors land in static/spec/v0.1/test-vectors/kt/.
//
// Pure Node built-ins (webcrypto, no external deps), matching the
// Pages Function implementation pattern. ECDSA signatures are
// non-deterministic; vectors are committed once and not regenerated
// in CI. Re-running this script regenerates the suite with fresh
// random signatures.
//
// Usage:
//   node scripts/test-vectors/generate-kt-vectors.mjs

import { writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { webcrypto } from 'node:crypto';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, '..', '..');
const VECTOR_DIR = resolve(ROOT, 'static/spec/v0.1/test-vectors/kt');

const ENTRY_TYP = 'llmo-kt-entry+jws';
const TEST_DOMAIN = 'example.com';
const TEST_KID = 'example-publisher-2026-01';
const NOW = '2026-05-12T22:00:00.000Z';

const subtle = webcrypto.subtle;

function b64uEncodeBytes(bytes) {
  return Buffer.from(bytes).toString('base64url');
}
function b64uEncodeString(s) {
  return Buffer.from(s, 'utf8').toString('base64url');
}

const ALG_PARAMS = {
  ES256: {
    keyAlgo: { name: 'ECDSA', namedCurve: 'P-256' },
    signAlgo: { name: 'ECDSA', hash: 'SHA-256' },
    publicJwkFromKey: (k) => ({ kty: 'EC', crv: 'P-256', x: k.x, y: k.y }),
  },
  ES384: {
    keyAlgo: { name: 'ECDSA', namedCurve: 'P-384' },
    signAlgo: { name: 'ECDSA', hash: 'SHA-384' },
    publicJwkFromKey: (k) => ({ kty: 'EC', crv: 'P-384', x: k.x, y: k.y }),
  },
  EdDSA: {
    keyAlgo: { name: 'Ed25519' },
    signAlgo: { name: 'Ed25519' },
    publicJwkFromKey: (k) => ({ kty: 'OKP', crv: 'Ed25519', x: k.x }),
  },
};

async function generateKeypair(alg) {
  const params = ALG_PARAMS[alg];
  if (!params) throw new Error('unsupported alg: ' + alg);
  const keyPair = await subtle.generateKey(params.keyAlgo, true, ['sign', 'verify']);
  const publicRaw = await subtle.exportKey('jwk', keyPair.publicKey);
  const publicJwk = {
    ...params.publicJwkFromKey(publicRaw),
    alg,
    use: 'sig',
    kid: TEST_KID,
  };
  return { privateKey: keyPair.privateKey, publicJwk };
}

function canonicalJwkForThumbprint(jwk) {
  if (jwk.kty === 'EC') {
    return `{"crv":${JSON.stringify(jwk.crv)},"kty":"EC","x":${JSON.stringify(jwk.x)},"y":${JSON.stringify(jwk.y)}}`;
  }
  if (jwk.kty === 'OKP') {
    return `{"crv":${JSON.stringify(jwk.crv)},"kty":"OKP","x":${JSON.stringify(jwk.x)}}`;
  }
  throw new Error('unsupported kty');
}

async function jwkThumbprintSha384(jwk) {
  const canonical = canonicalJwkForThumbprint(jwk);
  const hash = new Uint8Array(await subtle.digest('SHA-384', Buffer.from(canonical, 'utf8')));
  return b64uEncodeBytes(hash);
}

async function sign(alg, privateKey, headerJson, payloadJson) {
  const params = ALG_PARAMS[alg];
  const headerB64 = b64uEncodeString(headerJson);
  const payloadB64 = b64uEncodeString(payloadJson);
  const signingInput = Buffer.from(`${headerB64}.${payloadB64}`, 'utf8');
  const sigBytes = new Uint8Array(await subtle.sign(params.signAlgo, privateKey, signingInput));
  return `${headerB64}.${payloadB64}.${b64uEncodeBytes(sigBytes)}`;
}

async function buildEntry({ alg, privateKey, publicJwk, payload, headerOverrides = {} }) {
  const header = {
    alg,
    kid: TEST_KID,
    typ: ENTRY_TYP,
    jwk: publicJwk,
    ...headerOverrides,
  };
  return sign(alg, privateKey, JSON.stringify(header), JSON.stringify(payload));
}

function basePayload(thumbprint, overrides = {}) {
  return {
    domain: TEST_DOMAIN,
    kid: TEST_KID,
    jwk_thumbprint: thumbprint,
    doc_url: `https://${TEST_DOMAIN}/.well-known/llmo.json`,
    doc_id: 'example-doc-2026-q2-01',
    observed_at: NOW,
    ...overrides,
  };
}

async function writeVector(name, vector) {
  const path = resolve(VECTOR_DIR, name);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(vector, null, 2) + '\n', 'utf8');
  console.log('wrote', name);
}

async function main() {
  await mkdir(VECTOR_DIR, { recursive: true });

  // POSITIVE VECTORS: one per supported algorithm.
  for (const alg of ['ES256', 'ES384', 'EdDSA']) {
    const { privateKey, publicJwk } = await generateKeypair(alg);
    const thumbprint = await jwkThumbprintSha384(publicJwk);
    const payload = basePayload(thumbprint);
    const jws = await buildEntry({ alg, privateKey, publicJwk, payload });
    await writeVector(`positive-entry-${alg.toLowerCase()}.json`, {
      lip: 'LIP-4 §3.2',
      kind: 'positive',
      description: `Canonically constructed KT entry signed with ${alg}. All 13 validation steps at /spec/v0.1/kt-registry-endpoints/ accept this entry.`,
      expected: 'accepted',
      entry: jws,
    });
  }

  // Shared key for negatives.
  const { privateKey, publicJwk } = await generateKeypair('ES256');
  const thumbprint = await jwkThumbprintSha384(publicJwk);

  // negative: thumbprint_mismatch
  await writeVector('negative-thumbprint-mismatch.json', {
    lip: 'LIP-4 §3.2',
    kind: 'negative',
    error_code: 'thumbprint_mismatch',
    description: 'payload.jwk_thumbprint does not equal SHA-384(JCS(protected.jwk)).',
    expected: 'rejected:thumbprint_mismatch',
    entry: await buildEntry({
      alg: 'ES256', privateKey, publicJwk,
      payload: basePayload('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'),
    }),
  });

  // negative: kid_mismatch
  await writeVector('negative-kid-mismatch.json', {
    lip: 'LIP-4 §3.2',
    kind: 'negative',
    error_code: 'kid_mismatch',
    description: 'protected.kid does not equal payload.kid.',
    expected: 'rejected:kid_mismatch',
    entry: await buildEntry({
      alg: 'ES256', privateKey, publicJwk,
      payload: { ...basePayload(thumbprint), kid: 'different-kid' },
    }),
  });

  // negative: wrong_typ
  await writeVector('negative-wrong-typ.json', {
    lip: 'LIP-4 §3.2',
    kind: 'negative',
    error_code: 'wrong_typ',
    description: "protected.typ is not 'llmo-kt-entry+jws'.",
    expected: 'rejected:wrong_typ',
    entry: await buildEntry({
      alg: 'ES256', privateKey, publicJwk,
      payload: basePayload(thumbprint),
      headerOverrides: { typ: 'wrong+jws' },
    }),
  });

  // negative: jwk_contains_private_material
  // Hand-construct so the private d is in the inline header. The
  // outer JWS signature itself is computed normally (over header +
  // payload); the registry MUST reject before signature verification
  // based on the header inspection alone.
  {
    const exported = await subtle.exportKey('jwk', privateKey);
    const privateInline = {
      kty: 'EC', crv: 'P-256', x: exported.x, y: exported.y, d: exported.d,
      alg: 'ES256', use: 'sig', kid: TEST_KID,
    };
    const headerJson = JSON.stringify({
      alg: 'ES256', kid: TEST_KID, typ: ENTRY_TYP, jwk: privateInline,
    });
    const payloadJson = JSON.stringify(basePayload(thumbprint));
    const jws = await sign('ES256', privateKey, headerJson, payloadJson);
    await writeVector('negative-jwk-contains-private-material.json', {
      lip: 'LIP-4 §3.2',
      kind: 'negative',
      error_code: 'jwk_contains_private_material',
      description: "protected.jwk contains private-key parameter 'd'; registry MUST reject per LIP-4 §3.2.",
      expected: 'rejected:jwk_contains_private_material',
      entry: jws,
    });
  }

  // negative: signature_invalid (tamper last 4 chars)
  {
    const goodJws = await buildEntry({
      alg: 'ES256', privateKey, publicJwk, payload: basePayload(thumbprint),
    });
    const [h, p, s] = goodJws.split('.');
    const tampered = `${h}.${p}.${s.slice(0, -4)}AAAA`;
    await writeVector('negative-signature-invalid.json', {
      lip: 'LIP-4 §3.2',
      kind: 'negative',
      error_code: 'signature_invalid',
      description: 'JWS signature does not verify against protected.jwk (last 4 chars of signature segment tampered).',
      expected: 'rejected:signature_invalid',
      entry: tampered,
    });
  }

  // negative: doc_url_mismatch
  await writeVector('negative-doc-url-mismatch.json', {
    lip: 'LIP-4 §3.2',
    kind: 'negative',
    error_code: 'doc_url_mismatch',
    description: 'payload.doc_url does not match https://<domain>/.well-known/llmo.json.',
    expected: 'rejected:doc_url_mismatch',
    entry: await buildEntry({
      alg: 'ES256', privateKey, publicJwk,
      payload: basePayload(thumbprint, { doc_url: 'https://example.com/elsewhere.json' }),
    }),
  });

  // negative: timestamp_out_of_range
  await writeVector('negative-timestamp-out-of-range.json', {
    lip: 'LIP-4 §3.2',
    kind: 'negative',
    error_code: 'timestamp_out_of_range',
    description: 'payload.observed_at is more than ±5 minutes from the registry clock at receipt time.',
    expected: 'rejected:timestamp_out_of_range',
    entry: await buildEntry({
      alg: 'ES256', privateKey, publicJwk,
      payload: basePayload(thumbprint, { observed_at: '2020-01-01T00:00:00.000Z' }),
    }),
  });

  // negative: missing_payload_field
  {
    const partial = basePayload(thumbprint);
    delete partial.jwk_thumbprint;
    await writeVector('negative-missing-payload-field.json', {
      lip: 'LIP-4 §3.2',
      kind: 'negative',
      error_code: 'missing_payload_field',
      description: 'payload is missing the jwk_thumbprint field.',
      expected: 'rejected:missing_payload_field',
      entry: await buildEntry({
        alg: 'ES256', privateKey, publicJwk, payload: partial,
      }),
    });
  }

  // negative: invalid_domain
  await writeVector('negative-invalid-domain.json', {
    lip: 'LIP-4 §3.2',
    kind: 'negative',
    error_code: 'invalid_domain',
    description: 'payload.domain is not a valid public hostname.',
    expected: 'rejected:invalid_domain',
    entry: await buildEntry({
      alg: 'ES256', privateKey, publicJwk,
      payload: basePayload(thumbprint, { domain: 'not a real domain' }),
    }),
  });

  // negative: unsupported_alg (RS256 in protected header; registry
  // MUST reject before signature verification on the alg allowlist).
  {
    const headerB64 = b64uEncodeString(JSON.stringify({
      alg: 'RS256', kid: TEST_KID, typ: ENTRY_TYP, jwk: publicJwk,
    }));
    const payloadB64 = b64uEncodeString(JSON.stringify(basePayload(thumbprint)));
    const sigB64 = b64uEncodeString('invalid');
    await writeVector('negative-unsupported-alg.json', {
      lip: 'LIP-4 §3.2',
      kind: 'negative',
      error_code: 'unsupported_alg',
      description: 'protected.alg is RS256, not in the permitted set (ES256, ES384, EdDSA).',
      expected: 'rejected:unsupported_alg',
      entry: `${headerB64}.${payloadB64}.${sigB64}`,
    });
  }

  // INDEX file
  await writeVector('index.json', {
    lip: 'LIP-4',
    generated: '2026-05-12',
    vectors: [
      'positive-entry-es256.json',
      'positive-entry-es384.json',
      'positive-entry-eddsa.json',
      'negative-thumbprint-mismatch.json',
      'negative-kid-mismatch.json',
      'negative-wrong-typ.json',
      'negative-jwk-contains-private-material.json',
      'negative-signature-invalid.json',
      'negative-doc-url-mismatch.json',
      'negative-timestamp-out-of-range.json',
      'negative-missing-payload-field.json',
      'negative-invalid-domain.json',
      'negative-unsupported-alg.json',
    ],
  });

  console.log('done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
