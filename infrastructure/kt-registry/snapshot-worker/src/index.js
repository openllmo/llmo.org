// LLMO KT registry: snapshot Worker (scheduled).
// Runs every 24 hours at 02:00 UTC (configured in wrangler.toml).
//
// Responsibilities (per ADR-0010 §3):
//   1. Fetch the current canonical log from
//      https://llmo.org/kt/v1/log.jsonl (which is served from the
//      Hugo build's static/kt/v1/log.jsonl). Note: the canonical
//      log is updated by a separate D1-to-git flush; this Worker
//      reads from the deployed log.
//   2. Compute log_hash = base64url(SHA-384(bytes)).
//   3. Build the snapshot payload referencing the previous snapshot's
//      id and log_hash for chained integrity.
//   4. Sign with the registry's ES384 key (from Workers Secrets).
//   5. Write the new snapshot to KV under snapshot:latest and
//      snapshot:<snapshot_id>.
//
// Bindings (set via wrangler.toml + secrets):
//   - env.KT_KV               KV namespace (shared with Pages Functions)
//   - env.KT_SIGNING_KEY_JWK  Workers Secret with private signing JWK
//   - env.KT_SIGNING_KID      Workers Secret with registry kid
//   - env.LOG_URL             public URL for the canonical log

const SNAPSHOT_TYP = 'llmo-kt-snapshot+jws';
const MAX_LOG_BYTES = 100 * 1024 * 1024; // 100 MB hard cap

function base64urlEncode(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function bytesFromString(s) {
  return new TextEncoder().encode(s);
}

async function sha384(bytes) {
  return new Uint8Array(await crypto.subtle.digest('SHA-384', bytes));
}

async function signSnapshot(env, snapshotId, logSize, logHash, snapshotAt, previousId, previousHash) {
  const kid = env.KT_SIGNING_KID;
  const privateJwkStr = env.KT_SIGNING_KEY_JWK;
  if (!kid || !privateJwkStr) throw new Error('registry_signing_key_not_configured');
  const privateJwk = JSON.parse(privateJwkStr);

  const header = {
    alg: 'ES384',
    kid,
    typ: SNAPSHOT_TYP,
  };
  const payload = {
    snapshot_id: snapshotId,
    log_size: logSize,
    log_hash: logHash,
    snapshot_at: snapshotAt,
    previous_snapshot_id: previousId,
    previous_log_hash: previousHash,
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

async function fetchLog(env) {
  const url = env.LOG_URL || 'https://llmo.org/kt/v1/log.jsonl';
  const response = await fetch(url, {
    cf: { cacheTtl: 0, cacheEverything: false },
  });
  if (!response.ok) throw new Error(`fetch_log_failed: status ${response.status}`);
  const text = await response.text();
  if (text.length > MAX_LOG_BYTES) throw new Error(`log_too_large: ${text.length} bytes exceeds ${MAX_LOG_BYTES}`);
  return text;
}

function countEntries(logText) {
  if (logText.trim().length === 0) return 0;
  return logText.split('\n').filter(line => line.trim().length > 0).length;
}

async function decodePreviousSnapshot(env) {
  const previous = await env.KT_KV.get('snapshot:latest');
  if (!previous) return { id: null, hash: null };
  const segments = previous.split('.');
  if (segments.length !== 3) return { id: null, hash: null };
  try {
    const payloadJson = atob(segments[1].replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadJson);
    return {
      id: payload.snapshot_id || null,
      hash: payload.log_hash || null,
    };
  } catch {
    return { id: null, hash: null };
  }
}

async function runSnapshot(env) {
  const snapshotAt = new Date().toISOString();
  const logText = await fetchLog(env);
  const logBytes = bytesFromString(logText);
  const logHash = base64urlEncode(await sha384(logBytes));
  const logSize = countEntries(logText);

  const previous = await decodePreviousSnapshot(env);
  const snapshotId = (previous.id || 0) + 1;

  const snapshotJws = await signSnapshot(
    env,
    snapshotId,
    logSize,
    logHash,
    snapshotAt,
    previous.id,
    previous.hash
  );

  await env.KT_KV.put(`snapshot:${snapshotId}`, snapshotJws);
  await env.KT_KV.put('snapshot:latest', snapshotJws);

  return { snapshotId, logSize, logHash, snapshotAt };
}

export default {
  // Cron handler. Scheduled by wrangler.toml.
  async scheduled(event, env, ctx) {
    ctx.waitUntil((async () => {
      try {
        const result = await runSnapshot(env);
        console.log('snapshot ok', JSON.stringify(result));
      } catch (e) {
        console.error('snapshot failed', e && e.message ? e.message : String(e));
      }
    })());
  },

  // Manual trigger via HTTP (useful for testing or operator-initiated
  // re-snapshot). Returns the new snapshot's metadata.
  async fetch(request, env, ctx) {
    if (request.method !== 'POST') {
      return new Response('Use POST to trigger a snapshot manually.', { status: 405 });
    }
    // Bearer token check: the operator may guard manual snapshots
    // behind a Workers Secret to prevent random POSTs from triggering
    // snapshots. If no token is configured, manual trigger is
    // disabled.
    const expectedToken = env.MANUAL_SNAPSHOT_TOKEN;
    if (!expectedToken) {
      return new Response('Manual snapshot trigger not configured.', { status: 503 });
    }
    const auth = request.headers.get('authorization') || '';
    if (!auth.startsWith('Bearer ') || auth.slice(7) !== expectedToken) {
      return new Response('Unauthorized.', { status: 401 });
    }
    try {
      const result = await runSnapshot(env);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: 'snapshot_failed', detail: e.message }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      });
    }
  },
};
