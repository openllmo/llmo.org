// Cloudflare Pages Function: LLMO Key Transparency entries endpoint.
// Implements POST /kt/v1/entries (submit a new entry) and
// GET /kt/v1/entries?domain=<d>&limit=<n> (query entries by domain),
// per LIP-4 §3.3 and the implementer spec at
// /spec/v0.1/kt-registry-endpoints/.
//
// Bindings (set in Cloudflare Pages dashboard, see
// infrastructure/kt-registry/README.md for provisioning):
//   - env.KT_DB              D1 database
//   - env.KT_SIGNING_KEY_JWK Workers Secret containing the registry's
//                            private signing JWK in JSON
//   - env.KT_SIGNING_KID     Workers Secret containing the registry's
//                            current kid string

const MAX_BODY_BYTES = 8192;
const ALLOWED_ALGS = new Set(['ES256', 'ES384', 'EdDSA']);
const ENTRY_TYP = 'llmo-kt-entry+jws';
const RECEIPT_TYP = 'llmo-kt-receipt+jws';
const TIMESTAMP_TOLERANCE_SECONDS = 300;
const RATE_LIMIT_PER_HOUR = 100;
const HOSTNAME_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;

function err(status, code, detail) {
  return new Response(JSON.stringify({ error: code, detail }), {
    status,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
      'cache-control': 'no-store',
    },
  });
}

function ok(status, body, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
      ...extraHeaders,
    },
  });
}

function base64urlDecode(s) {
  const pad = s.length % 4 === 2 ? '==' : s.length % 4 === 3 ? '=' : '';
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + pad;
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function base64urlEncode(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function bytesFromString(s) {
  return new TextEncoder().encode(s);
}

function jsonFromBytes(bytes) {
  return JSON.parse(new TextDecoder().decode(bytes));
}

// Canonical-ish JSON for JWK Thumbprint per RFC 7638 §3. For EC keys
// the required members are crv, kty, x, y (sorted). For OKP (Ed25519)
// they are crv, kty, x. We construct the canonical string by hand
// from the JWK's required members in alphabetical order; this is
// equivalent to RFC 8785 JCS for the constrained JWK shape.
function canonicalJwkForThumbprint(jwk) {
  if (!jwk || typeof jwk !== 'object') {
    throw new Error('jwk_not_object');
  }
  const kty = jwk.kty;
  if (typeof kty !== 'string') throw new Error('jwk_missing_kty');
  if (kty === 'EC') {
    const required = ['crv', 'kty', 'x', 'y'];
    for (const k of required) {
      if (typeof jwk[k] !== 'string') throw new Error(`jwk_missing_${k}`);
    }
    return `{"crv":${JSON.stringify(jwk.crv)},"kty":"EC","x":${JSON.stringify(jwk.x)},"y":${JSON.stringify(jwk.y)}}`;
  }
  if (kty === 'OKP') {
    const required = ['crv', 'kty', 'x'];
    for (const k of required) {
      if (typeof jwk[k] !== 'string') throw new Error(`jwk_missing_${k}`);
    }
    return `{"crv":${JSON.stringify(jwk.crv)},"kty":"OKP","x":${JSON.stringify(jwk.x)}}`;
  }
  throw new Error('jwk_unsupported_kty');
}

async function sha384(bytes) {
  return new Uint8Array(await crypto.subtle.digest('SHA-384', bytes));
}

async function jwkThumbprint(jwk) {
  const canonical = canonicalJwkForThumbprint(jwk);
  const hash = await sha384(bytesFromString(canonical));
  return base64urlEncode(hash);
}

function jwkContainsPrivateMaterial(jwk) {
  // EC private parameter: d. OKP private parameter: d. RSA: d, p, q,
  // dp, dq, qi. Reject any of these.
  const privateKeys = ['d', 'p', 'q', 'dp', 'dq', 'qi'];
  for (const k of privateKeys) {
    if (jwk[k] !== undefined) return true;
  }
  return false;
}

function algToWebCryptoParams(alg, kty, crv) {
  if (alg === 'ES256' && kty === 'EC' && crv === 'P-256') {
    return {
      importParams: { name: 'ECDSA', namedCurve: 'P-256' },
      verifyParams: { name: 'ECDSA', hash: 'SHA-256' },
    };
  }
  if (alg === 'ES384' && kty === 'EC' && crv === 'P-384') {
    return {
      importParams: { name: 'ECDSA', namedCurve: 'P-384' },
      verifyParams: { name: 'ECDSA', hash: 'SHA-384' },
    };
  }
  if (alg === 'EdDSA' && kty === 'OKP' && crv === 'Ed25519') {
    return {
      importParams: { name: 'Ed25519' },
      verifyParams: { name: 'Ed25519' },
    };
  }
  return null;
}

async function verifyJws(compactJws, publicJwk) {
  const segments = compactJws.split('.');
  if (segments.length !== 3) throw new Error('malformed_jws');
  const [protectedB64, payloadB64, sigB64] = segments;
  const protectedBytes = base64urlDecode(protectedB64);
  const protectedHeader = jsonFromBytes(protectedBytes);
  const params = algToWebCryptoParams(protectedHeader.alg, publicJwk.kty, publicJwk.crv);
  if (!params) throw new Error('unsupported_alg_curve_combo');
  const key = await crypto.subtle.importKey(
    'jwk',
    publicJwk,
    params.importParams,
    false,
    ['verify']
  );
  const signingInput = bytesFromString(`${protectedB64}.${payloadB64}`);
  const signatureBytes = base64urlDecode(sigB64);
  const verified = await crypto.subtle.verify(
    params.verifyParams,
    key,
    signatureBytes,
    signingInput
  );
  return { verified, protectedHeader, payloadB64 };
}

function isValidDomain(domain) {
  if (typeof domain !== 'string') return false;
  if (domain.length === 0 || domain.length > 253) return false;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(domain)) return false;
  if (domain.includes(':')) return false;
  if (!HOSTNAME_RE.test(domain)) return false;
  return true;
}

function isValidRfc3339Timestamp(s) {
  if (typeof s !== 'string') return false;
  const d = new Date(s);
  if (isNaN(d.getTime())) return false;
  // Basic shape check: must contain T and either Z or offset.
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+\-]\d{2}:\d{2})$/.test(s)) return false;
  return true;
}

async function checkAndIncrementRateLimit(env, sourceIp) {
  const windowStart = new Date();
  windowStart.setMinutes(0, 0, 0);
  const windowStartIso = windowStart.toISOString();

  const row = await env.KT_DB.prepare(
    'SELECT count FROM rate_limits WHERE source_ip = ? AND window_start = ?'
  ).bind(sourceIp, windowStartIso).first();

  const current = row ? row.count : 0;
  if (current >= RATE_LIMIT_PER_HOUR) return false;

  await env.KT_DB.prepare(
    'INSERT INTO rate_limits (source_ip, window_start, count) VALUES (?, ?, 1) ' +
    'ON CONFLICT(source_ip, window_start) DO UPDATE SET count = count + 1'
  ).bind(sourceIp, windowStartIso).run();

  return true;
}

async function signReceipt(env, entryId, logPosition, appendedAt, entryJwsHash) {
  const kid = env.KT_SIGNING_KID;
  const privateJwkStr = env.KT_SIGNING_KEY_JWK;
  if (!kid || !privateJwkStr) throw new Error('registry_signing_key_not_configured');
  const privateJwk = JSON.parse(privateJwkStr);

  const header = {
    alg: 'ES384',
    kid,
    typ: RECEIPT_TYP,
  };
  const payload = {
    entry_id: entryId,
    log_position: logPosition,
    appended_at: appendedAt,
    entry_jws_hash: entryJwsHash,
  };
  const headerB64 = base64urlEncode(bytesFromString(JSON.stringify(header)));
  const payloadB64 = base64urlEncode(bytesFromString(JSON.stringify(payload)));
  const signingInput = bytesFromString(`${headerB64}.${payloadB64}`);

  const signingKey = await crypto.subtle.importKey(
    'jwk',
    privateJwk,
    { name: 'ECDSA', namedCurve: 'P-384' },
    false,
    ['sign']
  );
  const sigBytes = new Uint8Array(
    await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-384' }, signingKey, signingInput)
  );
  const sigB64 = base64urlEncode(sigBytes);

  return `${headerB64}.${payloadB64}.${sigB64}`;
}

export const onRequestPost = async ({ request, env }) => {
  // Step 1: read and bound the body.
  const contentLength = parseInt(request.headers.get('content-length') || '0', 10);
  if (contentLength > MAX_BODY_BYTES) return err(413, 'body_too_large', `Body exceeds ${MAX_BODY_BYTES} bytes.`);

  let bodyText;
  try {
    bodyText = await request.text();
  } catch {
    return err(400, 'body_unreadable', 'Could not read request body.');
  }
  if (bodyText.length > MAX_BODY_BYTES) return err(413, 'body_too_large', `Body exceeds ${MAX_BODY_BYTES} bytes.`);

  const compactJws = bodyText.trim();

  // Step 2: structural shape.
  const segments = compactJws.split('.');
  if (segments.length !== 3) return err(400, 'malformed_jws', 'Compact JWS must have three segments.');

  // Step 3: parse protected header.
  let protectedHeader;
  try {
    protectedHeader = jsonFromBytes(base64urlDecode(segments[0]));
  } catch {
    return err(400, 'malformed_jws', 'Could not decode protected header.');
  }
  for (const k of ['alg', 'kid', 'typ', 'jwk']) {
    if (protectedHeader[k] === undefined) return err(400, 'missing_protected_field', `Protected header missing '${k}'.`);
  }

  // Step 4: alg.
  if (!ALLOWED_ALGS.has(protectedHeader.alg)) return err(400, 'unsupported_alg', `alg must be one of ${[...ALLOWED_ALGS].join(', ')}.`);

  // Step 5: typ.
  if (protectedHeader.typ !== ENTRY_TYP) return err(400, 'wrong_typ', `typ must be '${ENTRY_TYP}'.`);

  // Step 6: jwk public-only.
  if (jwkContainsPrivateMaterial(protectedHeader.jwk)) return err(400, 'jwk_contains_private_material', 'JWK in protected header contains private-key parameters; only public-key material is permitted.');

  // Step 7: payload.
  let payload;
  try {
    payload = jsonFromBytes(base64urlDecode(segments[1]));
  } catch {
    return err(400, 'malformed_jws', 'Could not decode payload.');
  }
  for (const k of ['domain', 'kid', 'jwk_thumbprint', 'doc_url', 'doc_id', 'observed_at']) {
    if (payload[k] === undefined) return err(400, 'missing_payload_field', `Payload missing '${k}'.`);
  }

  // Step 8: kid match.
  if (payload.kid !== protectedHeader.kid) return err(400, 'kid_mismatch', 'protected.kid must equal payload.kid.');

  // Step 9: thumbprint match.
  let computedThumbprint;
  try {
    computedThumbprint = await jwkThumbprint(protectedHeader.jwk);
  } catch (e) {
    return err(400, 'thumbprint_compute_failed', `Could not compute JWK thumbprint: ${e.message}`);
  }
  if (computedThumbprint !== payload.jwk_thumbprint) return err(400, 'thumbprint_mismatch', 'payload.jwk_thumbprint does not match SHA-384(JCS(protected.jwk)).');

  // Step 10: signature verifies.
  let verifyResult;
  try {
    verifyResult = await verifyJws(compactJws, protectedHeader.jwk);
  } catch (e) {
    return err(400, 'signature_invalid', `Signature verification raised: ${e.message}`);
  }
  if (!verifyResult.verified) return err(400, 'signature_invalid', 'Signature did not verify against the inline JWK.');

  // Step 11: domain.
  const domain = typeof payload.domain === 'string' ? payload.domain.toLowerCase().trim() : '';
  if (!isValidDomain(domain)) return err(400, 'invalid_domain', 'payload.domain is not a valid public hostname.');

  // Step 12: timestamp.
  if (!isValidRfc3339Timestamp(payload.observed_at)) return err(400, 'timestamp_out_of_range', 'payload.observed_at is not a valid RFC 3339 timestamp.');
  const observedMs = new Date(payload.observed_at).getTime();
  const nowMs = Date.now();
  if (Math.abs(observedMs - nowMs) > TIMESTAMP_TOLERANCE_SECONDS * 1000) {
    return err(400, 'timestamp_out_of_range', `payload.observed_at is outside ±${TIMESTAMP_TOLERANCE_SECONDS} seconds of registry time.`);
  }

  // Step 13: doc_url shape.
  const expectedDocUrl = `https://${domain}/.well-known/llmo.json`;
  if (payload.doc_url !== expectedDocUrl) return err(400, 'doc_url_mismatch', `payload.doc_url must equal '${expectedDocUrl}'.`);

  // Step 14: rate limit.
  const sourceIp = request.headers.get('cf-connecting-ip') || 'unknown';
  const rateOk = await checkAndIncrementRateLimit(env, sourceIp);
  if (!rateOk) return err(429, 'rate_limited', `Source IP exceeded ${RATE_LIMIT_PER_HOUR} entries per hour.`);

  // Step 15: append.
  const appendedAt = new Date().toISOString();
  const insertResult = await env.KT_DB.prepare(
    `INSERT INTO entries (
       log_position, domain, kid, jwk_thumbprint, doc_url, doc_id,
       observed_at, appended_at, entry_jws, source_ip
     ) VALUES (
       (SELECT COALESCE(MAX(log_position), 0) + 1 FROM entries),
       ?, ?, ?, ?, ?, ?, ?, ?, ?
     ) RETURNING entry_id, log_position`
  ).bind(
    domain,
    payload.kid,
    payload.jwk_thumbprint,
    payload.doc_url,
    payload.doc_id,
    payload.observed_at,
    appendedAt,
    compactJws,
    sourceIp
  ).first();

  if (!insertResult) return err(500, 'insert_failed', 'Registry could not append the entry.');

  const entryJwsHashBytes = await sha384(bytesFromString(compactJws));
  const entryJwsHash = base64urlEncode(entryJwsHashBytes);

  let receipt;
  try {
    receipt = await signReceipt(env, insertResult.entry_id, insertResult.log_position, appendedAt, entryJwsHash);
  } catch (e) {
    return err(500, 'receipt_sign_failed', `Could not sign receipt: ${e.message}`);
  }

  return ok(201, {
    entry_id: insertResult.entry_id,
    log_position: insertResult.log_position,
    appended_at: appendedAt,
    receipt,
  }, {
    'location': `/kt/v1/entries/${insertResult.entry_id}`,
  });
};

export const onRequestGet = async ({ request, env }) => {
  const url = new URL(request.url);
  const rawDomain = url.searchParams.get('domain');
  if (!rawDomain) return err(400, 'missing_domain', 'Query parameter "domain" is required.');

  const domain = rawDomain.toLowerCase().trim();
  if (!isValidDomain(domain)) return err(400, 'invalid_domain', 'Query parameter "domain" is not a valid public hostname.');

  let limit = parseInt(url.searchParams.get('limit') || '10', 10);
  if (isNaN(limit) || limit < 1) limit = 10;
  if (limit > 100) limit = 100;

  const rows = await env.KT_DB.prepare(
    `SELECT entry_id, log_position, entry_jws, appended_at
     FROM entries
     WHERE domain = ?
     ORDER BY log_position DESC
     LIMIT ?`
  ).bind(domain, limit).all();

  const totalRow = await env.KT_DB.prepare(
    'SELECT COUNT(*) AS total FROM entries WHERE domain = ?'
  ).bind(domain).first();

  return ok(200, {
    domain,
    entries: (rows.results || []).map(r => ({
      entry_id: r.entry_id,
      log_position: r.log_position,
      entry: r.entry_jws,
      appended_at: r.appended_at,
    })),
    total: totalRow ? totalRow.total : 0,
  }, {
    'cache-control': 'max-age=60',
  });
};

export const onRequestOptions = async () => new Response(null, {
  status: 204,
  headers: {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
  },
});
