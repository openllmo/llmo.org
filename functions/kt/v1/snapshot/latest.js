// Cloudflare Pages Function: GET /kt/v1/snapshot/latest
// Returns the most recent signed snapshot of the log as a compact JWS.

export const onRequestGet = async ({ env }) => {
  const snapshot = await env.KT_KV.get('snapshot:latest');
  if (!snapshot) {
    return new Response(JSON.stringify({
      error: 'no_snapshot',
      detail: 'Registry has not produced a snapshot yet.',
    }), {
      status: 404,
      headers: {
        'content-type': 'application/json',
        'access-control-allow-origin': '*',
        'cache-control': 'no-store',
      },
    });
  }
  return new Response(snapshot, {
    status: 200,
    headers: {
      'content-type': 'application/jose+json',
      'access-control-allow-origin': '*',
      'cache-control': 'max-age=300',
    },
  });
};
