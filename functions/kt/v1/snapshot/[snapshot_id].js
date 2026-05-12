// Cloudflare Pages Function: GET /kt/v1/snapshot/{snapshot_id}
// Returns a historical snapshot by ID as a compact JWS.

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

export const onRequestGet = async ({ params, env }) => {
  // With single-segment dynamic routing ([snapshot_id]) Cloudflare
  // Pages prefers literal-segment files over dynamic ones, so
  // /kt/v1/snapshot/latest routes to snapshot/latest.js, not here.
  // This handler only sees integer IDs.
  const snapshotIdStr = params.snapshot_id;
  const snapshotId = parseInt(snapshotIdStr, 10);
  if (isNaN(snapshotId) || snapshotId < 1) return err(400, 'invalid_snapshot_id', 'snapshot_id must be a positive integer.');

  const snapshot = await env.KT_KV.get(`snapshot:${snapshotId}`);
  if (!snapshot) return err(404, 'not_found', `snapshot_id ${snapshotId} does not exist.`);

  return new Response(snapshot, {
    status: 200,
    headers: {
      'content-type': 'application/jose+json',
      'access-control-allow-origin': '*',
      'cache-control': 'public, max-age=31536000, immutable',
    },
  });
};
