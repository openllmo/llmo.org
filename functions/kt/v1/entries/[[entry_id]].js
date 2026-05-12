// Cloudflare Pages Function: GET /kt/v1/entries/{entry_id}
// Returns a single entry by its log index.

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
  const raw = params.entry_id;
  const entryIdStr = Array.isArray(raw) ? raw[0] : raw;
  const entryId = parseInt(entryIdStr, 10);
  if (isNaN(entryId) || entryId < 1) return err(400, 'invalid_entry_id', 'entry_id must be a positive integer.');

  const row = await env.KT_DB.prepare(
    `SELECT entry_id, log_position, entry_jws, appended_at
     FROM entries WHERE entry_id = ?`
  ).bind(entryId).first();

  if (!row) return err(404, 'not_found', `entry_id ${entryId} does not exist.`);

  return new Response(JSON.stringify({
    entry_id: row.entry_id,
    log_position: row.log_position,
    entry: row.entry_jws,
    appended_at: row.appended_at,
  }), {
    status: 200,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
      'cache-control': 'max-age=3600',
    },
  });
};
